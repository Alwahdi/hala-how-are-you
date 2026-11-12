import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { directAccessState, hashToken, majorVersion, shouldTryDirect } from '@/lib/router-script';
import { normalizeCloudHost } from '@/lib/ip-cloud';
import { checkOne } from '@/lib/ip-cloud-probe';
import { parseActiveList, storeSessionsFor } from '@/lib/router-sync';
import { bulkJobLine, cardJobLine } from '@/lib/card-actions';
import { packageJobLine, type PkgInput } from '@/lib/packages';

const num = z.coerce.number().finite().nonnegative().max(1e15);
const str = z.string().max(120);
const Report = z.object({
  voucherProtocol:z.number().int().optional(),
  identity: str, board: str, version: str, uptime: str,
  cpu: num, freeMemory: num, totalMemory: num, freeHdd: num, totalHdd: num,
  hotspotActive: num, temperature: str.optional().default(''),
  cloudName: str.optional().default(''), sslPort: z.string().max(5).optional().default(''), sslDisabled: z.string().max(5).optional().default(''),
  publicAddress: z.string().max(45).optional().default(''), behindNat: z.string().max(8).optional().default(''),
  apiPort: z.string().max(5).optional().default(''), apiDisabled: z.string().max(5).optional().default(''), apiSslPort: z.string().max(5).optional().default(''), apiSslDisabled: z.string().max(5).optional().default(''), umActive: num.optional(), apiUser: num.optional(),
  ntp: z.string().max(8).optional(), clockDate: z.string().max(20).optional(), services: z.string().max(120).optional(), socks: z.string().max(8).optional(), proxy: z.string().max(8).optional(),
  users: num.optional(), idle: z.string().max(20).optional(), shared: z.string().max(200).optional(),
  umi: z.string().max(20).optional(), umr: num.optional(), act: z.string().max(3000).optional(), actMore: z.string().max(4).optional(), tz: z.string().max(12).optional(),
});

const LOG_EVERY_MS = 5 * 60_000;
const MIN_GAP_MS = 10_000;

export const Route = createFileRoute('/api/public/router-report')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('x-mikro-token') ?? '';
        if (!/^[a-f0-9]{48}$/.test(token)) return new Response('unauthorized', { status: 401 });
        const raw = await request.text();
        if (raw.length > 8000) return new Response('too large', { status: 413 });
        let parsed;
        try { parsed = Report.safeParse(JSON.parse(raw)); } catch { return new Response('bad json', { status: 400 }); }
        if (!parsed.success) return new Response('bad report', { status: 400 });

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const hash = await hashToken(token);
        const { data: router } = await supabaseAdmin.from('routers').select('id, last_seen_at, cloud_host, direct_port, last_check_error, direct_checked_at, cards_synced_at').eq('token_hash', hash).maybeSingle();
        if (!router) return new Response('unauthorized', { status: 401 });

        const now = Date.now();
        if (router.last_seen_at && now - new Date(router.last_seen_at).getTime() < MIN_GAP_MS) return new Response('ok');

        const { act, actMore, ...status } = parsed.data;
        if (!router.last_seen_at || now - new Date(router.last_seen_at).getTime() > 120_000) await supabaseAdmin.from('router_setups').delete().eq('router_id', router.id);
        await supabaseAdmin.from('routers').update({ last_seen_at: new Date(now).toISOString(), last_status: status, ...(majorVersion(status.version) ? { ros_version: majorVersion(status.version)! } : {}) }).eq('id', router.id);
        const { data: last } = await supabaseAdmin.from('router_status_log').select('created_at').eq('router_id', router.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (!last || now - new Date(last.created_at).getTime() >= LOG_EVERY_MS) {
          await supabaseAdmin.from('router_status_log').insert({ router_id: router.id, status });
        }
        // Who is online (Hotspot). A full list replaces the old one; a capped list only adds, and the 5-minute card run cleans up.
        if (act !== undefined) {
          const since = new Date(now - (actMore === 'yes' ? 6 * 60_000 : 1000)).toISOString();
          const online = parseActiveList(act);
          await storeSessionsFor(supabaseAdmin, router.id, 'hotspot', online, since);
          const names = [...new Set(online.map((s) => s.username))];
          // User Manager cards log in through Hotspot too, so the online mark goes to the card whatever its kind.
          if (names.length) await supabaseAdmin.from('router_cards').update({ last_online_at: new Date(now).toISOString() }).eq('router_id', router.id).in('name', names);
        }
        // Not behind NAT + IP Cloud + API on: connect directly on our own (8729 then 8728), no owner input. Push stays the backup.
        const host = normalizeCloudHost(status.cloudName);
        let job = await nextJob(supabaseAdmin, router.id);
        const archiveKey=process.env['VOUCHER_ARCHIVE_KEY'];
        if(!job && status.voucherProtocol===1 && archiveKey){const {dispatchVoucher}=await import('@/lib/voucher-dispatch.server');job=await dispatchVoucher(router.id,status.version,archiveKey);}

        if (host && directAccessState(status) === 'ready' && status.apiUser === 0) {
          // The router says our read-only user is missing: show that instead of trying a login that cannot work.
          if (router.last_check_error !== 'no_user') await supabaseAdmin.from('routers').update({ cloud_host: host, direct_port: null, direct_tls: null, last_check_error: 'no_user', direct_checked_at: new Date(now).toISOString() }).eq('id', router.id);
        } else if (host && shouldTryDirect(router, status, now)) {
          await checkOne(supabaseAdmin, router.id, host).catch(() => null);
        }
        return new Response(job ?? 'ok',{headers:{'Cache-Control':'no-store'}});
      },
    },
  },
});

