export type Language = 'ar' | 'en';
export const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat('en-US', options).format(value);
export const demoCards = [
  { id: 'DEMO-001', active: true, usage: 12.5, limitMB: 2000, downloadMB: 200, uploadMB: 50, usedMinutes: 35, limitMinutes: 240 },
  { id: 'DEMO-002', active: false, usage: 0, limitMB: 1000, downloadMB: 0, uploadMB: 0, usedMinutes: 0, limitMinutes: 120 },
  { id: 'DEMO-003', active: true, usage: 68.2, limitMB: 5000, downloadMB: 3000, uploadMB: 410, usedMinutes: 160, limitMinutes: 360 },
  { id: 'DEMO-004', active: true, usage: 85, limitMB: 1000, downloadMB: 780, uploadMB: 70, usedMinutes: 130, limitMinutes: 180 },
];
export type DemoCard = typeof demoCards[number];
export type CardState = 'unused' | 'inUse' | 'almostFinished';
export const LOW_REMAINING_RATIO = 0.2;
export const remainingMB = (card: DemoCard) => card.limitMB - card.downloadMB - card.uploadMB;
export const remainingRatio = (card: DemoCard) => card.limitMB ? remainingMB(card) / card.limitMB : 0;
export const cardState = (card: DemoCard): CardState => !card.active || card.downloadMB + card.uploadMB === 0 ? 'unused' : remainingRatio(card) < LOW_REMAINING_RATIO ? 'almostFinished' : 'inUse';
const stateOrder: Record<CardState, number> = { almostFinished: 0, inUse: 1, unused: 2 };
export const byAttention = (cards: DemoCard[]) => [...cards].sort((a, b) => stateOrder[cardState(a)] - stateOrder[cardState(b)]);
/** MB under 1,000 stays MB; otherwise GB with at most one decimal. Latin digits. */
export const formatDataSize = (mb: number) => mb >= 1000 ? `${formatNumber(Math.round(mb / 100) / 10)} GB` : `${formatNumber(mb)} MB`;
export const formatDuration = (minutes: number, ar: boolean) => { const h = Math.floor(minutes / 60), m = minutes % 60; const hs = ar ? 'ساعة' : 'h', ms = ar ? 'دقيقة' : 'm'; return h ? (m ? `${h} ${hs} ${m} ${ms}` : `${h} ${hs}`) : `${m} ${ms}`; };
export const searchCards = (query: string) => demoCards.filter(card => card.id.toLowerCase().includes(query.trim().toLowerCase()));

export type DemoSession = { start: string; minutes: number; downloadMB: number; uploadMB: number; device: string };
/** Illustrative sessions only; totals match each card's download/upload. */
export const demoSessions: Record<string, DemoSession[]> = {
  'DEMO-001': [{ start: '2026-11-10 20:15', minutes: 35, downloadMB: 200, uploadMB: 50, device: 'Android' }],
  'DEMO-002': [],
  'DEMO-003': [
    { start: '2026-11-09 18:02', minutes: 40, downloadMB: 450, uploadMB: 60, device: 'iPhone' },
    { start: '2026-11-09 22:30', minutes: 95, downloadMB: 2300, uploadMB: 250, device: 'Smart TV' },
    { start: '2026-11-10 13:10', minutes: 25, downloadMB: 250, uploadMB: 100, device: 'iPhone' },
  ],
  'DEMO-004': [
    { start: '2026-11-10 19:40', minutes: 20, downloadMB: 60, uploadMB: 10, device: 'Android' },
    { start: '2026-11-10 23:05', minutes: 110, downloadMB: 720, uploadMB: 60, device: 'Laptop' },
  ],
};
export const sessionsOf = (card: DemoCard) => demoSessions[card.id] ?? [];
export const biggestSession = (s: DemoSession[]) => s.reduce<DemoSession | undefined>((b, x) => !b || x.downloadMB + x.uploadMB > b.downloadMB + b.uploadMB ? x : b, undefined);
export const filterCards = (cards: DemoCard[], query: string, state: CardState | 'all') => cards.filter(c => c.id.toLowerCase().includes(query.trim().toLowerCase()) && (state === 'all' || cardState(c) === state));

export type Tone = 'short' | 'detailed';
/** Wraps Latin values in Unicode isolates so they keep their order inside Arabic text. */
export const iso = (v: string | number) => `\u2066${v}\u2069`;
export function buildCustomerMessage(card: DemoCard, lang: Language, tone: Tone) {
  const ar = lang === 'ar'; const s = sessionsOf(card); const big = biggestSession(s); const used = card.downloadMB + card.uploadMB;
  const L = (v: string | number) => ar ? iso(String(v).replace(/ /g, "\u00A0")) : String(v); const D = (mb: number) => L(formatDataSize(mb));
  const left = D(remainingMB(card)), total = D(card.limitMB), usedS = D(used), time = formatDuration(card.usedMinutes, ar), id = L(card.id);
  const downHeavy = used > 0 && card.downloadMB / used > 0.7;
  if (used === 0) return ar ? `مرحباً، الكرت ${id} لم يُستخدم بعد، والباقة كاملة ${total}.` : `Hello, card ${id} has not been used yet. The full ${total} is available.`;
  const lines = ar
    ? [`مرحباً، هذه تفاصيل الكرت ${id}:`, `• الباقة: ${total}`, `• المستهلك: ${usedS}`, `• المتبقي: ${left}`, `• مدة الاتصال: ${time} في ${s.length} جلسة`]
    : [`Hello, here are the details for card ${id}:`, `• Package: ${total}`, `• Used: ${usedS}`, `• Remaining: ${left}`, `• Connection time: ${time} over ${s.length} session${s.length === 1 ? '' : 's'}`];
  if (tone === 'detailed') {
    s.forEach((x, i) => lines.push(ar ? `  ${i + 1}) ${L(x.start)} · ${formatDuration(x.minutes, true)} · ${D(x.downloadMB + x.uploadMB)} · ${L(x.device)}` : `  ${i + 1}) ${x.start} · ${formatDuration(x.minutes, false)} · ${formatDataSize(x.downloadMB + x.uploadMB)} · ${x.device}`));
    if (big) lines.push(ar ? `أكبر جلسة: ${D(big.downloadMB + big.uploadMB)} على جهاز ${L(big.device)}.` : `Biggest session: ${formatDataSize(big.downloadMB + big.uploadMB)} on ${big.device}.`);
  }
  if (downHeavy) lines.push(ar ? 'أغلب الاستهلاك تحميل، مثل مشاهدة الفيديو، وهذا سبب انتهاء الباقة بسرعة.' : 'Most of the usage was downloading, such as watching video, which is why the package ran out quickly.');
  lines.push(ar ? 'شكراً لك.' : 'Thank you.');
  return lines.join('\n');
}
