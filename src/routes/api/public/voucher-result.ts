import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { hashToken } from "@/lib/router-script";
export const Route = createFileRoute("/api/public/voucher-result")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-mikro-token") ?? "";
        if (!/^[a-f0-9]{48}$/.test(token)) return new Response("unauthorized", { status: 401 });
        const raw = await request.text();
        if (raw.length > 10000) return new Response("too large", { status: 413 });
        let data;
        try {
          data = z
            .union([z.object({ item: z.string().uuid(), result: z.enum(["ok", "error"]) }),z.object({lease:z.string().uuid(),results:z.array(z.object({item:z.string().uuid(),result:z.enum(["ok","error"])})).min(1).max(100)})])
            .parse(JSON.parse(raw));
        } catch {
          return new Response("invalid", { status: 400 });
        }
        const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
        const { data: r } = await sb
          .from("routers")
          .select("id")
          .eq("token_hash", await hashToken(token))
          .maybeSingle();
        if (!r) return new Response("unauthorized", { status: 401 });
        const {error} = "lease" in data ? await sb.rpc("confirm_voucher_chunk",{rid:r.id,lease:data.lease,results:data.results}) : await sb.rpc("confirm_voucher_item",{iid:data.item,rid:r.id,res:data.result});
        return new Response(error ? "failed" : "ok", { status: error ? 500 : 200 });
      },
    },
  },
});
