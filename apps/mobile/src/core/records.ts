import { Card, Language } from "./types";
export function numberOrNull(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}
export function duration(value: string | undefined): number | null {
  if (value === undefined || !value.trim() || ["none", "unlimited", "never"].includes(value))
    return null;
  let rest = value.trim(),
    total = 0;
  rest = rest.replace(/(\d+)(w|d|h|m|s)/g, (_, n: string, unit: string) => {
    total += Number(n) * ({ w: 604800, d: 86400, h: 3600, m: 60, s: 1 }[unit] || 0);
    return "";
  });
  if (rest) {
    const clock = /^(\d+):(\d{2}):(\d{2})$/.exec(rest);
    if (!clock || Number(clock[2]) >= 60 || Number(clock[3]) >= 60) return null;
    total += Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
  }
  return Number.isSafeInteger(total) ? total : null;
}
export const knownLimit = (n: number | null) => (n !== null && n > 0 ? n : null);
export function assessment(card: Card, lang: Language) {
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en),
    reasons: string[] = [];
  if (
    card.usedBytes !== null &&
    card.limitBytes !== null &&
    card.limitBytes > 0 &&
    card.usedBytes >= card.limitBytes
  )
    reasons.push(t("اكتمل حجم الإنترنت", "Data allowance used up"));
  if (
    card.usedSeconds !== null &&
    card.limitSeconds !== null &&
    card.limitSeconds > 0 &&
    card.usedSeconds >= card.limitSeconds
  )
    reasons.push(t("انتهى وقت الاتصال", "Online time used up"));
  if (card.validity === "expired") reasons.push(t("انتهت صلاحية الكرت", "Validity expired"));
  if (card.disabled) reasons.push(t("الكرت موقوف عن الدخول", "Voucher login disabled"));
  const unknown =
    [card.usedBytes, card.limitBytes, card.usedSeconds, card.limitSeconds].some(
      (n) => n === null,
    ) || card.validity === "unknown";
  const summary = reasons.length
    ? reasons.join(t("، و", ", and "))
    : unknown
      ? t(
          "القراءة لا تكفي لتحديد سبب توقف الكرت.",
          "The reading does not establish why this voucher stopped.",
        )
      : t(
          "لم يظهر حد مستنفد في هذه القراءة؛ هذا لا يضمن نجاح الدخول.",
          "No exhausted limit appears in this reading; this does not guarantee login.",
        );
  const remaining =
    card.usedBytes !== null && card.limitBytes !== null && card.limitBytes > 0
      ? Math.max(0, card.limitBytes - card.usedBytes)
      : null;
  return { summary, reasons, remaining, unknown };
}
export function dataLabel(bytes: number | null) {
  if (bytes === null) return "—";
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + " GB";
  return (bytes / 1e6).toFixed(1) + " MB";
}
