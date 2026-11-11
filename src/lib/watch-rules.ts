// Pure rules for the background watcher: which alerts a router reading triggers, and how often. Browser-safe.
export const DOWN_AFTER_MS = 3 * 60_000;
export const STRAIN_EVERY_MS = 60 * 60_000;
export const LOW_READY = 20;
export const LOW_MIN_TOTAL = 30;

export type WatchState = { down?: boolean; downSince?: string; cpuHigh?: number; lastUptime?: number; last?: Record<string, string>; rebootAt?: string };
export type Reading = { cpu?: number; freeMemory?: number; totalMemory?: number; temperature?: string; uptime?: string };
export type AlertOut = { kind: 'router_down' | 'router_up' | 'router_strain' | 'router_restart'; key: string; severity: 'critical' | 'warn' | 'ok' | 'info'; ar: [string, string]; en: [string, string] };

/** RouterOS uptime like "1w2d03:04:05", "2d20:14:07" or "5h3m2s" to seconds. */
export function uptimeSeconds(u?: string): number | null {
  if (!u) return null;
  let s = 0; let rest = u;
  const w = /(\d+)w/.exec(rest); if (w) s += Number(w[1]) * 604800;
  const d = /(\d+)d/.exec(rest); if (d) s += Number(d[1]) * 86400;
  rest = rest.replace(/\d+[wd]/g, '');
  const hms = /^(\d+):(\d+):(\d+)/.exec(rest);
  if (hms) return s + Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3]);
  for (const [re, m] of [[/(\d+)h/, 3600], [/(\d+)m(?!s)/, 60], [/(\d+)s/, 1]] as const) { const x = re.exec(rest); if (x) s += Number(x[1]) * m; }
  return s || (/\d/.test(u) ? 0 : null);
}

const mins = (ms: number) => Math.max(1, Math.round(ms / 60_000));

