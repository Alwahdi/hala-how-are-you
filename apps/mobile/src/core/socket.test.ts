import { createServer, createConnection } from "node:net";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { RouterClient, Wire } from "./client";
import { Decoder, encode } from "./codec";
describe("real loopback TCP framing", () => {
  it("authenticates then reads a reply fragmented across TCP writes", async () => {
    const secret = randomBytes(18).toString("hex");
    let logins = 0;
    const server = createServer((socket) => {
      const decoder = new Decoder();
      socket.on("error", () => {});
      socket.on("data", (chunk) => {
        for (const words of decoder.push(chunk)) {
          const tag = words.find((w) => w.startsWith(".tag="))!;
          if (words[0] === "/login") {
            logins++;
            if (!words.includes("=password=" + secret)) socket.write(encode(["!trap", tag]));
            socket.write(encode(["!done", tag]));
          } else {
            const payload = encode(["!re", "=version=7.fixture", tag]);
            socket.write(payload.subarray(0, 3));
            setTimeout(
              () =>
                socket.write(
                  Buffer.concat([
                    Buffer.from(payload.subarray(3)),
                    Buffer.from(encode(["!done", tag])),
                  ]),
                ),
              2,
            );
          }
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw Error("fixture");
    const socket = createConnection(address.port, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", reject);
    });
    const wire: Wire = {
      write: (bytes) => {
        socket.write(bytes);
      },
      close: () => socket.destroy(),
      onData: (fn) => {
        socket.on("data", fn);
      },
      onError: (fn) => {
        socket.on("error", fn);
        socket.on("close", fn);
      },
    };
    const client = new RouterClient(wire);
    try {
      await client.login("fixture-user", secret);
      expect(await client.request(["/system/resource/print"])).toEqual([{ version: "7.fixture" }]);
      expect(logins).toBe(1);
    } finally {
      client.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
