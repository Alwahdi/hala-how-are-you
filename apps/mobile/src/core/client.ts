import { Decoder, encode, row } from "./codec";
import { Api, PilotError, Row } from "./types";
export interface Wire {
  write(bytes: Uint8Array): void;
  close(): void;
  onData(fn: (data: Uint8Array) => void): void;
  onError(fn: () => void): void;
}
export class RouterClient implements Api {
  private decoder = new Decoder();
  private closed = false;
  private serial = 0;
  private pending: {
    tag: string;
    rows: Row[];
    trapped: boolean;
    login: boolean;
    finish: (error?: PilotError) => void;
  } | null = null;
  constructor(
    private wire: Wire,
    private timeoutMs = 10000,
  ) {
    wire.onData((data) => {
      try {
        for (const words of this.decoder.push(data)) this.receive(words);
      } catch {
        this.fail("protocol");
      }
    });
    wire.onError(() => this.fail("lost"));
  }
  async login(user: string, password: string, signal?: AbortSignal) {
    await this.request(["/login", "=name=" + user, "=password=" + password], signal);
  }
  request(words: string[], signal?: AbortSignal): Promise<Row[]> {
    if (this.closed) return Promise.reject(new PilotError("lost"));
    if (this.pending) return Promise.reject(new PilotError("busy"));
    if (signal?.aborted) return Promise.reject(new PilotError("cancelled"));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail("timeout"), this.timeoutMs);
      const abort = () => this.fail("cancelled");
      signal?.addEventListener("abort", abort, { once: true });
      const tag = String(++this.serial),
        rows: Row[] = [];
      this.pending = {
        tag,
        rows,
        trapped: false,
        login: words[0] === "/login",
        finish: (error) => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", abort);
          this.pending = null;
          if (error) reject(error);
          else resolve(rows);
        },
      };
      try {
        this.wire.write(encode([...words, ".tag=" + tag]));
      } catch {
        this.fail("lost");
      }
    });
  }
  private receive(words: string[]) {
    const p = this.pending;
    if (!p) return;
    const tag = words.find((w) => w.startsWith(".tag="))?.slice(5);
    if (tag && tag !== p.tag) return;
    const kind = words[0];
    if (!["!re", "!done", "!trap", "!fatal", "!empty"].includes(kind || ""))
      return this.fail("protocol");
    if (kind === "!fatal") return this.fail(p.login ? "auth" : "lost");
    if (kind === "!trap") {
      p.trapped = true;
      return;
    }
    if (kind === "!re") {
      if (p.rows.length >= 10000) return this.fail("protocol");
      p.rows.push(row(words));
      return;
    }
    if (kind === "!done") {
      if (p.login && row(words).ret) p.finish(new PilotError("legacy-login"));
      else p.finish(p.trapped ? new PilotError(p.login ? "auth" : "rejected") : undefined);
    }
  }
  private fail(code: ConstructorParameters<typeof PilotError>[0]) {
    if (this.closed) return;
    this.closed = true;
    const p = this.pending;
    if (p) p.finish(new PilotError(code));
    this.wire.close();
  }
  close() {
    this.fail("cancelled");
  }
}
