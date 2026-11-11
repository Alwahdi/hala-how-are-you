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
