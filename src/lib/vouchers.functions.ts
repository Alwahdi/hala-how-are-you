import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { packageFacts } from "./packages";
import { generateNames, issuanceSchema } from "./vouchers";
export const issueVouchers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => issuanceSchema.parse(v))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: prior, error: priorError } = await context.supabase
      .from("voucher_batches").select("id").eq("request_key", data.requestKey)
      .eq("owner_id", context.userId).maybeSingle();
    if (priorError) throw Error("read_failed");
    if (prior) return { id: prior.id };
    const testRouters=(process.env["VOUCHER_ISSUANCE_TEST_ROUTERS"]??'').split(',');
    if (process.env["VOUCHER_ISSUANCE_VERIFIED"] !== "true" && !testRouters.includes(data.routerId)) throw Error("issuer_testing_required");
    const { data: router, error } = await context.supabase
      .from("routers")
      .select("id,last_status,last_seen_at")
      .eq("id", data.routerId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error || !router) throw Error("not_allowed");
    const status = router.last_status as Record<string, unknown> | null;
    if (
      status?.["voucherProtocol"] !== 2 ||
      !router.last_seen_at ||
      Date.now() - Date.parse(router.last_seen_at) > 90000
    )
      throw Error("issuer_not_ready");
    const { data: profile, error: pe } = await context.supabase
      .from("router_profiles")
      .select("*")
      .eq("router_id", data.routerId)
      .eq("source", data.source)
      .eq("name", data.packageName)
      .maybeSingle();
    if (pe || !profile) throw Error("package_missing");
    const snapshot = {
      ...profile,
      issue_limits: data.source === "hotspot" ? data.hotspotLimits : null,
    };
    const secret = process.env["VOUCHER_ARCHIVE_KEY"];
    if (!secret) throw Error("archive_unavailable");
    const { seal } = await import("./voucher-crypto.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const names = generateNames(data);
    const {data: conflicts,error: conflictError} = await context.supabase.from("router_cards")
      .select("name").eq("router_id",data.routerId).eq("source",data.source).in("name",names);
    if(conflictError) throw Error("read_failed");
    if(conflicts?.length) throw Error("number_exists");
    const items = await Promise.all(
      names.map(async (name, ordinal) => {
        const id = crypto.randomUUID();
        const password =
          data.mode === "same"
            ? name
            : data.mode === "empty"
              ? ""
              : (generateNames({
                  ...data,
                  count: 1,
                  length: 12,
                  prefix: "",
                  suffix: "",
                  charset: "mixed",
                })[0] ?? "");
        return { id, name, ordinal, ciphertext: await seal(password, secret, id) };
      }),
    );
    const { data: bid, error: e } = await supabaseAdmin.rpc("create_voucher_batch", {
      b: {
        owner_id: context.userId,
        router_id: data.routerId,
        source: data.source,
        package_name: data.packageName,
        package_snapshot: snapshot,
        label: data.label,
        requested: data.count,
        mode: data.mode,
        request_key: data.requestKey,
      },
      items,
    });
    if (e) throw Error(e.code === "23505" ? "number_exists" : "issuance_failed");
    return { id: bid };
  });
export const voucherReadiness = createServerFn({method:"GET"})
  .middleware([requireSupabaseAuth]).handler(async()=> {
    setResponseHeader("Cache-Control","no-store");
    return {verified:process.env["VOUCHER_ISSUANCE_VERIFIED"] === "true",testRouters:(process.env["VOUCHER_ISSUANCE_TEST_ROUTERS"]??'').split(',').filter(Boolean)};
  });
const batchSchema = z.object({ batchId: z.string().uuid() });
export const printableVouchers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => batchSchema.parse(v))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: batch } = await context.supabase
      .from("voucher_batches")
      .select("*")
      .eq("id", data.batchId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!batch) throw Error("not_allowed");
    const { data: items, error } = await context.supabase
      .from("voucher_items")
      .select("id,name,secret_valid")
      .eq("batch_id", batch.id)
      .eq("state", "confirmed")
      .order("ordinal");
    if (error) throw Error("read_failed");
    if (items?.some((i) => !i.secret_valid)) throw Error("credentials_changed");
    const secret = process.env["VOUCHER_ARCHIVE_KEY"];
    if (!secret) throw Error("archive_unavailable");
    const { unseal } = await import("./voucher-crypto.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: secrets, error: e } = await supabaseAdmin
      .from("voucher_secrets")
      .select("*")
      .in(
        "item_id",
        (items ?? []).map((i) => i.id),
      );
    if (e || secrets?.length !== items?.length) throw Error("archive_missing");
    return {
      batch,
      cards: await Promise.all(
        (items ?? []).map(async (i) => {
          const row = secrets?.find((s) => s.item_id === i.id);
          if (!row) throw Error("archive_missing");
          return { name: i.name, password: await unseal(row.ciphertext, secret, i.id) };
        }),
      ),
    };
  });
export const controlVoucherBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    batchSchema.extend({ action: z.enum(["pause", "resume", "retry", "purge"]) }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { data: b } = await context.supabase
      .from("voucher_batches")
      .select("id")
      .eq("id", data.batchId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!b) throw Error("not_allowed");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.action === "purge") {
      const { error } = await supabaseAdmin.rpc("purge_voucher_secrets", { bid: b.id });
      if (error) throw Error("purge_failed");
    } else if (data.action === "retry") {
      const { error } = await supabaseAdmin.rpc("retry_voucher_batch", { bid: b.id });
      if (error) throw Error("retry_failed");
    } else {
      const { error } = await supabaseAdmin
        .from("voucher_batches")
        .update({ state: data.action === "pause" ? "paused" : "pending" })
        .eq("id", b.id);
      if (error) throw Error("write_failed");
    }
    return { ok: true };
  });
