import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
const common = {
  language: z.enum(['ar', 'en']),
  source: z.enum(['direct', 'campaign', 'referral']).default('direct'),
  website: z.string().max(0).default(''),
};
export const earlyAccessSchema = z.discriminatedUnion('contactMethod', [
  z.object({ ...common, contactMethod: z.literal('email'), contactValue: z.string().trim().max(254).email().transform(value => value.toLowerCase()) }),
  z.object({ ...common, contactMethod: z.literal('whatsapp'), contactValue: z.string().trim().max(30).transform((value, context) => {
    const phone = value.startsWith('+') ? parsePhoneNumberFromString(value) : undefined;
    if (!phone?.isValid()) { context.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid international phone number' }); return z.NEVER; }
    return phone.number;
  }) }),
]);