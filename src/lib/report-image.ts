import { iso, cardState, formatDataSize, formatDuration, remainingMB, remainingRatio, sessionsOf, type DemoCard } from '@/lib/specimen-data';

/** Draws a 1080x1350 customer report in the browser. Demonstration data only; nothing is uploaded. */
export async function renderReportImage(card: DemoCard, ar: boolean): Promise<Blob> {
  await document.fonts?.ready;
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!; const css = getComputedStyle(document.documentElement);
  const v = (n: string, f: string) => css.getPropertyValue(n).trim() || f;
  const bg = v('--background', '#0b0f0d'), fg = v('--foreground', '#eef3ef'), muted = v('--muted-foreground', '#9aa59f'), primary = v('--primary', '#22e58a'), warning = v('--warning', '#f5b544'), border = v('--border', '#26302b');
  const font = ar ? 'Cairo, sans-serif' : 'Manrope, sans-serif';
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.direction = ar ? 'rtl' : 'ltr'; x.textAlign = ar ? 'right' : 'left';
  const X = ar ? W - 80 : 80;
  const text = (s: string, y: number, size: number, color: string, weight = 400) => { x.font = `${weight} ${size}px ${font}`; x.fillStyle = color; x.fillText(s, X, y); };
  const state = cardState(card); const L = (v: string) => ar ? iso(v) : v;
  text('Mikro.', 120, 44, primary, 800);
  text(ar ? 'تقرير الكرت · بيانات تجريبية' : 'Card report · Demonstration data', 175, 28, muted);
  text(L(card.id), 290, 88, fg, 800);
  text(L(formatDataSize(remainingMB(card))), 420, 110, state === 'almostFinished' ? warning : primary, 800);
  text(`${ar ? 'متبقي من' : 'left of'} ${L(formatDataSize(card.limitMB))} · ${formatDuration(card.usedMinutes, ar)}`, 480, 32, muted);
  x.fillStyle = border; x.beginPath(); x.roundRect(80, 520, W - 160, 26, 13); x.fill();
  const w = (W - 160) * remainingRatio(card); x.fillStyle = state === 'almostFinished' ? warning : primary; x.beginPath(); x.roundRect(ar ? W - 80 - w : 80, 520, Math.max(w, 26), 26, 13); x.fill();
  text(ar ? 'الجلسات' : 'Sessions', 640, 40, fg, 700);
  let y = 710;
  for (const s of sessionsOf(card).slice(0, 6)) { text(`${L(s.start)} · ${L(s.device)}`, y, 30, fg, 600); text(`${formatDuration(s.minutes, ar)} · ${L(formatDataSize(s.downloadMB + s.uploadMB))}`, y + 44, 28, muted); y += 110; }
  if (!sessionsOf(card).length) text(ar ? 'لا توجد جلسات بعد' : 'No sessions yet', y, 30, muted);
  text(ar ? 'أُعد بواسطة Mikro' : 'Prepared with Mikro', H - 70, 26, muted);
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('image')), 'image/png'));
}
