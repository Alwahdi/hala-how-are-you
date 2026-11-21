import createQr from "qrcode-generator";
import { Issue, Language, PilotError } from "./types";
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
export function printHtml(issue: Issue, language: Language, fontBase64 = ""): string {
  if (issue.state !== "confirmed") throw new PilotError("unknown");
  const qr = createQr(0, "M");
  qr.addData(issue.name, "Byte");
  qr.make();
  const ar = language === "ar",
    t = (a: string, e: string) => (ar ? a : e);
  return `<!doctype html><html lang="${ar ? "ar" : "en"}" dir="${ar ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>${fontBase64 ? `@font-face{font-family:Cairo;src:url(data:font/ttf;base64,${fontBase64})}` : ""}@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font:16px Cairo,Arial,sans-serif;color:#14271b;background:#fff}article{width:88mm;min-height:52mm;border:1px solid #315235;border-radius:4mm;padding:5mm;break-inside:avoid;background:#f0f7e7}h1{font-size:18px;margin:0 0 3mm}p{margin:2mm 0;overflow-wrap:anywhere}.number{font:700 25px Arial;direction:ltr;unicode-bidi:isolate}svg{width:22mm;height:22mm}footer{font-size:11px;margin-top:5mm}</style></head><body><article>${issue.demo ? "<p>DEMO · بيانات توضيحية، ليست كرتًا حقيقيًا</p>" : ""}<h1>${escape(issue.plan.name)}</h1><p>${t("رقم الدخول", "Login number")}</p><p class="number">${escape(issue.name)}</p><p>${t("كلمة المرور", "Password")}: <bdi dir="ltr">${escape(issue.password)}</bdi></p><p>${t("النظام", "Source")}: ${escape(issue.plan.source === "hotspot" ? "Hotspot" : "User Manager")}</p><p>${t("الحجم", "Data")}: ${issue.bytes === null ? t("حسب الباقة", "As configured in plan") : issue.bytes / 1e6 + " MB"}</p><p>${t("وقت الاتصال", "Online time")}: ${issue.seconds === null ? t("حسب الباقة", "As configured in plan") : issue.seconds / 60 + t(" دقيقة", " minutes")}</p><p>${t("الصلاحية", "Validity")}: ${escape(issue.plan.validity || t("حسب إعدادات الباقة؛ غير مؤكدة من القراءة", "As configured; not established by this reading"))}</p>${qr.createSvgTag({ cellSize: 3, margin: 4, scalable: true })}<p>${t("QR يحتوي رقم الكرت فقط", "QR contains only the voucher number")}</p></article><footer>${t("مرجع الإصدار", "Issue reference")}: ${escape(issue.id)}</footer></body></html>`;
}
