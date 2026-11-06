export type Language = 'ar' | 'en';
export const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat('en-US', options).format(value);
export const demoCards = [
  { id: 'DEMO-001', active: true, usage: 12.5 },
  { id: 'DEMO-002', active: false, usage: 0 },
  { id: 'DEMO-003', active: true, usage: 68.2 },
];
export const searchCards = (query: string) => demoCards.filter(card => card.id.toLowerCase().includes(query.trim().toLowerCase()));