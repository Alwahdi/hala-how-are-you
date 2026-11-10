export type Language = 'ar' | 'en';
export const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat('en-US', options).format(value);
export const demoCards = [
  { id: 'DEMO-001', active: true, usage: 12.5, limitMB: 2000, downloadMB: 200, uploadMB: 50, usedMinutes: 35, limitMinutes: 240 },
  { id: 'DEMO-002', active: false, usage: 0, limitMB: 1000, downloadMB: 0, uploadMB: 0, usedMinutes: 0, limitMinutes: 120 },
  { id: 'DEMO-003', active: true, usage: 68.2, limitMB: 5000, downloadMB: 3000, uploadMB: 410, usedMinutes: 160, limitMinutes: 360 },
];
export const remainingMB = (card: typeof demoCards[number]) => card.limitMB - card.downloadMB - card.uploadMB;
export const searchCards = (query: string) => demoCards.filter(card => card.id.toLowerCase().includes(query.trim().toLowerCase()));