import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { hashOtp, newOtp, normalizePhone, signProof, verifyProof, OTP_MAX_ATTEMPTS, OTP_MAX_SENDS_PER_WINDOW, OTP_SEND_WINDOW_MS, OTP_TTL_MS } from './phone-otp';

type SendResult = { ok: true } | { ok: false; reason: 'invalid_phone' | 'rate_limited' | 'not_configured' | 'send_failed' };

export const sendPhoneCode = createServerFn({ method: 'POST' })
  .inputValidator((i: unknown) => z.object({ phone: z.string().max(25), language: z.enum(['ar', 'en']) }).parse(i))
  .handler(async ({ data }): Promise<SendResult> => {
    const phone = normalizePhone(data.phone);
    if (!phone) return { ok: false, reason: 'invalid_phone' };
    const secret = process.env['OTP_SIGNING_SECRET'];
    const lovableKey = process.env['LOVABLE_API_KEY'];
    const waKey = process.env['WHATSAPP_API_KEY'];
    const template = process.env['WHATSAPP_OTP_TEMPLATE'] ?? 'mikro_login_code';
    if (!secret || !lovableKey || !waKey) return { ok: false, reason: 'not_configured' };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const since = new Date(Date.now() - OTP_SEND_WINDOW_MS).toISOString();
    const { count } = await supabaseAdmin.from('phone_otps').select('id', { count: 'exact', head: true }).eq('phone', phone).gte('created_at', since);
    if ((count ?? 0) >= OTP_MAX_SENDS_PER_WINDOW) return { ok: false, reason: 'rate_limited' };
    const code = newOtp();
    const { error } = await supabaseAdmin.from('phone_otps').insert({ phone, code_hash: await hashOtp(secret, phone, code), expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString() });
    if (error) return { ok: false, reason: 'send_failed' };
    const res = await fetch('https://connector-gateway.lovable.dev/whatsapp/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': waKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp', to: phone.slice(1), type: 'template',
        template: { name: template, language: { code: data.language === 'ar' ? 'ar' : 'en_US' }, components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ] },
      }),
    });
    if (!res.ok) { console.error('WhatsApp OTP send failed', res.status, await res.text()); return { ok: false, reason: 'send_failed' }; }
    return { ok: true };
  });

type VerifyResult = { ok: true; proof: string } | { ok: false; reason: 'invalid' | 'expired' | 'too_many' | 'not_configured' };

export const verifyPhoneCode = createServerFn({ method: 'POST' })
  .inputValidator((i: unknown) => z.object({ phone: z.string().max(25), code: z.string().regex(/^\d{6}$/) }).parse(i))
  .handler(async ({ data }): Promise<VerifyResult> => {
    const secret = process.env['OTP_SIGNING_SECRET'];
    if (!secret) return { ok: false, reason: 'not_configured' };
    const phone = normalizePhone(data.phone);
    if (!phone) return { ok: false, reason: 'invalid' };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: row } = await supabaseAdmin.from('phone_otps').select('id, code_hash, attempts, expires_at, consumed_at').eq('phone', phone).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!row || row.consumed_at) return { ok: false, reason: 'expired' };
    if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: 'expired' };
    if (row.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: 'too_many' };
    if ((await hashOtp(secret, phone, data.code)) !== row.code_hash) {
      await supabaseAdmin.from('phone_otps').update({ attempts: row.attempts + 1 }).eq('id', row.id);
      return { ok: false, reason: row.attempts + 1 >= OTP_MAX_ATTEMPTS ? 'too_many' : 'invalid' };
    }
    await supabaseAdmin.from('phone_otps').update({ consumed_at: new Date().toISOString() }).eq('id', row.id);
    return { ok: true, proof: await signProof(secret, phone) };
  });

export const linkVerifiedPhone = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ proof: z.string().max(200), language: z.enum(['ar', 'en']) }).parse(i))
  .handler(async ({ data, context }) => {
    const secret = process.env['OTP_SIGNING_SECRET'];
    const phone = secret ? await verifyProof(secret, data.proof) : null;
    if (!phone) return { ok: false };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('profiles').upsert({ id: context.userId, phone, phone_verified_at: new Date().toISOString(), language: data.language, updated_at: new Date().toISOString() });
    return { ok: !error };
  });
