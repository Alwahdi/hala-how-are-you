import { describe, it, expect } from 'vitest';
import { earlyAccessSchema } from '../lib/early-access';
describe('early access input', () => {
  it('normalizes an email without extra contact fields', () => expect(earlyAccessSchema.parse({email:' OWNER@EXAMPLE.COM ',language:'ar'})).toEqual({email:'owner@example.com',language:'ar',source:'direct',website:''}));
  it('rejects an invalid email', () => expect(earlyAccessSchema.safeParse({email:'not-an-email',language:'ar'}).success).toBe(false));
  it('rejects unsupported languages', () => expect(earlyAccessSchema.safeParse({email:'owner@example.com',language:'fr'}).success).toBe(false));
  it('rejects filled bot traps', () => expect(earlyAccessSchema.safeParse({email:'owner@example.com',language:'en',website:'spam'}).success).toBe(false));
});