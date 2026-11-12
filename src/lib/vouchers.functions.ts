import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateNames, issuanceSchema, passwordInput, issuanceHold, VOUCHER_CHUNK } from "./vouchers";

const batchSchema = z.object({ batchId: z.string().uuid() });
export const issueVouchers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => issuanceSchema.parse(v))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: prior, error: priorError } = await context.supabase.from("voucher_batches").select("id").eq("request_key", data.requestKey).eq("owner_id", context.userId).maybeSingle();
    if (priorError) throw Error("read_failed");
    if (prior) return { id: prior.id };
    const allowed = (process.env["VOUCHER_ISSUANCE_TEST_ROUTERS"] ?? "").split(",");
    if (process.env["VOUCHER_ISSUANCE_VERIFIED"] !== "true" && !allowed.includes(data.routerId)) throw Error("issuer_testing_required");
    const { data: router, error } = await context.supabase.from("routers").select("id,last_status,last_seen_at").eq("id", data.routerId).eq("owner_id", context.userId).maybeSingle();
    if (error || !router) throw Error("not_allowed");
    const hold = issuanceHold(router.last_status as Record<string, unknown> | null, router.last_seen_at);
    if (hold) throw Error("issuer_" + hold);
    const { data: profile, error: pe } = await context.supabase.from("router_profiles").select("*").eq("router_id", data.routerId).eq("source", data.source).eq("name", data.packageName).maybeSingle();
    if (pe || !profile) throw Error("package_missing");
    if (!process.env["VOUCHER_ARCHIVE_KEY"]) throw Error("archive_unavailable");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: id, error: e } = await supabaseAdmin.rpc("begin_voucher_batch", { b: {
      owner_id: context.userId, router_id: data.routerId, source: data.source, package_name: data.packageName,
      package_snapshot: { ...profile, issue_limits: data.source === "hotspot" ? data.hotspotLimits : null },
      label: data.label, requested: data.count, mode: data.mode, request_key: data.requestKey, issue_config: JSON.parse(JSON.stringify(data)),
    } });
    if (e || !id) throw Error("issuance_failed");
    return { id };
  });

export const prepareVoucherChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((v: unknown) => batchSchema.parse(v))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: batch, error } = await context.supabase.from("voucher_batches").select("*").eq("id", data.batchId).eq("owner_id", context.userId).maybeSingle();
    if (error || !batch) throw Error("not_allowed");
    const { count, error: ce } = await context.supabase.from("voucher_items").select("id", { head: true, count: "exact" }).eq("batch_id", batch.id);
    if (ce || count === null) throw Error("read_failed");
    if (batch.state !== "preparing") return { prepared: count, total: batch.requested, done: true };
    const config = issuanceSchema.parse(batch.issue_config);
    const secret = process.env["VOUCHER_ARCHIVE_KEY"];
    if (!secret) throw Error("archive_unavailable");
    const { seal } = await import("./voucher-crypto.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const size = Math.min(VOUCHER_CHUNK, batch.requested - count);
    // All writes are atomic per chunk. A concurrent caller or lost response reads the committed cursor.
    for (let attempt = 0; attempt < 5; attempt++) {
      const names = generateNames({ ...config, count: size });
      const items = [];
      for (let ordinal = 0; ordinal < names.length; ordinal++) {
        const name = names[ordinal];
        if (!name) throw Error("generation_failed");
        const id = crypto.randomUUID();
        const password = batch.mode === "same" ? name : batch.mode === "empty" ? "" : generateNames(passwordInput(config))[0];
        if (password === undefined) throw Error("generation_failed");
        items.push({ id, name, ordinal: count + ordinal, ciphertext: await seal(password, secret, id) });
      }
      const { data: n, error: e } = await supabaseAdmin.rpc("append_voucher_chunk", { bid: batch.id, uid: context.userId, start_at: count, items });
      if (!e && n !== null) return { prepared: n, total: batch.requested, done: n === batch.requested };
      if (e?.code !== "23505" || config.manualName) throw Error(e?.code === "23505" ? "number_exists" : "preparation_failed");
    }
    throw Error("space_small");
  });

export const voucherReadiness = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  return { verified: process.env["VOUCHER_ISSUANCE_VERIFIED"] === "true", testRouters: (process.env["VOUCHER_ISSUANCE_TEST_ROUTERS"] ?? "").split(",").filter(Boolean) };
});

export const printableVouchers = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => batchSchema.extend({ offset: z.number().int().min(0).max(1500).default(0) }).parse(v))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: batch } = await context.supabase.from("voucher_batches").select("*").eq("id", data.batchId).eq("owner_id", context.userId).maybeSingle();
    if (!batch) throw Error("not_allowed");
    const { count: invalid, error: ie } = await context.supabase.from("voucher_items").select("id", { count: "exact", head: true }).eq("batch_id", batch.id).eq("state", "confirmed").eq("secret_valid", false);
    if (ie) throw Error("read_failed");
    if (invalid) throw Error("credentials_changed");
    const { data: items, error, count } = await context.supabase.from("voucher_items").select("id,name", { count: "exact" }).eq("batch_id", batch.id).eq("state", "confirmed").order("ordinal").range(data.offset, data.offset + VOUCHER_CHUNK - 1);
    if (error || count === null) throw Error("read_failed");
    const secret = process.env["VOUCHER_ARCHIVE_KEY"];
    if (!secret) throw Error("archive_unavailable");
    const { unseal } = await import("./voucher-crypto.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cards = [];
    if (items?.length) {
      const { data: secrets, error: e } = await supabaseAdmin.from("voucher_secrets").select("item_id,ciphertext").in("item_id", items.map(i => i.id));
      if (e || secrets?.length !== items.length) throw Error("archive_missing");
      const archive = new Map(secrets.map(s => [s.item_id, s.ciphertext]));
      for (const i of items) {
        const ciphertext = archive.get(i.id);
        if (!ciphertext) throw Error("archive_missing");
        cards.push({ name: i.name, password: await unseal(ciphertext, secret, i.id) });
      }
    }
    return { batch, cards, total: count };
  });

export const controlVoucherBatch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => batchSchema.extend({ action: z.enum(["pause", "resume", "retry", "purge"]) }).parse(v))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: b } = await context.supabase.from("voucher_batches").select("id,state").eq("id", data.batchId).eq("owner_id", context.userId).maybeSingle();
    if (!b) throw Error("not_allowed");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.action === "purge" || data.action === "retry") {
      const { error } = await supabaseAdmin.rpc(data.action === "purge" ? "purge_voucher_secrets" : "retry_voucher_batch", { bid: b.id });
      if (error) throw Error("write_failed");
    } else {
      if (!["pending", "paused"].includes(b.state)) throw Error("invalid_state");
      const { error } = await supabaseAdmin.from("voucher_batches").update({ state: data.action === "pause" ? "paused" : "pending" }).eq("id", b.id).eq("state", b.state);
      if (error) throw Error("write_failed");
    }
    return { ok: true };
  });