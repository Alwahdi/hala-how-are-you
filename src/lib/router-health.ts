// Read-only router health check built from the documented common faults (docs/06-mikrotik/common-faults.md). Browser-safe.
import { SLOW_CARD_READ_SECS } from './card-runs';
export type HealthInput = {
  version?: string; freeHdd?: number; totalHdd?: number; freeMemory?: number; totalMemory?: number;
  ntp?: string; clockDate?: string; services?: string; socks?: string; proxy?: string; users?: number; scripts?: number; idle?: string; shared?: string;
  /** Seconds the router's last complete card read took (from our own records, not the router report). */
  cardsSecs?: number | null | undefined;
};
export type Issue = { id: string; severity: 'critical' | 'warn' | 'info'; ar: [string, string]; en: [string, string]; fix?: string };

const parseVer = (v?: string) => { const m = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(v ?? ''); return m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)] as const : null; };
const lt = (a: readonly number[], b: number[]) => { for (let i = 0; i < 3; i++) { if (a[i]! !== b[i]!) return a[i]! < b[i]!; } return false; };
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** RouterOS dates: "2026-11-11" (v7.10+) or "nov/11/2026". */
export function parseRouterDate(s?: string): number | null {
  if (!s) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (m) return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!);
  m = /^([a-z]{3})\/(\d{2})\/(\d{4})$/i.exec(s); if (m) { const mo = MONTHS.indexOf(m[1]!.toLowerCase()); return mo < 0 ? null : Date.UTC(+m[3]!, mo, +m[2]!); }
  return null;
}

