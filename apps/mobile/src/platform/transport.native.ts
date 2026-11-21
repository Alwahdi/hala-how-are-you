import { NativeModules } from "react-native";
import { Buffer } from "buffer";
import type Tcp from "react-native-tcp-socket";
import { Wire, RouterClient } from "../core/client";
import { Decoder, encode } from "../core/codec";
import { Endpoint, PilotError, Router } from "../core/types";
import { LiveGateway, routerIdentity } from "../core/gateway";
export function nativeAvailable() {
  return !!NativeModules.TcpSockets;
}
function tcp(): typeof Tcp {
  if (!nativeAvailable()) throw new PilotError("unsupported");
  // Load after the availability check so Expo Go can open the isolated demo.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require("react-native-tcp-socket");
  return module.default || module;
}
async function wire(
  target: Endpoint,
  protectedConnection: boolean,
  signal?: AbortSignal,
): Promise<Wire> {
  if (signal?.aborted) throw new PilotError("cancelled");
  const sockets = tcp();
  return new Promise((resolve, reject) => {
    let settled = false,
      closed = false,
      receive: ((data: Uint8Array) => void) | undefined,
      disconnected: (() => void) | undefined;
    const options = {
      host: target.host,
      port: target.port,
      rejectUnauthorized: true,
      connectTimeout: 5000,
    };
    const socket = protectedConnection
      ? sockets.connectTLS(options)
      : sockets.createConnection(options, () => {});
    const end = () => {
      closed = true;
      socket.destroy();
    };
    const fail = (error: PilotError) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        end();
        reject(error);
      } else {
        closed = true;
        disconnected?.();
      }
    };
    const abort = () => fail(new PilotError("cancelled"));
    const timer = setTimeout(() => fail(new PilotError("timeout")), 6500);
    signal?.addEventListener("abort", abort, { once: true });
    socket.on("error", (error: unknown) => {
      const message = String(error);
      fail(
        new PilotError(
          /certificate|ssl|tls|trust|hostname|CertPath/i.test(message)
            ? "certificate"
            : "unreachable",
        ),
      );
    });
    socket.on("close", () => fail(new PilotError("unreachable")));
    socket.on("data", (data) =>
      receive?.(typeof data === "string" ? Buffer.from(data) : new Uint8Array(data)),
    );
    socket.once(protectedConnection ? "secureConnect" : "connect", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      resolve({
        write: (bytes) => {
          if (closed) throw new PilotError("lost");
          socket.write(Buffer.from(bytes));
        },
        close: end,
        onData: (fn) => {
          receive = fn;
        },
        onError: (fn) => {
          disconnected = fn;
          if (closed) fn();
        },
      });
    });
  });
}
async function isPlainApi(target: Endpoint, signal?: AbortSignal) {
  let connection: Wire | undefined;
  try {
    connection = await wire(target, false, signal);
    return await new Promise<boolean>((resolve) => {
      const decoder = new Decoder();
      let finished = false;
      const done = (value: boolean) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        resolve(value);
      };
      const timer = setTimeout(() => done(false), 2000),
        abort = () => done(false);
      signal?.addEventListener("abort", abort, { once: true });
      connection!.onError(() => done(false));
      connection!.onData((data) => {
        try {
          const sentences = decoder.push(data);
          if (sentences.length)
            done(sentences.some((words) => ["!done", "!trap", "!fatal"].includes(words[0] || "")));
        } catch {
          done(false);
        }
      });
      connection!.write(encode(["/login"]));
    });
  } catch {
    if (signal?.aborted) throw new PilotError("cancelled");
    return false;
  } finally {
    connection?.close();
  }
}
export async function connectLive(
  target: Endpoint,
  credentials: { user: string; password: string },
  consentPlain: (target: Endpoint) => Promise<boolean>,
  signal?: AbortSignal,
  expectedId?: string,
): Promise<LiveGateway> {
  let protectedConnection = true,
    actual = target,
    initial: Wire | undefined;
  if (target.port !== 8729 && (await isPlainApi(target, signal))) protectedConnection = false;
  if (protectedConnection) {
    try {
      initial = await wire(target, true, signal);
    } catch (error) {
      if (
        !(error instanceof PilotError) ||
        error.code === "certificate" ||
        error.code === "cancelled" ||
        target.explicitPort ||
        target.port !== 8729
      )
        throw error;
      const fallback = { ...target, port: 8728 };
      if (!(await isPlainApi(fallback, signal))) throw error;
      protectedConnection = false;
      actual = fallback;
    }
  }
  if (!protectedConnection && !(await consentPlain(actual))) throw new PilotError("cancelled");
  const open = async () => {
    const client = new RouterClient(await wire(actual, protectedConnection, signal));
    try {
      await client.login(credentials.user, credentials.password, signal);
      return client;
    } catch (error) {
      client.close();
      throw error;
    }
  };
  let client: RouterClient | undefined;
  try {
    client = initial
      ? new RouterClient(initial)
      : new RouterClient(await wire(actual, false, signal));
    await client.login(credentials.user, credentials.password, signal);
    const identity = await routerIdentity(client);
    if (expectedId && identity.id !== expectedId) throw new PilotError("identity");
    const router: Router = { ...identity, endpoint: actual, protected: protectedConnection };
    return new LiveGateway(router, open);
  } finally {
    client?.close();
  }
}
