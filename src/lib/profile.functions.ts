import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { cleanText } from './cities';

/** First-time account details. The role is set once by the server; users cannot write roles directly. */
export const saveAccountProfile = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    accountType: z.enum(['owner', 'engineer']),
    networkName: z.string().max(80).transform(cleanText),
    city: z.string().max(60).transform(cleanText).pipe(z.string().min(2)),
    language: z.enum(['ar', 'en']),
  }).refine((d) => d.accountType === 'engineer' || d.networkName.length >= 2, { path: ['networkName'] }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('profiles').upsert({ id: context.userId, account_type: data.accountType, network_name: data.networkName || null, city: data.city, language: data.language, updated_at: now });
    if (error) return { ok: false as const };
    await supabaseAdmin.from('user_roles').upsert({ user_id: context.userId, role: data.accountType }, { onConflict: 'user_id,role', ignoreDuplicates: true });
    return { ok: true as const };
  });

/** Network name and city from account settings (the account type is not editable here). */
export const updateNetworkInfo = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    networkName: z.string().max(80).transform(cleanText).pipe(z.string().min(2)),
    city: z.string().max(60).transform(cleanText).pipe(z.string().min(2)),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('profiles').update({ network_name: data.networkName, city: data.city, updated_at: new Date().toISOString() }).eq('id', context.userId);
    return { ok: !error };
  });
