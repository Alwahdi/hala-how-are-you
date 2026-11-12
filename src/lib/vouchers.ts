import { z } from "zod";
export const issuanceSchema = z
  .object({
    routerId: z.string().uuid(),
    source: z.enum(["hotspot", "usermanager"]),
    packageName: z.string().regex(/^[\w.@-]{1,32}$/),
    label: z.string().min(1).max(80),
    count: z.number().int().min(1).max(500),
    length: z.number().int().min(6).max(16),
    prefix: z.string().regex(/^[\w-]{0,6}$/),
    suffix: z.string().regex(/^[\w-]{0,6}$/),
    charset: z.enum(["digits", "mixed"]),
    mode: z.enum(["empty", "same", "different"]),
    requestKey: z.string().uuid(),
  })
  .refine((v) => v.length - v.prefix.length - v.suffix.length >= 4, {
    message: "Keep at least four random characters.",
  });
export type IssueInput = z.infer<typeof issuanceSchema>;
export function generateNames(
  v: IssueInput,
  random = (n: number) => crypto.getRandomValues(new Uint32Array(n)),
) {
  const chars = v.charset === "digits" ? "0123456789" : "23456789abcdefghjkmnpqrstuvwxyz";
  const n = v.length - v.prefix.length - v.suffix.length;
  if (chars.length ** n < v.count * 100) throw Error("space_small");
  const names = new Set<string>();
  for (let attempt = 0; names.size < v.count && attempt < v.count * 100; attempt++) {
    const values = random(n);
    let s = "";
    for (const x of values) {
      const ceiling = Math.floor(4294967296 / chars.length) * chars.length;
      if (x < ceiling) s += chars[x % chars.length];
    }
    if (s.length === n) names.add(v.prefix + s + v.suffix);
  }
  if (names.size !== v.count) throw Error("space_small");
  return [...names];
}
export const layoutSchema = z.object({
  width: z.number().min(40).max(190),
  height: z.number().min(20).max(100),
  columns: z.number().int().min(1).max(4),
  rows: z.number().int().min(1).max(12),
  margin: z.number().min(0).max(30),
  gap: z.number().min(0).max(20),
});
export function a4Layout(v: z.infer<typeof layoutSchema>, count: number) {
  layoutSchema.parse(v);
  if (
    v.columns * v.width + (v.columns - 1) * v.gap + 2 * v.margin > 210 ||
    v.rows * v.height + (v.rows - 1) * v.gap + 2 * v.margin > 297
  )
    throw Error("paper_overflow");
  return { perPage: v.columns * v.rows, pages: Math.ceil(count / (v.columns * v.rows)) };
}
export const fieldSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  size: z.number().min(8).max(24),
  visible: z.boolean(),
});
export const templateSchema = z.object({
  kind: z.enum(["bold", "wave", "economy"]),
  tone: z.enum(["teal", "blue", "berry", "amber"]),
  network: z.string().max(60),
  contact: z.string().max(80),
  artwork: z.string().max(250).default(""),
  logo: z.string().max(250).default(""),
  dataOnly: z.boolean(),
  cuts: z.boolean(),
  layout: layoutSchema,
  fields: z.record(z.string(), fieldSchema),
});
export type VoucherTemplate = z.infer<typeof templateSchema>;
export const DEFAULT_TEMPLATE: VoucherTemplate = {
  kind: "bold",
  tone: "teal",
  network: "",
  contact: "",
  artwork: "",
  logo: "",
  dataOnly: false,
  cuts: true,
  layout: { width: 90, height: 40, columns: 2, rows: 6, margin: 10, gap: 3 },
  fields: {
    network: { x: 50, y: 16, size: 15, visible: true },
    price: { x: 84, y: 46, size: 22, visible: true },
    number: { x: 42, y: 48, size: 16, visible: true },
    password: { x: 42, y: 64, size: 11, visible: true },
    facts: { x: 45, y: 81, size: 9, visible: true },
    contact: { x: 45, y: 94, size: 8, visible: true },
  },
};
export type PrintVoucher = { name: string; password: string; facts: string; price: string };