/** How long something took, in plain Arabic or English ("40 ثانية", "3 دقائق", "دقيقتين"). */
export function readTime(secs: number, ar: boolean): string {
  if (secs < 2) return ar ? 'أقل من ثانيتين' : 'under 2 seconds';
  const [n, one, two, few, many] = secs < 90 ? [secs, 'ثانية', 'ثانيتين', 'ثوانٍ', 'ثانية'] : [Math.round(secs / 60), 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة'];
  if (!ar) return `${n} ${secs < 90 ? 'seconds' : 'minutes'}`;
  if (n === 1) return one; if (n === 2) return two;
  return `${n} ${n <= 10 ? few : many}`;
}

export function checkHealth(h: HealthInput, now = Date.now()): Issue[] {
  const out: Issue[] = [];
  const hdd = h.totalHdd ? (h.freeHdd ?? 0) / h.totalHdd : null;
  if (hdd != null && hdd < 0.1) out.push({ id: 'storage', severity: 'critical', ar: ['المساحة شبه ممتلئة', 'امتلاء التخزين يسبب تعليق الراوتر وفشل حفظ الإعدادات. احذف ملفات النسخ والسجلات القديمة من Files.'], en: ['Storage almost full', 'Full storage hangs the router and breaks saving settings. Delete old backups and logs from Files.'] });
  const mem = h.totalMemory ? (h.freeMemory ?? 0) / h.totalMemory : null;
  if (mem != null && mem < 0.1) out.push({ id: 'memory', severity: 'warn', ar: ['الذاكرة شبه ممتلئة', 'قد يعيد الراوتر التشغيل فجأة. أعد تشغيله في وقت هادئ وراقب الاستهلاك.'], en: ['Memory almost full', 'The router may restart suddenly. Restart at a quiet time and watch usage.'] });
  if (h.ntp === 'false') out.push({ id: 'ntp', severity: 'warn', ar: ['مزامنة الوقت مطفية', 'لو انقطعت الكهرباء ترجع ساعة الراوتر للخلف فتنتهي الكروت قبل وقتها أو بعده.'], en: ['Time sync is off', 'After a power cut the router clock goes back, so cards end too early or too late.'], fix: '/system ntp client set enabled=yes servers=time.cloudflare.com,pool.ntp.org' });
  const rd = parseRouterDate(h.clockDate);
  if (rd != null && Math.abs(rd - Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate())) > 2 * 86400_000) out.push({ id: 'clock', severity: 'critical', ar: ['تاريخ الراوتر خاطئ', 'الكروت ذات المدة بالأيام تنتهي بشكل خاطئ. فعّل مزامنة الوقت.'], en: ['Router date is wrong', 'Day-based cards expire incorrectly. Turn on time sync.'], fix: '/system ntp client set enabled=yes servers=time.cloudflare.com,pool.ntp.org' });
  const v = parseVer(h.version);
  if (v && v[0] === 6 && lt(v, [6, 42, 1])) out.push({ id: 'version_vuln', severity: 'critical', ar: ['إصدار فيه ثغرة معروفة', 'إصدارات v6 قبل 6.42.1 فيها ثغرة Winbox التي اخترقت آلاف الأجهزة. حدّث فوراً وغيّر كلمات المرور.'], en: ['Version with a known vulnerability', 'v6 before 6.42.1 has the Winbox flaw used to hack thousands of routers. Update now and change passwords.'], fix: '/system package update set channel=long-term; /system package update check-for-updates' });
  else if (v && v[0] === 6 && lt(v, [6, 49, 0])) out.push({ id: 'version_old', severity: 'warn', ar: ['إصدار قديم', 'حدّث إلى آخر 6.49 (long-term) قبل أي ترقية إلى v7. خذ نسخة احتياطية أولاً.'], en: ['Old version', 'Update to the latest 6.49 (long-term) before any move to v7. Back up first.'], fix: '/system package update set channel=long-term; /system package update check-for-updates' });
  else if (v && v[0] === 7 && lt(v, [7, 12, 0])) out.push({ id: 'version_old', severity: 'info', ar: ['يتوفر تحديث مستقر', 'إصدارات v7 الأحدث أصلحت مشاكل في Hotspot وUser Manager.'], en: ['A stable update is available', 'Newer v7 releases fixed Hotspot and User Manager issues.'] });
  const svc = (h.services ?? '').split(',').filter(Boolean);
  const risky = svc.filter((s) => ['telnet', 'ftp'].includes(s));
  if (risky.length) out.push({ id: 'services', severity: 'warn', ar: [`خدمات غير آمنة شغالة: ${risky.join('، ')}`, 'ترسل كلمات المرور بدون تشفير. أطفئها لو ما تستخدمها.'], en: [`Unsafe services on: ${risky.join(', ')}`, 'They send passwords unencrypted. Turn them off if unused.'], fix: risky.map((s) => `/ip service set ${s} disabled=yes`).join('; ') });
  if (h.socks === 'true' || h.proxy === 'true') out.push({ id: 'proxy', severity: 'critical', ar: ['Socks أو Proxy مفعّل', 'من أشهر علامات الاختراق. لو ما فعّلته بنفسك: أطفئه، غيّر كلمات المرور، وراجع المستخدمين والسكربتات.'], en: ['Socks or Proxy is on', 'A classic sign of a break-in. If you did not turn it on: switch it off, change passwords, review users and scripts.'], fix: '/ip socks set enabled=no; /ip proxy set enabled=no' });
  if ((h.users ?? 0) > 4) out.push({ id: 'users', severity: 'warn', ar: [`${h.users} مستخدمين على الراوتر`, 'راجع /user — أي مستخدم لا تعرفه احذفه فوراً.'], en: [`${h.users} users on the router`, 'Review /user — delete any user you do not know.'] });
  if (h.idle === 'none') out.push({ id: 'idle', severity: 'warn', ar: ['مهلة الخمول مطفية في Hotspot', 'الجلسة تبقى شغالة بعد ما يبتعد الزبون، فيُحسب عليه الوقت. اجعلها 5 دقائق.'], en: ['Hotspot idle timeout is off', 'Sessions stay on after the customer leaves, so time keeps counting. Set 5 minutes.'], fix: '/ip hotspot set [find] idle-timeout=5m' });
  const shared = (h.shared ?? '').split(',').filter(Boolean);
  if (shared.some((s) => s === 'unlimited' || Number(s) > 1)) out.push({ id: 'shared', severity: 'info', ar: ['باقات تسمح بأكثر من جهاز للكرت', 'لو ما تقصد هذا، الكرت يُستهلك أسرع ويشتكي الزبون. اجعلها 1.'], en: ['Packages allow several devices per card', 'If unintended, cards run out faster and customers complain. Set it to 1.'], fix: '/ip hotspot user profile set [find] shared-users=1' });
  if ((h.cardsSecs ?? 0) > SLOW_CARD_READ_SECS) {
    const secs = h.cardsSecs ?? 0;
    out.push({ id: 'cards_slow', severity: 'warn', ar: [`قراءة الكروت تأخذ ${readTime(secs, true)}`, 'المعالج يبقى مشغولاً طول القراءة. اضغط «إعادة الربط» مرة لتصل القراءة الخفيفة الجديدة، ولو بقيت بطيئة احذف الكروت المنتهية.'], en: [`Reading cards takes ${readTime(secs, false)}`, 'The CPU stays busy the whole time. Tap Reconnect once to get the new light reader; if it stays slow, remove used-up cards.'] });
  }
  return out;
}

export function healthScore(issues: Issue[]): number {
  return Math.max(0, 100 - issues.reduce((n, i) => n + (i.severity === 'critical' ? 25 : i.severity === 'warn' ? 10 : 3), 0));
}
