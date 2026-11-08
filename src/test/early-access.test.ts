import { describe, it, expect } from 'vitest';
import { earlyAccessSchema } from '../lib/early-access';
describe('early access input', () => {
  it('accepts email as the only contact and normalizes it', () => expect(earlyAccessSchema.parse({contactMethod:'email',contactValue:' OWNER@EXAMPLE.COM ',language:'ar'})).toEqual({contactMethod:'email',contactValue:'owner@example.com',language:'ar',source:'direct',website:''}));
  it('accepts WhatsApp as the only contact and normalizes international format', () => expect(earlyAccessSchema.parse({contactMethod:'whatsapp',contactValue:'+967 777 123 456',language:'ar'}).contactValue).toBe('+967777123456'));
  it('does not restrict WhatsApp to Yemen', () => expect(earlyAccessSchema.parse({contactMethod:'whatsapp',contactValue:'+44 7911 123456',language:'en'}).contactValue).toBe('+447911123456'));
  it('rejects a phone without a country code', () => expect(earlyAccessSchema.safeParse({contactMethod:'whatsapp',contactValue:'777123456',language:'ar'}).success).toBe(false));
  it('rejects an invalid email', () => expect(earlyAccessSchema.safeParse({contactMethod:'email',contactValue:'not-an-email',language:'ar'}).success).toBe(false));
  it('rejects unsupported contact methods', () => expect(earlyAccessSchema.safeParse({contactMethod:'sms',contactValue:'+967777123456',language:'ar'}).success).toBe(false));
  it('rejects unsupported languages', () => expect(earlyAccessSchema.safeParse({contactMethod:'email',contactValue:'owner@example.com',language:'fr'}).success).toBe(false));
  it('rejects filled bot traps', () => expect(earlyAccessSchema.safeParse({contactMethod:'email',contactValue:'owner@example.com',language:'en',website:'spam'}).success).toBe(false));
});