import { OFFLINE_AFTER_MS } from './router-script';

export const packageKey = (p: { router_id: string; source: string; name: string }) => `${p.router_id}|${p.source}|${p.name}`;

export function freshReport(iso: string | null | undefined, now = Date.now()): boolean {
  if (!iso) return false;
  const age = now - Date.parse(iso);
  return Number.isFinite(age) && age >= 0 && age < OFFLINE_AFTER_MS;
}

export function freshSession(s: { router_id: string; synced_at?: string }, routers: { id: string; last_seen_at: string | null }[], now = Date.now()): boolean {
  return freshReport(s.synced_at, now) && freshReport(routers.find((r) => r.id === s.router_id)?.last_seen_at, now);
}

export function activeTotal(routers: { last_seen_at: string | null; last_status: unknown }[], now = Date.now()): number | null {
  if (!routers.length || routers.some((r) => !freshReport(r.last_seen_at, now))) return null;
  let total = 0;
  for (const r of routers) {
    const s = r.last_status as { hotspotActive?: number; umActive?: number } | null;
    if (typeof s?.hotspotActive !== 'number') return null;
    total += s.hotspotActive + (s.umActive ?? 0);
  }
  return total;
}

export async function confirmedWrite(write: () => PromiseLike<{ error: unknown }>): Promise<void> {
  const result = await write();
  if (result.error) throw new Error('save_failed');
}

export function relativeRead(iso: string | null | undefined, ar: boolean, now = Date.now()): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return ar ? 'لا توجد قراءة' : 'No reading yet';
  const mins = Math.max(0, Math.floor((now - Date.parse(iso)) / 60000));
  if (mins < 1) return ar ? 'الآن' : 'just now';
  const n = mins < 60 ? mins : mins < 1440 ? Math.floor(mins / 60) : Math.floor(mins / 1440);
  return ar ? `قبل ${n} ${mins < 60 ? 'دقيقة' : mins < 1440 ? 'ساعة' : 'يوم'}` : `${n} ${mins < 60 ? 'min' : mins < 1440 ? 'h' : 'd'} ago`;
}

export type JobSummaryInput = { id: string; status: string; result: string | null; payload?: { names?: string[] } | null };
export function summarizeBulk(rows: JobSummaryInput[]) {
  let succeeded = 0, failed = 0, waiting = 0;
  const retryIds: string[] = [];
  for (const j of rows) {
    const asked = j.payload?.names?.length ?? 0;
    const done = j.status === 'done' ? Math.min(asked, Math.max(0, Number(j.result?.split(':')[1]) || 0)) : 0;
    if (j.status === 'done') { succeeded += done; failed += asked - done; }
    else if (j.status === 'failed' || j.status === 'expired') { failed += asked; retryIds.push(j.id); }
    else waiting += asked;
  }
  return { succeeded, failed, waiting, retryIds, over: rows.length > 0 && rows.every((j) => ['done', 'failed', 'expired'].includes(j.status)) };
}

export function actionLogLabel(j: { kind: string; payload: { action?: string; name?: string; names?: string[]; source?: string } | null }, ar: boolean): string {
  const t = (a: string, b: string) => ar ? a : b;
  const p = j.payload ?? {};
  if (j.kind === 'reboot') return t('إعادة تشغيل الراوتر', 'Router restart');
  if (j.kind === 'remove_cards') return t(`إزالة ${p.names?.length ?? 0} كرت خلص رصيده`, `Remove ${p.names?.length ?? 0} used-up cards`);
  const actions: Record<string, [string, string]> = { renew: ['تجديد', 'Renew'], off: ['إيقاف', 'Turn off'], on: ['تشغيل', 'Turn on'], del: ['حذف', 'Remove'], kick: ['فصل', 'Disconnect'], name: ['تغيير الاسم', 'Rename'], pw: ['تغيير كلمة السر', 'Change password'], add: ['إضافة', 'Add'], edit: ['تعديل', 'Edit'] };
  const pair = actions[p.action ?? ''];
  const action = pair ? t(pair[0], pair[1]) : t('إجراء', 'Action');
  if (j.kind === 'package') return `${action} ${t('باقة', 'package')} ${p.name ?? ''}`;
  if (j.kind === 'card_action') return `${action} ${t('كرت', 'card')} ${p.name ?? ''}`;
  if (j.kind === 'card_bulk') return `${action} ${p.names?.length ?? 0} ${t('كرت', 'cards')}`;
  return t('إجراء على الراوتر', 'Router action');
}