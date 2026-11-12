import { describe, it, expect } from "vitest";
import { DEFAULT_TEMPLATE, a4Layout, generateNames, issuanceSchema, passwordInput } from "@/lib/vouchers";
import { voucherCommands } from "@/lib/voucher-router";
import { seal, unseal } from "@/lib/voucher-crypto.server";
describe("voucher printing and issuance", () => {
  it("fits 12 cards on A4 210 x 297 and paginates 25 into three pages", () => {
    expect(a4Layout(DEFAULT_TEMPLATE.layout, 25)).toEqual({ perPage: 12, pages: 3 });
    expect(() => a4Layout({ ...DEFAULT_TEMPLATE.layout, width: 110 }, 1)).toThrow("paper_overflow");
  });
  it("generates distinct names preserving a leading zero and suffix", () => {
    let n = 0;
    const v = issuanceSchema.parse({
      routerId: "00000000-0000-4000-8000-000000000001",
      source: "hotspot",
      packageName: "p",
      label: "b",
      count: 10,
      length: 8,
      prefix: "0",
      suffix: "X",
      charset: "digits",
      mode: "same",
      requestKey: "00000000-0000-4000-8000-000000000002",
      hotspotLimits: { bytes: 629145600, time: 18000 },
    });
    const names = generateNames(v, (k) => {
      const a = new Uint32Array(k);
      a[0] = n++;
      return a;
    });
    expect(new Set(names).size).toBe(10);
    expect(names.every((x) => x.length === 8 && x.startsWith("0") && x.endsWith("X"))).toBe(true);
  });
  it("allows a manual leading-zero number only for one card", () => {
    const v = {
      routerId: "00000000-0000-4000-8000-000000000001",
      requestKey: "00000000-0000-4000-8000-000000000002",
      source: "hotspot",
      packageName: "p",
      label: "one",
      count: 1,
      length: 8,
      prefix: "",
      suffix: "",
      charset: "digits",
      mode: "same",
      manualName: "001234",
      hotspotLimits: { bytes: 0, time: 0 },
    };
    expect(generateNames(issuanceSchema.parse(v))).toEqual(["001234"]);
    const passwordConfig=passwordInput(issuanceSchema.parse(v));
    expect(passwordConfig.manualName).toBeUndefined();
    expect(generateNames(passwordConfig, n=>new Uint32Array(n))[0]).toHaveLength(12);
    expect(issuanceSchema.safeParse({ ...v, count: 2 }).success).toBe(false);
    expect(issuanceSchema.safeParse({ ...v, manualName: "bad|command" }).success).toBe(false);
  });
  it("never treats unknown Hotspot limits as unlimited", () => {
    const v = {
      routerId: "00000000-0000-4000-8000-000000000001",
      requestKey: "00000000-0000-4000-8000-000000000002",
      source: "hotspot",
      packageName: "p",
      label: "one",
      count: 1,
      length: 8,
      prefix: "",
      suffix: "",
      charset: "digits",
      mode: "same",
    };
    expect(issuanceSchema.safeParse(v).success).toBe(false);
    expect(
      issuanceSchema.parse({ ...v, hotspotLimits: { bytes: 629145600, time: 18000 } })
        .hotspotLimits,
    ).toEqual({ bytes: 629145600, time: 18000 });
  });
  it("encrypts reprint credentials and authenticates their item binding", async () => {
    const encrypted = await seal("test-voucher-only", "test-encryption-only", "item-1");
    expect(encrypted).not.toContain("test-voucher-only");
    expect(await unseal(encrypted, "test-encryption-only", "item-1")).toBe("test-voucher-only");
    await expect(unseal(encrypted, "test-encryption-only", "item-2")).rejects.toThrow();
  });
  it("does not overwrite existing accounts and supports both manager menu versions", () => {
    const hs = voucherCommands(
      "hotspot",
      "7",
      "001",
      "",
      "basic",
      "vc-test",
      600 * 1024 * 1024,
      18000,
    );
    expect(hs).toContain("limit-bytes-total=629145600");
    expect(hs).toContain("limit-uptime=18000s");
    expect(hs).toContain(':error "exists"');
    expect(hs).toContain("mikro-issued-vc-test");
    expect(hs).toContain("credentials_changed");
    expect(hs).not.toContain("get $u comment");
    expect(voucherCommands("usermanager", "6", "001", "test", "basic", "vc-test", 0, 0)).toContain(
      "/tool user-manager user",
    );
    expect(voucherCommands("usermanager", "7", "001", "test", "basic", "vc-test", 0, 0)).toContain(
      "/user-manager user-profile",
    );
    expect(() =>
      voucherCommands("hotspot", "7", 'bad"', "test", "basic", "vc-test", 0, 0),
    ).toThrow();
  });
});
