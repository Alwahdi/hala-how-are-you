import { describe, it, expect } from 'vitest';
import { resolveLanguage } from '../lib/locale';
describe('language preference', () => {
  it('prioritizes saved Arabic over English browser language', () => expect(resolveLanguage('ar','en-US,en;q=0.9')).toBe('ar'));
  it('prioritizes saved English over Arabic browser language', () => expect(resolveLanguage('en','ar-YE')).toBe('en'));
  it('uses supported browser English', () => expect(resolveLanguage(undefined,'en-US,en;q=0.9')).toBe('en'));
  it('uses supported browser Arabic', () => expect(resolveLanguage(undefined,'ar-YE')).toBe('ar'));
  it('falls back to Arabic when unsupported', () => expect(resolveLanguage(undefined,'fr-FR')).toBe('ar'));
  it('uses Arabic when there is no browser preference', () => expect(resolveLanguage(undefined)).toBe('ar'));
  it('respects language preference quality and ignores q=0', () => expect(resolveLanguage('invalid','ar;q=0,en;q=0.8')).toBe('en'));
});