import { jsPDF } from "jspdf";
import fontAsset from "@/assets/voucher-cairo-complete.ttf.asset.json";
import { a4Layout, type VoucherTemplate, type PrintVoucher } from "./vouchers";
export async function voucherPdf(
  t: VoucherTemplate,
  cards: PrintVoucher[],
  artwork = "",
  logo = "",
  options: { signal?: AbortSignal; progress?: (n: number, total: number) => void } = {},
) {
  const { perPage } = a4Layout(t.layout, cards.length);
  const pdf = new jsPDF({ format: "a4", unit: "mm" });
  const response = await fetch(fontAsset.url);
  if (!response.ok) throw Error("font_failed");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (const v of bytes) binary += String.fromCharCode(v);
  pdf.addFileToVFS("Cairo.ttf", btoa(binary));
  pdf.addFont("Cairo.ttf", "Cairo", "normal");
  const palette = {
    teal: [0, 126, 123],
    blue: [35, 88, 189],
    berry: [142, 37, 76],
    amber: [163, 95, 0],
  } as const;
  const tone = palette[t.tone];
  for (const [index, c] of cards.entries()) {
    if (options.signal?.aborted) throw Error("cancelled");
    if (index % 24 === 0) {
      options.progress?.(index, cards.length);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (index && index % perPage === 0) pdf.addPage();
    const n = index % perPage;
    const { width: w, height: h, margin, gap, columns } = t.layout;
    const x = margin + (n % columns) * (w + gap),
      y = margin + Math.floor(n / columns) * (h + gap);
    if (!t.dataOnly) {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(x, y, w, h, "F");
      if (artwork) pdf.addImage(artwork, x, y, w, h);
      else if (t.kind !== "economy") {
        pdf.setFillColor(tone[0], tone[1], tone[2]);
        pdf.rect(x + w * 0.72, y, w * 0.28, h, "F");
        if (t.kind === "wave") pdf.ellipse(x + w * 0.75, y + h * 0.5, w * 0.18, h * 0.7, "F");
      }
      pdf.setDrawColor(tone[0], tone[1], tone[2]);
      pdf.setLineWidth(0.25);
      pdf.roundedRect(x + w * 0.04, y + h * 0.34, w * 0.62, h * 0.27, 2, 2, "S");
      if (logo) pdf.addImage(logo, x + w * 0.02, y + h * 0.04, w * 0.12, h * 0.22);
    }
    const values: Record<string, string> = {
      network: t.network,
      price: c.price,
      number: c.name,
      password: c.password ? `PIN: ${c.password}` : "",
      facts: c.facts,
      contact: t.contact,
    };
    for (const [field, f] of Object.entries(t.fields)) {
      if (!f.visible || !values[field]) continue;
      pdf.setFont("Cairo");
      const text = pdf.processArabic(values[field] ?? "");
      const max = w * (field === "price" ? 0.25 : 0.86);
      let size = f.size;
      pdf.setFontSize(size);
      while (pdf.getTextWidth(text) > max && size > 6) {
        pdf.setFontSize(--size);
      }
      const inverse = !t.dataOnly && !artwork && t.kind !== "economy" && f.x > 72;
      pdf.setTextColor(...((inverse ? [255, 255, 255] : [20, 25, 25]) as [number, number, number]));
      pdf.text(text, x + (w * f.x) / 100, y + (h * f.y) / 100, {
        align: "center",
        baseline: "middle",
      });
    }
    if (t.cuts) {
      pdf.setDrawColor(150);
      pdf.setLineDashPattern([1, 1], 0);
      pdf.rect(x, y, w, h);
      pdf.setLineDashPattern([], 0);
    }
  }
  options.progress?.(cards.length, cards.length);
  return pdf;
}
