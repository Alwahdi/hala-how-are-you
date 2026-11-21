import { Buffer } from "buffer";
import { PilotError, Row } from "./types";
const MAX = 1024 * 1024;
export function encodeLength(n: number): number[] {
  if (!Number.isSafeInteger(n) || n < 0 || n > MAX) throw new PilotError("protocol");
  if (n < 0x80) return [n];
  if (n < 0x4000) return [(n >> 8) | 0x80, n & 255];
  if (n < 0x200000) return [(n >> 16) | 0xc0, (n >> 8) & 255, n & 255];
  return [(n >>> 24) | 0xe0, (n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function encode(words: string[]): Uint8Array {
  const chunks: Buffer[] = [];
  for (const word of words) {
    const bytes = Buffer.from(word, "utf8");
    chunks.push(Buffer.from(encodeLength(bytes.length)), bytes);
  }
  chunks.push(Buffer.from([0]));
  return Buffer.concat(chunks);
}
function lengthAt(b: Uint8Array, at: number): [number, number] | null {
  const c = b[at];
  if (c === undefined) return null;
  if (c >= 0xf1) throw new PilotError("protocol");
  const n = c < 128 ? 1 : c < 192 ? 2 : c < 224 ? 3 : c < 240 ? 4 : 5;
  if (at + n > b.length) return null;
  let size = n === 1 ? c : c & (n === 2 ? 63 : n === 3 ? 31 : n === 4 ? 15 : 0);
  for (let i = 1; i < n; i++) size = size * 256 + b[at + i]!;
  if (size > MAX) throw new PilotError("protocol");
  return [size, n];
}
export class Decoder {
  private buffer = Buffer.alloc(0);
  push(chunk: Uint8Array): string[][] {
    if (this.buffer.length + chunk.length > MAX) throw new PilotError("protocol");
    const b = Buffer.concat([this.buffer, Buffer.from(chunk)]),
      out: string[][] = [];
    let at = 0,
      complete = 0,
      words: string[] = [];
    while (at < b.length) {
      const prefix = lengthAt(b, at);
      if (!prefix) break;
      const [size, used] = prefix;
      if (at + used + size > b.length) break;
      at += used;
      if (size === 0) {
        out.push(words);
        words = [];
        complete = at;
        continue;
      }
      words.push(Buffer.from(b.subarray(at, at + size)).toString("utf8"));
      at += size;
      if (words.length > 512) throw new PilotError("protocol");
    }
    this.buffer = Buffer.from(b.subarray(complete));
    return out;
  }
}
export function row(words: string[]): Row {
  const out: Row = {};
  for (const word of words) {
    if (!word.startsWith("=")) continue;
    const at = word.indexOf("=", 1);
    if (at > 1) out[word.slice(1, at)] = word.slice(at + 1);
  }
  return out;
}
