import { useRef } from "react";
import { type VoucherTemplate, type PrintVoucher } from "@/lib/vouchers";
export function VoucherPreview({
  template: t,
  card,
  artwork = "",
  logo = "",
  onMove,
}: {
  template: VoucherTemplate;
  card: PrintVoucher;
  artwork?: string;
  logo?: string;
  onMove?: (field: string, x: number, y: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const values: Record<string, string> = {
    network: t.network || "Mikro",
    price: card.price,
    number: card.name,
    password: card.password ? `PIN: ${card.password}` : "",
    facts: card.facts,
    contact: t.contact,
  };
  return (
    <div
      ref={ref}
      className={`voucher-preview voucher-${t.kind} voucher-${t.tone} ${t.dataOnly ? "voucher-data-only" : ""}`}
      style={{ aspectRatio: `${t.layout.width}/${t.layout.height}` }}
    >
      {!t.dataOnly && artwork && <img className="voucher-artwork" src={artwork} alt="" />}
      {!t.dataOnly && logo && <img className="voucher-logo" src={logo} alt="" />}
      {Object.entries(t.fields).map(([key, f]) =>
        f.visible && values[key] ? (
          <span
            key={key}
            className={`voucher-field ${key === "number" ? "voucher-number" : ""} ${!artwork && !t.dataOnly && t.kind !== "economy" && f.x > 72 ? "voucher-inverse" : ""}`}
            dir="auto"
            style={{ left: `${f.x}%`, top: `${f.y}%`, fontSize: `${f.size / 2.7}cqw` }}
            onPointerDown={(e) => {
              if (!onMove) return;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!onMove || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
              const rect = ref.current?.getBoundingClientRect();
              if (rect)
                onMove(
                  key,
                  Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100)),
                  Math.max(8, Math.min(94, ((e.clientY - rect.top) / rect.height) * 100)),
                );
            }}
          >
            {values[key]}
          </span>
        ) : null,
      )}
    </div>
  );
}
