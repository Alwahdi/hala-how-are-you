import { createServerFn } from '@tanstack/react-start';
import { earlyAccessSchema } from './early-access';

export const requestEarlyAccess = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => earlyAccessSchema.parse(input))
  .handler(async ({ data }) => {
    // Public, intentionally insert-only operation. No credentials or existing
    // subscriber information are ever returned. RLS denies all visitor reads.
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('early_access_requests').upsert(
      { email: data.email, language: data.language, source: data.source },
      { onConflict: 'email', ignoreDuplicates: true },
    );
    if (error) return { ok: false };
    return { ok: true };
  });