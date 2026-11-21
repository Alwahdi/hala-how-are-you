import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { printHtml } from "./print";
import { assessment, duration } from "./records";
import { Issue, Card } from "./types";
const make = (): Issue => ({
  id: "synthetic-issue",
  routerId: "fixture",
  plan: {
    routerId: "fixture",
    source: "hotspot",
    id: "*P1",
    name: "<script>sample</script>",
    fingerprint: "sample",
    bytes: 600000000,
    seconds: 18000,
    validity: "2d",
    supported: true,
  },
  name: "00123874",
  password: randomBytes(18).toString("hex"),
  bytes: 600000000,
  seconds: 18000,
  state: "confirmed",
  createdAt: Date.now(),
});
describe("voucher output", () => {
  it("escapes plan text and embeds an offline QR without an external asset", () => {
    const issue = make(),
      html = printHtml(issue, "ar");
    expect(html).toContain("&lt;script&gt;sample");
    expect(html).not.toContain("<script>sample");
    expect(html).toContain("<svg");
    expect(/(?:src|href)=["']https?:|url\(["']?https?:/.test(html)).toBe(false);
    expect(html).toContain(issue.name);
  });
  it("QR is unchanged when the password changes because it contains only the number", () => {
    const issue = make(),
      first = printHtml(issue, "ar").match(/<svg[\s\S]*?<\/svg>/)![0];
    issue.password = randomBytes(18).toString("hex");
    expect(printHtml(issue, "en").match(/<svg[\s\S]*?<\/svg>/)![0]).toBe(first);
  });
  it.each(["unknown", "partial", "invalidated", "rejected"] as const)(
    "refuses to output %s credentials",
    (state) => expect(() => printHtml({ ...make(), state }, "ar")).toThrow("unknown"),
  );
});
describe("readings do not invent an expiry cause", () => {
  const base: Card = {
    routerId: "fixture",
    source: "hotspot",
    id: "*U1",
    name: "00123874",
    plan: "sample",
    usedBytes: 100,
    limitBytes: 600,
    usedSeconds: 300,
    limitSeconds: 300,
    disabled: false,
    validity: "valid",
    readAt: 0,
  };
  it("distinguishes time and calendar expiry while data remains", () => {
    expect(assessment(base, "ar").reasons).toEqual(["انتهى وقت الاتصال"]);
    expect(assessment({ ...base, validity: "expired" }, "ar").reasons).toHaveLength(2);
  });
  it("does not interpret unavailable counters as zero", () => {
    expect(
      assessment(
        {
          ...base,
          usedBytes: null,
          limitBytes: null,
          usedSeconds: null,
          limitSeconds: null,
          validity: "unknown",
        },
        "ar",
      ),
    ).toMatchObject({ unknown: true, remaining: null, reasons: [] });
  });
  it.each([
    ["1w2d3h4m5s", 788645],
    ["2d03:04:05", 183845],
    ["00:10:00", 600],
    ["unlimited", null],
    ["bad", null],
  ])("parses %s explicitly", (input, seconds) => expect(duration(input as string)).toBe(seconds));
});