/** Evaluates one router once a minute. Returns the alerts to send and the new state to store. */
export function evaluateRouter(name: string, lastSeenAt: string | null, r: Reading, prev: WatchState, now = Date.now()): { alerts: AlertOut[]; state: WatchState } {
  const state: WatchState = { ...prev, last: { ...(prev.last ?? {}) } };
  const alerts: AlertOut[] = [];
  const seen = lastSeenAt ? new Date(lastSeenAt).getTime() : null;
  const fresh = seen != null && now - seen < DOWN_AFTER_MS;
  if (seen != null && !fresh && !prev.down) {
    state.down = true; state.downSince = lastSeenAt!;
    alerts.push({ kind: 'router_down', key: `down:${lastSeenAt}`, severity: 'critical', ar: [`${name} غير متصل`, `ما وصلت منه إشارة من ${mins(now - seen)} دقائق. تأكد من الكهرباء والإنترنت.`], en: [`${name} is offline`, `No signal for ${mins(now - seen)} minutes. Check power and internet.`] });
  }
  if (fresh && prev.down) {
    const was = prev.downSince ? seen! - new Date(prev.downSince).getTime() : 0;
    state.down = false; delete state.downSince;
    alerts.push({ kind: 'router_up', key: `up:${lastSeenAt}`, severity: 'ok', ar: [`${name} رجع يشتغل`, `كان منقطعاً حوالي ${mins(was)} دقيقة.`], en: [`${name} is back online`, `It was down for about ${mins(was)} minutes.`] });
  }
  if (!fresh) return { alerts, state };

  const strain = (type: string, a: AlertOut) => {
    const last = state.last![type]; if (last && now - new Date(last).getTime() < STRAIN_EVERY_MS) return;
    state.last![type] = new Date(now).toISOString(); alerts.push(a);
  };
  state.cpuHigh = (r.cpu ?? 0) > 90 ? (prev.cpuHigh ?? 0) + 1 : 0;
  if (state.cpuHigh >= 3) strain('cpu', { kind: 'router_strain', key: `cpu:${Math.floor(now / STRAIN_EVERY_MS)}`, severity: 'warn', ar: [`${name}: المعالج مضغوط (${r.cpu}%)`, 'مستمر منذ 3 دقائق. الأسباب الشائعة: DNS مفتوح للإنترنت، قواعد جدار ناري كثيرة، أو مستخدم يحمّل بكثافة.'], en: [`${name}: CPU under load (${r.cpu}%)`, 'Ongoing for 3 minutes. Common causes: DNS open to the internet, many firewall rules, or a heavy downloader.'] });
  const mem = r.totalMemory ? Math.round(((r.totalMemory - (r.freeMemory ?? 0)) / r.totalMemory) * 100) : 0;
  if (mem > 90) strain('mem', { kind: 'router_strain', key: `mem:${Math.floor(now / STRAIN_EVERY_MS)}`, severity: 'warn', ar: [`${name}: الذاكرة شبه ممتلئة (${mem}%)`, 'قد يعلق الراوتر أو يعيد التشغيل. إعادة التشغيل في وقت هادئ تحررها مؤقتاً.'], en: [`${name}: memory almost full (${mem}%)`, 'The router may hang or restart. A restart at a quiet time frees it for now.'] });
  const temp = Number(r.temperature);
  if (temp > 70) strain('temp', { kind: 'router_strain', key: `temp:${Math.floor(now / STRAIN_EVERY_MS)}`, severity: 'warn', ar: [`${name}: الحرارة مرتفعة (${temp}°)`, 'تأكد من التهوية وأن الجهاز بعيد عن الشمس.'], en: [`${name}: running hot (${temp}°)`, 'Check ventilation and keep it out of the sun.'] });
  const up = uptimeSeconds(r.uptime);
  if (up != null) {
    if (prev.lastUptime != null && up + 120 < prev.lastUptime) {
      const asked = prev.rebootAt && now - new Date(prev.rebootAt).getTime() < 15 * 60_000;
      alerts.push(asked
        ? { kind: 'router_restart', key: `restart:${lastSeenAt}`, severity: 'ok', ar: [`${name} أعيد تشغيله بنجاح`, `رجع يشتغل بعد ${up} ثانية.`], en: [`${name} restarted`, `Back up after ${up} seconds.`] }
        : { kind: 'router_restart', key: `restart:${lastSeenAt}`, severity: 'warn', ar: [`${name} أعاد التشغيل فجأة`, 'انقطاع كهرباء أو مزود طاقة ضعيف أو حرارة. لو تكرر، افحص صحة الراوتر.'], en: [`${name} restarted unexpectedly`, 'Power cut, weak power supply or heat. If it repeats, run a health check.'] });
      delete state.rebootAt;
    }
    state.lastUptime = up;
  }
  return { alerts, state };
}

/** Packages with too few ready cards (only packages with enough cards to matter). */
export function lowPackages(cards: { profile: string | null; state: string }[]): { name: string; ready: number }[] {
  const m = new Map<string, { total: number; ready: number }>();
  for (const c of cards) { const k = c.profile || '-'; const e = m.get(k) ?? { total: 0, ready: 0 }; e.total++; if (c.state === 'unused') e.ready++; m.set(k, e); }
  return [...m.entries()].filter(([, e]) => e.total >= LOW_MIN_TOTAL && e.ready < LOW_READY).map(([name, e]) => ({ name, ready: e.ready }));
}

/** Local date and hour for an owner (offset in minutes from UTC). */
export function localClock(offsetMin: number, now = Date.now()) {
  const d = new Date(now + offsetMin * 60_000);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}

/** Finished Hotspot cards old enough to remove automatically. */
export function cardsToClean(cards: { name: string; source: string; finished_at: string | null }[], days: number, now = Date.now()): string[] {
  return cards.filter((c) => c.source === 'hotspot' && c.finished_at && now - new Date(c.finished_at).getTime() >= days * 86400_000 && /^[A-Za-z0-9._@-]{1,64}$/.test(c.name)).map((c) => c.name);
}
