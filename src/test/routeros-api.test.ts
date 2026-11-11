import { describe, expect, it } from 'vitest';
import { decodeLength, decodeSentences, durationToSeconds, encodeLength, encodeSentence, sentenceToRecord } from '@/lib/routeros-api';

describe('RouterOS API wire format', () => {
  it.each([0, 0x7f, 0x80, 0x3fff, 0x4000, 0x1fffff, 0x200000, 0xfffffff])('round-trips length %i', (n) => {
    const b = Uint8Array.from(encodeLength(n));
    expect(decodeLength(b, 0)).toEqual([n, b.length]);
  });
  it('splits sentences and keeps partial data', () => {
    const a = encodeSentence(['!re', '=name=card1', '=uptime=1h']); const b = encodeSentence(['!done']);
    const all = new Uint8Array([...a, ...b.subarray(0, 2)]);
    const { sentences, rest } = decodeSentences(all);
    expect(sentences).toEqual([['!re', '=name=card1', '=uptime=1h']]);
    expect(rest.length).toBe(2);
    expect(sentenceToRecord(sentences[0]!)).toEqual({ name: 'card1', uptime: '1h' });
  });
  it('parses durations', () => {
    expect(durationToSeconds('1w2d3h4m5s')).toBe(604800 + 172800 + 10800 + 240 + 5);
    expect(durationToSeconds('01:00:00')).toBe(3600);
    expect(durationToSeconds('500ms')).toBe(0);
  });
});
