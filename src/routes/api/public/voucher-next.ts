import { createFileRoute } from "@tanstack/react-router";
import { hashToken } from "@/lib/router-script";
import { issuanceHold } from "@/lib/vouchers";
export const Route = createFileRoute("/api/public/voucher-next")({
  server: { handlers: { POST: async ({ request }) => {
    const headers = { "Cache-Control": "no-store" };
    const token = request.headers.get("x-mikro-token") ?? "";
    if (!/^[a-f0-9]{48}$/.test(token)) return new Response("unauthorized", { status: 401, headers });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: router, error } = await supabaseAdmin.from("routers").select("id,last_status,last_seen_at").eq("token_hash", await hashToken(token)).maybeSingle();
    if (error) return new Response("unavailable", { status: 503, headers });
    if (!router) return new Response("unauthorized", { status: 401, headers });
    const key = process.env["VOUCHER_ARCHIVE_KEY"];
    const allowed = (process.env["VOUCHER_ISSUANCE_TEST_ROUTERS"] ?? "").split(",");
    if (!key || (process.env["VOUCHER_ISSUANCE_VERIFIED"] !== "true" && !allowed.includes(router.id))) return new Response("hold|testing", { headers });
    const status = router.last_status as Record<string, unknown> | null;
    const hold = issuanceHold(status, router.last_seen_at);
    if (hold) return new Response("hold|" + hold, { headers });
    const { dispatchVoucher } = await import("@/lib/voucher-dispatch.server");
    return new Response(await dispatchVoucher(router.id, String(status?.["version"] ?? ""), key) ?? "idle", { headers });
  } } },
});