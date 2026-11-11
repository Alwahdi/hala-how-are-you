export type Language = 'ar' | 'en';
export const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat('en-US', options).format(value);
export const demoCards = [
  { id: 'DEMO-001', active: true, usage: 12.5, limitMB: 2000, downloadMB: 200, uploadMB: 50, usedMinutes: 35, limitMinutes: 240 },
  { id: 'DEMO-002', active: false, usage: 0, limitMB: 1000, downloadMB: 0, uploadMB: 0, usedMinutes: 0, limitMinutes: 120 },
  { id: 'DEMO-003', active: true, usage: 68.2, limitMB: 5000, downloadMB: 3000, uploadMB: 410, usedMinutes: 160, limitMinutes: 360 },
  { id: 'DEMO-004', active: true, usage: 85, limitMB: 1000, downloadMB: 780, uploadMB: 70, usedMinutes: 130, limitMinutes: 180 },
];
export type DemoCard = typeof demoCards[number] & { code?: string; isNew?: boolean; disabled?: boolean };
export type CardState = 'unused' | 'inUse' | 'almostFinished' | 'disabled';
export const LOW_REMAINING_RATIO = 0.2;
export const remainingMB = (card: DemoCard) => card.limitMB - card.downloadMB - card.uploadMB;
export const remainingRatio = (card: DemoCard) => card.limitMB ? remainingMB(card) / card.limitMB : 0;
export const cardState = (card: DemoCard): CardState => card.disabled ? 'disabled' : !card.active || card.downloadMB + card.uploadMB === 0 ? 'unused' : remainingRatio(card) < LOW_REMAINING_RATIO ? 'almostFinished' : 'inUse';
const stateOrder: Record<CardState, number> = { almostFinished: 0, inUse: 1, unused: 2, disabled: 3 };
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
const sessionsWord = (n: number, ar: boolean) => ar ? (n === 1 ? 'جلسة واحدة' : n === 2 ? 'جلستين' : `${iso(n)} جلسات`) : `${n} session${n === 1 ? '' : 's'}`;
/** Plain, customer-facing explanation of a card's usage. Latin digits; Latin values isolated inside Arabic. */
export function buildCustomerMessage(card: DemoCard, lang: Language, tone: Tone) {
  const ar = lang === 'ar'; const s = sessionsOf(card); const big = biggestSession(s); const used = card.downloadMB + card.uploadMB;
  const L = (v: string | number) => ar ? iso(String(v).replace(/ /g, '\u00A0')) : String(v); const D = (mb: number) => L(formatDataSize(mb));
  const pct = card.limitMB ? Math.round(used / card.limitMB * 100) : 0;
  const downHeavy = used > 0 && card.downloadMB / used > 0.7;
  if (used === 0 && card.code) return buildNewCardMessage([card], lang);
  if (used === 0) return ar ? `مرحباً، كرتك ${L(card.id)} لم يُستخدم بعد، والباقة كاملة ${D(card.limitMB)} جاهزة لك.` : `Hello, your card ${card.id} has not been used yet. The full ${formatDataSize(card.limitMB)} is ready for you.`;
  const lines = ar ? [
    `مرحباً، هذا ملخص كرتك ${L(card.id)}:`, '',
    `• الباقة: ${D(card.limitMB)}`,
    `• استخدمت: ${D(used)} (${L(pct + '%')})`,
    `• المتبقي: ${D(remainingMB(card))}`,
    `• وقت الاتصال: ${formatDuration(card.usedMinutes, true)} خلال ${sessionsWord(s.length, true)}`,
  ] : [
    `Hello, here is a summary of your card ${card.id}:`, '',
    `• Package: ${formatDataSize(card.limitMB)}`,
    `• Used: ${formatDataSize(used)} (${pct}%)`,
    `• Remaining: ${formatDataSize(remainingMB(card))}`,
    `• Connection time: ${formatDuration(card.usedMinutes, false)} over ${sessionsWord(s.length, false)}`,
  ];
  if (tone === 'detailed' && s.length) {
    lines.push('', ar ? 'الجلسات:' : 'Sessions:');
    s.forEach((x, i) => lines.push(ar ? `${L(i + 1)}) ${L(x.start)} · ${L(x.device)} · ${formatDuration(x.minutes, true)} · ${D(x.downloadMB + x.uploadMB)}` : `${i + 1}) ${x.start} · ${x.device} · ${formatDuration(x.minutes, false)} · ${formatDataSize(x.downloadMB + x.uploadMB)}`));
  }
  if (big && s.length > 1) lines.push('', ar ? `أكبر استهلاك: ${D(big.downloadMB + big.uploadMB)} على جهاز ${L(big.device)} في جلسة واحدة.` : `Biggest session: ${formatDataSize(big.downloadMB + big.uploadMB)} on ${big.device}.`);
  if (downHeavy) lines.push(ar ? 'أغلب الاستهلاك تحميل، مثل مشاهدة الفيديو أو تنزيل الملفات، وهذا ما يجعل الباقة تنتهي أسرع.' : 'Most of it was downloading, such as watching video or downloading files, which makes a package run out faster.');
  lines.push('', ar ? 'شكراً لك.' : 'Thank you.');
  return lines.join('\n');
}
export function buildRenewMessage(card: DemoCard, addedMB: number, lang: Language) {
  const ar = lang === 'ar'; const L = (v: string) => ar ? iso(v.replace(/ /g, '\u00A0')) : v;
  return ar ? `مرحباً، تم تجديد كرتك ${L(card.id)} بإضافة ${L(formatDataSize(addedMB))}.\nالمتبقي الآن: ${L(formatDataSize(remainingMB(card)))}.\nشكراً لك.` : `Hello, your card ${card.id} was renewed with ${formatDataSize(addedMB)}.\nRemaining now: ${formatDataSize(remainingMB(card))}.\nThank you.`;
}
/** Demo renew: adds data to the same card and re-enables it. */
export const renewCard = (card: DemoCard, addMB: number): DemoCard => ({ ...card, limitMB: card.limitMB + addMB, usage: Math.round((card.downloadMB + card.uploadMB) / (card.limitMB + addMB) * 1000) / 10, disabled: false });
export type ManualIdError = 'empty' | 'format' | 'taken';
export const normalizeCardId = (v: string) => v.trim().toUpperCase();
export function validateManualId(existing: DemoCard[], raw: string): ManualIdError | null {
  const id = normalizeCardId(raw); if (!id) return 'empty'; if (!/^[A-Z0-9-]{3,16}$/.test(id)) return 'format';
  return existing.some(c => c.id.toUpperCase() === id) ? 'taken' : null;
}
export const phoneDigits = (v: string) => v.replace(/\D/g, '');
export const whatsappLink = (text: string, phone = '') => `https://wa.me/${phoneDigits(phone)}?text=${encodeURIComponent(text)}`;
export const smsLink = (text: string, phone = '') => `sms:${phone.trim().startsWith('+') ? '+' : ''}${phoneDigits(phone)}?&body=${encodeURIComponent(text)}`;

