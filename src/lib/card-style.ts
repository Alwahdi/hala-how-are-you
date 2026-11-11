// Card style: how a network's cards look (number only vs number + code, length, characters, prefix). Browser-safe.
export type CardStyle = { mode: 'number_only' | 'number_password'; length: number; charset: 'digits' | 'letters' | 'mixed'; prefix: string };
export const DEFAULT_STYLE: CardStyle = { mode: 'number_only', length: 8, charset: 'digits', prefix: '' };

/** Guesses the style from up to 30 cards. pw_mode comes from the router script (the password itself never leaves it). */
export function detectStyle(cards: { name: string; pw_mode?: string | null }[]): (CardStyle & { sample: number; sure: boolean }) | null {
  const s = cards.filter((c) => c.name && c.name !== 'default-trial').slice(0, 30);
  if (!s.length) return null;
  const lens = new Map<number, number>();
  for (const c of s) lens.set(c.name.length, (lens.get(c.name.length) ?? 0) + 1);
  const length = [...lens.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  const digits = s.every((c) => /^\d+$/.test(c.name));
  const letters = s.every((c) => /^[a-z]+$/i.test(c.name));
  let prefix = s[0]!.name;
  for (const c of s) while (prefix && !c.name.startsWith(prefix)) prefix = prefix.slice(0, -1);
  if (s.length < 3 || prefix.length >= length - 2) prefix = '';
  const known = s.filter((c) => c.pw_mode);
  const other = known.filter((c) => c.pw_mode === 'other').length;
  const mode = known.length && other > known.length / 2 ? 'number_password' : 'number_only';
  return { mode, length: Math.min(16, Math.max(4, length)), charset: digits ? 'digits' : letters ? 'letters' : 'mixed', prefix: prefix.slice(0, 6), sample: s.length, sure: known.length >= 5 };
}

const CHARS = { digits: '0123456789', letters: 'abcdefghjkmnpqrstuvwxyz', mixed: 'abcdefghjkmnpqrstuvwxyz23456789' };

/** A sample card in the given style; rand is injectable for tests. */
export function sampleCard(style: CardStyle, rand: () => number = Math.random): { user: string; password: string | null } {
  const pick = (n: number, set: string) => Array.from({ length: n }, () => set[Math.floor(rand() * set.length)]).join('');
  const user = style.prefix + pick(Math.max(1, style.length - style.prefix.length), CHARS[style.charset]);
  return { user, password: style.mode === 'number_password' ? pick(Math.min(6, style.length), CHARS.digits) : null };
}
