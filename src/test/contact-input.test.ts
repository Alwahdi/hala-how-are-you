import { describe, it, expect } from 'vitest';
import { contactValue, splitInternationalInput } from '../lib/contact-input';
describe('international contact entry', () => {
  it('splits a pasted international phone without duplicating the calling code', () => expect(splitInternationalInput('+44 7911 123456', '+967')).toEqual({dial:'+44',phone:'7911123456'}));
  it('keeps national entry and the editable calling code', () => expect(splitInternationalInput('777 123 456', '+967')).toEqual({dial:'+967',phone:'777 123 456'}));
  it('combines national number and calling code', () => expect(contactValue('777 123 456','+967')).toBe('+967777123456'));
  it('never doubles the calling code of a complete international entry', () => expect(contactValue('+447911123456','+967')).toBe('+447911123456'));
});