export const PACKAGE_OPTIONS_MB = [1000, 3000, 5000, 10000] as const;
export type Validity = 'day' | 'week' | 'month' | 'none';
export const VALIDITY_MINUTES: Record<Validity, number> = { day: 1440, week: 10080, month: 43200, none: 0 };
export const MAX_QUICK_ADD = 20;
export const validityLabel = (v: Validity, ar: boolean) => ({ day: ar ? 'يوم' : '1 day', week: ar ? 'أسبوع' : '1 week', month: ar ? 'شهر' : '1 month', none: ar ? 'بدون حد' : 'No limit' })[v];
const validityOf = (minutes: number): Validity => (Object.entries(VALIDITY_MINUTES).find(([, m]) => m === minutes)?.[0] as Validity) ?? 'none';
/** Demo-only: builds unused cards in memory with sequential ids and 8-digit Latin codes. Nothing reaches a router. */
export function createDemoCards(existing: DemoCard[], count: number, limitMB: number, validity: Validity, rand: () => number = Math.random, manualId?: string): DemoCard[] {
  if (manualId) { if (validateManualId(existing, manualId)) return []; return [{ id: normalizeCardId(manualId), active: false, usage: 0, limitMB, downloadMB: 0, uploadMB: 0, usedMinutes: 0, limitMinutes: VALIDITY_MINUTES[validity], code: String(Math.floor(rand() * 9e7) + 1e7), isNew: true }]; }
  const n = Math.max(1, Math.min(MAX_QUICK_ADD, Math.floor(count)));
  let next = Math.max(0, ...existing.map(c => /^DEMO-\d+$/.test(c.id) ? Number(c.id.slice(5)) : 0)) + 1;
  return Array.from({ length: n }, () => ({ id: `DEMO-${String(next++).padStart(3, '0')}`, active: false, usage: 0, limitMB, downloadMB: 0, uploadMB: 0, usedMinutes: 0, limitMinutes: VALIDITY_MINUTES[validity], code: String(Math.floor(rand() * 9e7) + 1e7), isNew: true }));
}
export function buildNewCardMessage(cards: DemoCard[], lang: Language) {
  const ar = lang === 'ar'; const L = (v: string | number) => ar ? iso(String(v).replace(/ /g, '\u00A0')) : String(v);
  const first = cards[0]; if (!first) return '';
  const pkg = L(formatDataSize(first.limitMB)), val = validityLabel(validityOf(first.limitMinutes), ar);
  const head = ar ? (cards.length > 1 ? `مرحباً، هذه كروتك (${L(cards.length)}):` : 'مرحباً، هذا كرتك:') : (cards.length > 1 ? `Hello, here are your ${cards.length} cards:` : 'Hello, here is your card:');
  const rows = cards.map(c => ar ? `• الرقم: ${L(c.id)} · الرمز: ${L(c.code ?? '')}` : `• Number: ${c.id} · Code: ${c.code ?? ''}`);
  const tail = ar ? [`الباقة: ${pkg} · المدة: ${val}`, 'اتصل بالشبكة، ثم أدخل الرمز في صفحة الدخول.', 'شكراً لك.'] : [`Package: ${pkg} · Validity: ${val}`, 'Connect to the network, then enter the code on the login page.', 'Thank you.'];
  return [head, ...rows, ...tail].join('\n');
}
