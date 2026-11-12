import { describe, expect, it } from "vitest";
import { MAX_VOUCHERS, issuanceSchema, issuanceHold, a4Layout, DEFAULT_TEMPLATE, generateNames } from "@/lib/vouchers";
import { collectPages } from "@/lib/voucher-pages";
const input = { routerId: "00000000-0000-4000-8000-000000000001", requestKey: "00000000-0000-4000-8000-000000000002", source: "hotspot", packageName: "basic", label: "batch", count: 1500, length: 8, prefix: "", suffix: "", charset: "digits", mode: "same", hotspotLimits: { bytes: 629145600, time: 18000 } };
describe("large voucher safety", () => {
  it("accepts 1500 and rejects 1501", () => {
    expect(MAX_VOUCHERS).toBe(1500);
    expect(issuanceSchema.safeParse(input).success).toBe(true);
    expect(issuanceSchema.safeParse({ ...input, count: 1501 }).success).toBe(false);
  });
  it("generates 1500 unique leading-zero numbers", () => {
    const v = issuanceSchema.parse({ ...input, prefix: "0", length: 9 });
    const names = generateNames(v);
    expect(new Set(names).size).toBe(1500);
    expect(names.every(s => s.startsWith("0"))).toBe(true);
  });
  it("rejects a too-small namespace before issuance", () => {
    expect(issuanceSchema.safeParse({ ...input, length: 6, prefix: "00" }).success).toBe(false);
  });
  it("fits 1500 in 125 A4 pages and 1000 in 84", () => {
    expect(a4Layout(DEFAULT_TEMPLATE.layout, 1500).pages).toBe(125);
    expect(a4Layout(DEFAULT_TEMPLATE.layout, 1000).pages).toBe(84);
  });
  it("reads all 1500 through bounded pages", async () => {
    const rows = Array.from({ length: 1500 }, (_, i) => i);
    expect(await collectPages(async offset => ({ rows: rows.slice(offset, offset + 100), total: 1500 }))).toEqual(rows);
  });
  it("fails rather than silently downloading truncated rows", async () => {
    await expect(collectPages(async offset => ({ rows: offset === 0 ? [1, 2] : [], total: 3 }))).rejects.toThrow("incomplete_read");
  });
  it("detects changing archive counts", async () => {
    await expect(collectPages(async offset => ({ rows: [1], total: offset ? 3 : 2 }))).rejects.toThrow("count_changed");
  });
  it("holds when CPU reaches 80 percent", () => {
    const now = Date.now(); const seen = new Date(now).toISOString();
    const s = { voucherProtocol: 4, cpu: 80, freeMemory: 33554432, freeHdd: 8388608 };
    expect(issuanceHold(s, seen, now)).toBe("cpu");
    expect(issuanceHold({ ...s, cpu: 79 }, seen, now)).toBe(null);
  });
  it("does not dispatch to stale or old scripts", () => {
    const now = Date.now(); const s = { voucherProtocol: 4, cpu: 1, freeMemory: 33554432, freeHdd: 8388608 };
    expect(issuanceHold(s, new Date(now - 90001).toISOString(), now)).toBe("offline");
    expect(issuanceHold({ ...s, voucherProtocol: 2 }, new Date(now).toISOString(), now)).toBe("upgrade");
  });
});