/** Hands the router at most one queued task as a fixed-format line the router script understands (anything else is ignored there). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function nextJob(sb: any, routerId: string): Promise<string | null> {
  // A card action the router did not pick up within 5 minutes is dropped, so it never runs much later by surprise.
  await sb.from('router_jobs').update({ status: 'expired', done_at: new Date().toISOString(), payload: {} }).eq('router_id', routerId).in('kind', ['card_action', 'card_bulk', 'package']).eq('status', 'pending').lt('requested_at', new Date(Date.now() - 5 * 60_000).toISOString());
  const { data: j } = await sb.from('router_jobs').select('id, kind, payload').eq('router_id', routerId).eq('status', 'pending').order('requested_at').limit(1).maybeSingle();
  if (!j) return null;
  const now = new Date().toISOString();
  const { data: claimed } = await sb.from('router_jobs').update({ status: 'sent', sent_at: now }).eq('id', j.id).eq('status', 'pending').select('id').maybeSingle();
  if (!claimed) return null;
  if (j.kind === 'reboot') {
    const { data: r } = await sb.from('routers').select('watch_state').eq('id', routerId).maybeSingle();
    await sb.from('routers').update({ watch_state: { ...(r?.watch_state ?? {}), rebootAt: now } }).eq('id', routerId);
    return 'reboot|';
  }
  if (j.kind === 'card_action') {
    const p = (j.payload ?? {}) as { source?: string; action?: string; name?: string; value?: string };
    const line = cardJobLine(j.id, { source: p.source ?? '', action: p.action ?? '', name: p.name ?? '', value: p.value ?? null });
    // A new password is handed over once and then wiped; a new name is kept so the card list can follow it.
    if (p.action === 'pw') await sb.from('router_jobs').update({ payload: { ...p, value: null } }).eq('id', j.id);
    if (!line) await sb.from('router_jobs').update({ status: 'failed', result: 'invalid', done_at: now }).eq('id', j.id);
    return line;
  }
  if (j.kind === 'card_bulk') {
    const p = (j.payload ?? {}) as { source?: string; action?: string; names?: string[] };
    const line = bulkJobLine(j.id, p.source ?? '', p.action ?? '', p.names ?? []);
    if (!line) await sb.from('router_jobs').update({ status: 'failed', result: 'invalid', done_at: now }).eq('id', j.id);
    return line;
  }
  if (j.kind === 'package') {
    const line = packageJobLine(j.id, (j.payload ?? {}) as PkgInput);
    if (!line) await sb.from('router_jobs').update({ status: 'failed', result: 'invalid', done_at: now }).eq('id', j.id);
    return line;
  }
  const names = ((j.payload?.names ?? []) as string[]).filter((n) => /^[A-Za-z0-9._@-]{1,64}$/.test(n)).slice(0, 40);
  return names.length ? `rm|${j.id}|${names.join(',')}` : null;
}
