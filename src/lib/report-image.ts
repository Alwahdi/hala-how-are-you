import { iso, biggestSession, cardState, formatDataSize, formatDuration, remainingMB, remainingRatio, sessionsOf, type DemoCard } from '@/lib/specimen-data';

/** Draws a 1080x1350 customer report in the browser. Demonstration data only; nothing is uploaded. */
export async function renderReportImage(card: DemoCard, ar: boolean): Promise<Blob> {
  await Promise.all([document.fonts?.load(`700 30px Cairo`), document.fonts?.load(`800 40px Manrope`)].map(p => p?.catch(() => undefined))); await document.fonts?.ready;
  const W = 1080, H = 1350, P = 72, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!; const css = getComputedStyle(document.documentElement);
  const v = (n: string, f: string) => css.getPropertyValue(n).trim() || f;
  const bg = v('--background', '#0b0f0d'), card_ = v('--card', '#111814'), fg = v('--foreground', '#eef3ef'), muted = v('--muted-foreground', '#9aa59f'), primary = v('--primary', '#22e58a'), violet = v('--secondary', '#8b5cf6'), warning = v('--warning', '#f5b544'), border = v('--border', '#26302b');
  const font = ar ? 'Cairo, sans-serif' : 'Manrope, sans-serif'; const L = (s: string) => ar ? iso(s) : s;
  const state = cardState(card); const accent = state === 'almostFinished' ? warning : primary;
  const used = card.downloadMB + card.uploadMB; const s = sessionsOf(card); const big = biggestSession(s);
  // background + soft glow + dot mesh
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W / 2, -80, 40, W / 2, -80, 900); g.addColorStop(0, primary); g.addColorStop(1, 'transparent');
  x.globalAlpha = 0.18; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
  x.fillStyle = 'rgba(255,255,255,0.035)'; for (let yy = 0; yy < 420; yy += 18) for (let xx = (yy / 18) % 2 ? 9 : 0; xx < W; xx += 18) { x.beginPath(); x.arc(xx, yy, 2.2, 0, 7); x.fill(); }
  x.direction = ar ? 'rtl' : 'ltr';
  const S = (px: number) => ar ? W - px : px; // start-aligned x
  const E = (px: number) => ar ? px : W - px; // end-aligned x
  const t = (str: string, px: number, y: number, size: number, color: string, weight = 400, align: 'start' | 'end' = 'start') => { x.font = `${weight} ${size}px ${font}`; x.fillStyle = color; x.textAlign = align === 'start' ? (ar ? 'right' : 'left') : (ar ? 'left' : 'right'); x.fillText(str, align === 'start' ? S(px) : E(px), y); };
  const box = (bx: number, by: number, bw: number, bh: number, fill: string, stroke?: string, r = 28) => { x.beginPath(); x.roundRect(ar ? W - bx - bw : bx, by, bw, bh, r); x.fillStyle = fill; x.fill(); if (stroke) { x.strokeStyle = stroke; x.lineWidth = 2; x.stroke(); } };
  const tint = (bx: number, by: number, bw: number, bh: number, color: string, a: number, stroke?: string, r = 22) => { box(bx, by, bw, bh, card_, undefined, r); x.globalAlpha = a; box(bx, by, bw, bh, color, undefined, r); x.globalAlpha = 1; if (stroke) box(bx, by, bw, bh, 'transparent', stroke, r); };
  const bar = (by: number, ratio: number, color: string, h = 20, bx = P, bw = W - 2 * P) => { box(bx, by, bw, h, border, undefined, h / 2); box(bx, by, Math.max(h, bw * Math.max(0, Math.min(1, ratio))), h, color, undefined, h / 2); };
  // header
  x.direction = 'ltr'; x.font = `800 46px Manrope, sans-serif`; x.textAlign = 'left'; const mw = x.measureText('Mikro').width; const lx = ar ? W - P - mw - 14 : P; x.fillStyle = fg; x.fillText('Mikro', lx, 118); x.fillStyle = primary; x.fillText('.', lx + mw, 118); x.direction = ar ? 'rtl' : 'ltr';
  t(ar ? 'تقرير استهلاك الكرت' : 'Card usage report', P, 118, 30, muted, 600, 'end');
  // hero card
  box(P, 165, W - 2 * P, 380, card_, border, 36);
  t(L(card.id), P + 44, 240, 44, fg, 800);
  t(ar ? 'المتبقي' : 'Remaining', P + 44, 300, 28, muted, 600);
  t(L(formatDataSize(remainingMB(card))), P + 44, 400, 104, accent, 800);
  t(`${ar ? 'من باقة' : 'of'} ${L(formatDataSize(card.limitMB))}`, P + 44, 400, 30, muted, 600, 'end');
  bar(450, remainingRatio(card), accent, 24, P + 44, W - 2 * P - 88);
  t(`${ar ? 'استخدمت' : 'Used'} ${L(formatDataSize(used))} · ${formatDuration(card.usedMinutes, ar)}`, P + 44, 515, 28, muted);
  // stats row
  const sw = (W - 2 * P - 32) / 3; const stats: [string, string][] = [[ar ? 'تحميل' : 'Download', formatDataSize(card.downloadMB)], [ar ? 'رفع' : 'Upload', formatDataSize(card.uploadMB)], [ar ? 'الجلسات' : 'Sessions', String(s.length)]];
  stats.forEach(([k, val], i) => { const bx = P + i * (sw + 16); box(bx, 575, sw, 130, card_, border, 24); x.font = `600 26px ${font}`; x.fillStyle = muted; x.textAlign = 'center'; x.fillText(k, (ar ? W - bx - sw / 2 : bx + sw / 2), 625); x.font = `800 40px Manrope, sans-serif`; x.fillStyle = fg; x.direction = 'ltr'; x.fillText(val, (ar ? W - bx - sw / 2 : bx + sw / 2), 680); x.direction = ar ? 'rtl' : 'ltr'; });
  // sessions
  t(ar ? 'الجلسات' : 'Sessions', P, 775, 34, fg, 800);
  let y = 805; const maxS = Math.max(1, ...s.map(z => z.downloadMB + z.uploadMB));
  if (!s.length) t(ar ? 'لا توجد جلسات بعد' : 'No sessions yet', P, y + 50, 28, muted);
  for (const z of s.slice(0, 3)) {
    const isBig = z === big && s.length > 1; const mb = z.downloadMB + z.uploadMB;
    isBig ? tint(P, y, W - 2 * P, 104, violet, 0.16, violet) : box(P, y, W - 2 * P, 104, card_, border, 22);
    t(`${L(z.device)}${isBig ? (ar ? '  · الأكبر' : '  · Biggest') : ''}`, P + 28, y + 44, 28, fg, 700);
    t(L(formatDataSize(mb)), P + 28, y + 44, 28, isBig ? violet : fg, 800, 'end');
    t(`${L(z.start)} · ${formatDuration(z.minutes, ar)}`, P + 28, y + 84, 22, muted);
    bar(y + 70, mb / maxS, isBig ? violet : primary, 10, W / 2 + 40, W / 2 - P - 68);
    y += 120;
  }
  // explanation
  const downHeavy = used > 0 && card.downloadMB / used > 0.7;
  if (used > 0) { tint(P, H - 190, W - 2 * P, 92, accent, 0.12); t(downHeavy ? (ar ? 'أغلب الاستهلاك تحميل، مثل الفيديو، لذلك انتهت الباقة أسرع.' : 'Mostly downloads like video, so the package ran out faster.') : (ar ? 'الاستهلاك موزع بين التحميل والرفع.' : 'Usage is spread across download and upload.'), P + 28, H - 132, 27, fg, 600); }
  t(ar ? 'بيانات تجريبية · أُعد بواسطة Mikro' : 'Demonstration data · Prepared with Mikro', P, H - 48, 22, muted);
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('image')), 'image/png'));
}

/** Shares image + text together where the phone supports it (WhatsApp keeps the text as caption); otherwise downloads the image. */
export async function shareReport(card: DemoCard, ar: boolean, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await renderReportImage(card, ar); const file = new File([blob], `${card.id}-report.png`, { type: 'image/png' });
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return 'shared'; } catch { return 'cancelled'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); return 'downloaded';
}
