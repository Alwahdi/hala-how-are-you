import { z } from 'zod';
export const earlyAccessSchema = z.object({
  email: z.string().trim().max(254).email().transform(value => value.toLowerCase()),
  language: z.enum(['ar', 'en']),
  source: z.enum(['direct', 'campaign', 'referral']).default('direct'),
  website: z.string().max(0).default(''),
});