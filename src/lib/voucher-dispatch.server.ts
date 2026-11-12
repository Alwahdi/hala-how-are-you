import { unseal } from "./voucher-crypto.server";

import { packageFacts } from "./packages";
import type { ProfileRow } from "@/components/dashboard/types";
export async function dispatchVoucher(routerId: string, version: string, secret: string) {
  const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
  const { data, error } = await sb.rpc("claim_voucher_item", { rid: routerId });
  if (error || !data) return null;
  const claim = data as unknown as {
    item: { id: string; name: string; batch_id: string };
    batch: { source: string; package_name: string; package_snapshot: ProfileRow };
  };
  const { data: row } = await sb
    .from("voucher_secrets")
    .select("ciphertext")
    .eq("item_id", claim.item.id)
    .maybeSingle();
  if (!row) return null;
  const facts = packageFacts(claim.batch.package_snapshot, []);
  const limits = (
    claim.batch.package_snapshot as unknown as { issue_limits?: { bytes: number; time: number } }
  ).issue_limits;
  const password = await unseal(row.ciphertext, secret, claim.item.id);
  return [
    "issue",
    claim.item.id,
    claim.batch.source,
    claim.item.name,
    password || "-",
    claim.batch.package_name,
    "vc-" + claim.item.id,
    limits?.bytes ?? facts.dataBytes ?? 0,
    limits?.time ?? facts.uptimeS ?? 0,
  ].join("|");
}

export async function dispatchVoucherChunk(routerId: string, version: string, secret: string, token: string, resultUrl: string) {
  const {supabaseAdmin:sb}=await import("@/integrations/supabase/client.server");
  const {data,error}=await sb.rpc("claim_voucher_chunk",{rid:routerId,amount:25});
  if(error)throw Error("claim_failed");
  if(!data)return null;
  const claim=data as unknown as {lease:string;items:{item:{id:string;name:string;source:string};batch:{package_name:string;package_snapshot:ProfileRow}}[]};
  const {data:secrets,error:se}=await sb.from("voucher_secrets").select("item_id,ciphertext").in("item_id",claim.items.map(i=>i.item.id));
  if(se||secrets?.length!==claim.items.length)throw Error("archive_missing");
  const map=new Map(secrets.map(s=>[s.item_id,s.ciphertext]));
  const tasks=[];
  for(const {item,batch} of claim.items){
    const cipher=map.get(item.id);if(!cipher)throw Error("archive_missing");
    const facts=packageFacts(batch.package_snapshot,[]);
    const limits=(batch.package_snapshot as unknown as {issue_limits?:{bytes:number;time:number}}).issue_limits;
    tasks.push({id:item.id,source:item.source,name:item.name,password:await unseal(cipher,secret,item.id),profile:batch.package_name,bytes:limits?.bytes??facts.dataBytes??0,time:limits?.time??facts.uptimeS??0});
  }
  const {voucherChunkScript}=await import("./voucher-router");
  return voucherChunkScript(tasks,version,claim.lease,token,resultUrl);
}
