import { describe, expect, it, vi } from "vitest";
import { Buffer } from "buffer";
import { Decoder, encode, encodeLength } from "./codec";
import { RouterClient, Wire } from "./client";
import { endpoint, latin } from "./endpoint";
class TestWire implements Wire {
  sent: Uint8Array[] = [];
  closed = false;
  data = (_b: Uint8Array) => {};
  error = () => {};
  write(data: Uint8Array) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
  onData(fn: (b: Uint8Array) => void) {
    this.data = fn;
  }
  onError(fn: () => void) {
    this.error = fn;
  }
}
describe("RouterOS framing", () => {
  it.each([0, 1, 127, 128, 16383, 16384, 1048500])("roundtrips word length %i", (length) => {
    const d = new Decoder(),
      words = ["!re", "=value=" + "x".repeat(length)];
    expect(d.push(encode(words))).toEqual([words]);
  });
  it("reassembles one-byte chunks including Arabic UTF-8", () => {
    const d = new Decoder(),
      words = ["!re", "=name=شبكة اختبار", "=value=a=b"];
    const out: string[][] = [];
    for (const byte of encode(words)) out.push(...d.push(Uint8Array.from([byte])));
    expect(out).toEqual([words]);
  });
  it("retains partial sentences after complete replies", () => {
    const d = new Decoder(),
      a = encode(["!re", "=name=one"]),
      b = encode(["!done"]);
    expect(d.push(Buffer.concat([Buffer.from(a), Buffer.from(b.subarray(0, 2))]))).toEqual([
      ["!re", "=name=one"],
    ]);
    expect(d.push(b.subarray(2))).toEqual([["!done"]]);
  });
  it("rejects reserved prefixes and oversized buffers", () => {
    expect(() => new Decoder().push(Uint8Array.from([0xf8]))).toThrow("protocol");
    expect(() => encodeLength(-1)).toThrow();
    expect(() => new Decoder().push(new Uint8Array(1048577))).toThrow("protocol");
  });
});
describe("endpoint input", () => {
  it("preserves an explicitly pasted web port while removing path and scheme", () =>
    expect(endpoint("https://router.example.net:443/webfig?q=1", "8729")).toEqual({
      host: "router.example.net",
      port: 443,
      explicitPort: true,
    }));
  it("normalizes Arabic and Persian digits but preserves zeroes in card input", () => {
    expect(endpoint("http://١٩٢.١٦٨.٨٨.١/", "۸۷۲۸").port).toBe(8728);
    expect(latin("٠٠١٢٣٨٧٤")).toBe("00123874");
  });
  it("accepts bracketed IPv6 with a custom API port", () =>
    expect(endpoint("[2001:db8::1]:8778").host).toBe("2001:db8::1"));
  it.each([
    "https://user:secret@example.net",
    "file://example.net",
    "999.1.1.1",
    "192.168.001.1",
    "host with space",
    "[bad::ipv6]",
    "router.example.net:",
  ])("rejects ambiguous or embedded-login input: %s", (input) =>
    expect(() => endpoint(input)).toThrow(),
  );
  it.each(["0", "65536", "-1", "abc"])("rejects invalid port %s", (port) =>
    expect(() => endpoint("router.example.net", port)).toThrow("port"),
  );
});
describe("client command lifecycle", () => {
  it("collects rows and ignores other tags", async () => {
    const wire = new TestWire(),
      client = new RouterClient(wire),
      result = client.request(["/read"]);
    wire.data(encode(["!re", "=name=other", ".tag=99"]));
    wire.data(encode(["!re", "=name=correct", ".tag=1"]));
    wire.data(encode(["!done", ".tag=1"]));
    expect(await result).toEqual([{ name: "correct" }]);
    client.close();
  });
  it("waits for done after a trap and rejects the command", async () => {
    const wire = new TestWire(),
      client = new RouterClient(wire),
      result = client.request(["/read"]);
    const assertion = expect(result).rejects.toMatchObject({ code: "rejected" });
    wire.data(encode(["!trap", "=message=denied"]));
    wire.data(encode(["!done"]));
    await assertion;
    client.close();
  });
  it("distinguishes login rejection and an obsolete challenge", async () => {
    for (const legacy of [false, true]) {
      const wire = new TestWire(),
        client = new RouterClient(wire),
        result = client.login("test-user", "not-a-real-router-credential");
      const assertion = expect(result).rejects.toMatchObject({
        code: legacy ? "legacy-login" : "auth",
      });
      if (!legacy) wire.data(encode(["!trap"]));
      wire.data(encode(legacy ? ["!done", "=ret=challenge"] : ["!done"]));
      await assertion;
      client.close();
    }
  });
  it("does not send after an already-aborted request", async () => {
    const wire = new TestWire(),
      client = new RouterClient(wire),
      controller = new AbortController();
    controller.abort();
    await expect(client.request(["/read"], controller.signal)).rejects.toMatchObject({
      code: "cancelled",
    });
    expect(wire.sent).toHaveLength(0);
    client.close();
  });
  it("closes on timeout without retrying the command", async () => {
    vi.useFakeTimers();
    try {
      const wire = new TestWire(),
        client = new RouterClient(wire, 100),
        result = client.request(["/write"]);
      const assertion = expect(result).rejects.toMatchObject({ code: "timeout" });
      await vi.advanceTimersByTimeAsync(110);
      await assertion;
      expect(wire.sent).toHaveLength(1);
      expect(wire.closed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
  it("rejects overlapping commands rather than mixing replies", async () => {
    const wire = new TestWire(),
      client = new RouterClient(wire),
      first = client.request(["/one"]);
    await expect(client.request(["/two"])).rejects.toMatchObject({ code: "busy" });
    wire.data(encode(["!done"]));
    await first;
    client.close();
  });
});
