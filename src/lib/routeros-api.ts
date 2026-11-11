// Minimal RouterOS API client (ports 8728 / 8729). Pure encode/decode is testable; the socket part is server-only.

export function encodeLength(n: number): number[] {
  if (n < 0x80) return [n];
  if (n < 0x4000) return [((n >> 8) | 0x80) & 0xff, n & 0xff];
  if (n < 0x200000) return [((n >> 16) | 0xc0) & 0xff, (n >> 8) & 0xff, n & 0xff];
  if (n < 0x10000000) return [((n >>> 24) | 0xe0) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  return [0xf0, (n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function encodeSentence(words: string[]): Uint8Array {
  const out: number[] = [];
  for (const w of words) { const b = new TextEncoder().encode(w); out.push(...encodeLength(b.length), ...b); }
  out.push(0);
  return Uint8Array.from(out);
}

/** Reads one length prefix; returns [length, bytesUsed] or null if more data is needed. */
export function decodeLength(buf: Uint8Array, i: number): [number, number] | null {
  const c = buf[i]; if (c === undefined) return null;
  const need = c < 0x80 ? 1 : c < 0xc0 ? 2 : c < 0xe0 ? 3 : c < 0xf0 ? 4 : 5;
  if (i + need > buf.length) return null;
  const b = (k: number) => buf[i + k]!;
  if (need === 1) return [c, 1];
  if (need === 2) return [((c & 0x3f) << 8) | b(1), 2];
  if (need === 3) return [((c & 0x1f) << 16) | (b(1) << 8) | b(2), 3];
  if (need === 4) return [(((c & 0x0f) << 24) >>> 0) + (b(1) << 16) + (b(2) << 8) + b(3), 4];
  return [((b(1) << 24) >>> 0) + (b(2) << 16) + (b(3) << 8) + b(4), 5];
}

/** Splits a byte buffer into complete sentences; returns them plus the unconsumed rest. */
export function decodeSentences(buf: Uint8Array): { sentences: string[][]; rest: Uint8Array } {
  const sentences: string[][] = []; let i = 0; let start = 0; let words: string[] = [];
  while (i < buf.length) {
    const l = decodeLength(buf, i); if (!l) break;
    const [len, used] = l;
    if (len === 0) { i += used; sentences.push(words); words = []; start = i; continue; }
    if (i + used + len > buf.length) break;
    words.push(new TextDecoder().decode(buf.subarray(i + used, i + used + len)));
    i += used + len;
  }
  return { sentences, rest: buf.subarray(start) };
}

/** "!re" sentence words "=key=value" -> object. */
export function sentenceToRecord(words: string[]): Record<string, string> {
  const r: Record<string, string> = {};
  for (const w of words.slice(1)) { if (!w.startsWith('=')) continue; const k = w.indexOf('=', 1); r[w.slice(1, k)] = w.slice(k + 1); }
  return r;
}

/** RouterOS durations like "1w2d3h4m5s" or "00:10:00" -> seconds. */
export function durationToSeconds(v: string | undefined | null): number {
  if (!v) return 0;
  const hms = /^(?:(\d+)d\s*)?(\d+):(\d+):(\d+)$/.exec(v);
  if (hms) return Number(hms[1] ?? 0) * 86400 + Number(hms[2]) * 3600 + Number(hms[3]) * 60 + Number(hms[4]);
  const unit: Record<string, number> = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 };
  let t = 0; for (const m of v.matchAll(/(\d+)(w|d|h|m|s)(?!s)/g)) t += Number(m[1]) * unit[m[2]!]!;
  return t;
}

export type ApiError = 'unreachable' | 'timeout' | 'tls' | 'auth' | 'old_login';

/** One API session: login, run read commands one by one, close. Commands that fail (missing package) return null. */
export async function apiSession(opts: { host: string; port: number; tls: boolean; user: string; password: string; commands: string[][]; timeoutMs?: number }): Promise<{ ok: true; results: (Record<string, string>[] | null)[] } | { ok: false; error: ApiError }> {
  const net = await import('node:net');
  const tlsMod = opts.tls ? await import('node:tls') : null;
  return new Promise((resolve) => {
    let buf = new Uint8Array(0); let done = false; let step = -1; let rows: Record<string, string>[] = []; let trapped = false;
    const results: (Record<string, string>[] | null)[] = [];
    const finish = (v: Parameters<typeof resolve>[0]) => { if (done) return; done = true; clearTimeout(timer); try { sock.destroy(); } catch { /* closed */ } resolve(v); };
    const timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), opts.timeoutMs ?? 10000);
    const sock = tlsMod
      ? tlsMod.connect({ host: opts.host, port: opts.port, rejectUnauthorized: false, servername: opts.host })
      : net.connect({ host: opts.host, port: opts.port });
    const send = (words: string[]) => sock.write(encodeSentence(words));
    sock.on(tlsMod ? 'secureConnect' : 'connect', () => send(['/login', `=name=${opts.user}`, `=password=${opts.password}`]));
    sock.on('error', (e: Error) => finish({ ok: false, error: /certificate|ssl|tls|handshake|alert/i.test(String(e)) ? 'tls' : 'unreachable' }));
    sock.on('close', () => finish({ ok: false, error: 'unreachable' }));
    sock.on('data', (chunk: Uint8Array) => {
      const merged = new Uint8Array(buf.length + chunk.length); merged.set(buf); merged.set(chunk, buf.length);
      const { sentences, rest } = decodeSentences(merged); buf = Uint8Array.from(rest);
      for (const s of sentences) {
        const kind = s[0];
        if (step === -1) {
          if (kind === '!done' && s.some((w) => w.startsWith('=ret='))) return finish({ ok: false, error: 'old_login' });
          if (kind !== '!done') { if (kind === '!trap' || kind === '!fatal') return finish({ ok: false, error: 'auth' }); continue; }
          step = 0;
        } else {
          if (kind === '!re') { rows.push(sentenceToRecord(s)); continue; }
          if (kind === '!trap') { trapped = true; continue; }
          if (kind === '!fatal') return finish({ ok: false, error: 'unreachable' });
          if (kind !== '!done') continue;
          results.push(trapped ? null : rows); rows = []; trapped = false; step++;
        }
        if (step >= opts.commands.length) return finish({ ok: true, results });
        send(opts.commands[step]!);
      }
    });
  });
}
