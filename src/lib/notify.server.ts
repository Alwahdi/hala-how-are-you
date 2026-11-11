// Saves an alert in the owner's log and pushes it to every phone they enabled. Server only (admin client passed in).
import { sendPush } from './web-push';

export type AlertKind = 'router_down' | 'router_up' | 'router_strain' | 'router_restart' | 'cards_low' | 'daily_report' | 'health' | 'cleanup' | 'test';
const PREF: Partial<Record<AlertKind, string>> = { router_down: 'router_down', router_up: 'router_down', router_strain: 'router_strain', router_restart: 'router_strain', cards_low: 'cards_low', daily_report: 'daily_report', health: 'health', cleanup: 'auto_cleanup' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function notify(sb: any, a: { owner: string; router?: string | null; kind: AlertKind; key: string; title: string; body: string; path?: string; severity?: 'info' | 'warn' | 'critical' | 'ok'; dedupHours?: number }) {
  if (a.dedupHours) {
    const since = new Date(Date.now() - a.dedupHours * 3600_000).toISOString();
    const { data: dup } = await sb.from('alerts').select('id').eq('owner_id', a.owner).eq('dedup_key', a.key).gte('created_at', since).limit(1).maybeSingle();
    if (dup) return { sent: 0, skipped: true };
  }
  await sb.from('alerts').insert({ owner_id: a.owner, router_id: a.router ?? null, kind: a.kind, dedup_key: a.key, title: a.title, body: a.body, path: a.path ?? '/alerts', severity: a.severity ?? 'info' });
  const pref = PREF[a.kind];
  if (pref) {
    const { data: p } = await sb.from('alert_prefs').select('*').eq('owner_id', a.owner).maybeSingle();
    if (p && p[pref] === false) return { sent: 0, skipped: false };
  }
  const seed = process.env['VAPID_SEED'];
  if (!seed) return { sent: 0, skipped: false };
  const { data: subs } = await sb.from('push_subscriptions').select('endpoint, p256dh, auth').eq('owner_id', a.owner);
  let sent = 0;
  for (const s of subs ?? []) {
    const r = await sendPush(s, { title: a.title, body: a.body, path: a.path ?? '/alerts', tag: a.kind }, seed, a.severity === 'critical' ? 'high' : 'normal');
    if (r === 'gone') await sb.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
    if (r === 'ok') sent++;
  }
  return { sent, skipped: false };
}
