import { PageLanguage } from '@/components/page-language';
import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useLanguage } from '@/components/language-provider';
import { GoogleButton } from '@/components/google-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Check, Globe2, Loader2, Lock, Mail, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { COUNTRIES, OTP_RESEND_AFTER_S, normalizePhone } from '@/lib/phone-otp';
import { splitInternationalInput } from '@/lib/contact-input';
import { linkVerifiedPhone, sendPhoneCode, verifyPhoneCode } from '@/lib/phone.functions';

export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [
    { title: 'Mikro — تسجيل الدخول' },
    { name: 'description', content: 'Verify your phone on WhatsApp and sign in to Mikro to connect your MikroTik routers.' },
    { property: 'og:title', content: 'Mikro — Sign in' },
    { property: 'og:description', content: 'Phone verification and sign-in for Mikro by Alwahdi.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: AuthPage,
});

// Only the signed short-lived proof is kept, so it survives the Google redirect; removed once linked.
const PROOF_KEY = 'mikro-phone-proof';
type Step = 'phone' | 'code' | 'account';

function AuthPage() {
  const { ar, toggleLanguage } = useLanguage();
  const t = (a: string, b: string) => (ar ? a : b);
  const navigate = useNavigate();
  const send = useServerFn(sendPhoneCode);
  const verify = useServerFn(verifyPhoneCode);
  const link = useServerFn(linkVerifiedPhone);
  const [step, setStep] = useState<Step>('phone');
  const [dial, setDial] = useState('+967');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [verified, setVerified] = useState(false);
  const [pendingLink, setPendingLink] = useState(false);
  const [mode, setMode] = useState<'in' | 'up'>('up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const e164 = normalizePhone(phone, dial);

  // After any sign-in (including the return from Google): attach the verified phone, then continue.
  useEffect(() => {
    let done = false;
    async function finish() {
      const { data } = await supabase.auth.getUser();
      if (!data.user || done) return;
      done = true;
      const proof = sessionStorage.getItem(PROOF_KEY);
      if (proof) { const result = await link({ data: { proof, language: ar ? 'ar' : 'en' } }).catch(() => ({ ok: false as const })); if (!result.ok) { done = false; setPendingLink(true); setMessage({ tone: 'error', text: t('تم الدخول، لكن تعذر ربط الهاتف. بقي إثباتك؛ أعد المحاولة.', 'Signed in, but phone linking failed. Your proof is retained; retry.') }); return; } sessionStorage.removeItem(PROOF_KEY); }
      const { data: prof, error: profileError } = await supabase.from('profiles').select('account_type').eq('id', data.user.id).maybeSingle();
      if (profileError) { done = false; setPendingLink(true); setMessage({ tone: 'error', text: t('تعذر قراءة حسابك. أعد المحاولة.', 'Could not read your account. Retry.') }); return; }
      if (prof?.account_type) navigate({ to: '/dashboard', replace: true }); else navigate({ to: '/onboarding', replace: true });
    }
    finish();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => { if (e === 'SIGNED_IN') setTimeout(finish, 0); });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (resendIn <= 0) return; const id = setTimeout(() => setResendIn(resendIn - 1), 1000); return () => clearTimeout(id); }, [resendIn]);
  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  const sendErrors = {
    invalid_phone: t('الرقم غير صحيح. تأكد من رمز الدولة وأنه رقم جوال.', 'That number is not valid. Check the country code and that it is a mobile number.'),
    rate_limited: t('طلبت رموزاً كثيرة. انتظر 10 دقائق ثم حاول.', 'Too many codes requested. Wait 10 minutes and try again.'),
    not_configured: t('خدمة الرمز عبر WhatsApp قيد التفعيل. يمكنك المتابعة بدون رمز الآن.', 'WhatsApp code service is being activated. You can continue without a code for now.'),
    send_failed: t('ما قدرنا نرسل الرسالة. تأكد أن الرقم عليه WhatsApp وحاول مرة ثانية.', 'We could not send it. Make sure the number has WhatsApp and try again.'),
  };

  async function retryLink() {
    setBusy(true); setMessage(null);
    const proof = sessionStorage.getItem(PROOF_KEY);
    if (proof) {
      const result = await link({ data: { proof, language: ar ? 'ar' : 'en' } }).catch(() => ({ ok: false as const }));
      if (!result.ok) { setBusy(false); setMessage({ tone: 'error', text: t('تعذر ربط الهاتف. أعد المحاولة أو أكّد الرقم من جديد.', 'Phone linking failed. Retry or verify again.') }); return; }
      sessionStorage.removeItem(PROOF_KEY);
    }
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('profiles').select('account_type').eq('id', u.user?.id ?? '').maybeSingle();
    setBusy(false);
    if (error) { setMessage({ tone: 'error', text: t('تعذر قراءة حسابك. أعد المحاولة.', 'Could not read your account. Retry.') }); return; }
    navigate({ to: data?.account_type ? '/dashboard' : '/onboarding', replace: true });
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault(); setMessage(null);
    if (!e164) return setMessage({ tone: 'error', text: sendErrors.invalid_phone });
    setBusy(true);
    const r = await send({ data: { phone: e164, language: ar ? 'ar' : 'en' } }).catch(() => ({ ok: false as const, reason: 'send_failed' as const }));
    setBusy(false);
    if (!r.ok) return setMessage({ tone: r.reason === 'not_configured' ? 'info' : 'error', text: sendErrors[r.reason] });
    setCode(''); setResendIn(OTP_RESEND_AFTER_S); setStep('code');
  }

  async function checkCode(value: string) {
    if (!e164 || value.length !== 6) return;
    setBusy(true); setMessage(null);
    const r = await verify({ data: { phone: e164, code: value } }).catch(() => ({ ok: false as const, reason: 'invalid' as const }));
    setBusy(false);
    if (!r.ok) {
      setCode('');
      return setMessage({ tone: 'error', text: r.reason === 'expired' ? t('انتهت صلاحية الرمز. اطلب رمزاً جديداً.', 'The code expired. Request a new one.') : r.reason === 'too_many' ? t('محاولات كثيرة. اطلب رمزاً جديداً.', 'Too many tries. Request a new code.') : t('الرمز غير صحيح. جرّب مرة ثانية.', 'Wrong code. Try again.') });
    }
    sessionStorage.setItem(PROOF_KEY, r.proof);
    setVerified(true);
    setStep('account');
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(null);
    const res = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
    setBusy(false);
    if (res.error) return setMessage({ tone: 'error', text: res.error.message.includes('Invalid login') ? t('البريد أو كلمة المرور غير صحيحة.', 'Wrong email or password.') : res.error.message.includes('already registered') ? t('هذا البريد مسجل. اختر «دخول».', 'This email already has an account. Choose “Sign in”.') : res.error.message });
    if (mode === 'up' && !res.data.session) setMessage({ tone: 'info', text: t('أرسلنا رابط تأكيد إلى بريدك. افتحه من هذا الجهاز لإكمال الدخول.', 'We sent a confirmation link. Open it on this device to finish.') });
  }

  async function google() {
    setMessage(null);
    const r = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/auth` });
    if (r.error) setMessage({ tone: 'error', text: t('تعذر الدخول بحساب Google. حاول مرة ثانية.', 'Google sign-in failed. Please try again.') });
  }

  const stepIndex = { phone: 0, code: 1, account: 2 }[step];
  const Back = ar ? ArrowRight : ArrowLeft;
  const country = COUNTRIES.find((c) => c.dial === dial);

  return (
    <main className="app-shell flex min-h-screen flex-col py-6" lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <PageLanguage titles={['تسجيل الدخول', 'Sign in']} />
      <div aria-hidden className="landing-pattern" />
      <div className="flex items-center justify-between">
        <a href="/" className="text-lg font-extrabold">Mikro</a>
        <Button variant="ghost" onClick={toggleLanguage}><Globe2 />{ar ? 'English' : 'العربية'}</Button>
      </div>

      <div className="mx-auto mt-8 w-full max-w-sm flex-1">
        {(step !== 'account' || verified) && <ol className="mb-6 grid grid-cols-3 gap-2" aria-label={t('خطوات الدخول', 'Sign-in steps')}>
          {[t('الجوال', 'Phone'), t('الرمز', 'Code'), t('الحساب', 'Account')].map((label, i) => (
            <li key={label} className="space-y-1.5" aria-current={i === stepIndex ? 'step' : undefined}>
              <div className={`h-1.5 rounded-full ${i <= stepIndex ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`text-xs ${i === stepIndex ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{i < stepIndex && <Check className="inline size-3" />} {label}</p>
            </li>
          ))}
        </ol>}

        <section className="space-y-5 app-panel p-5 sm:p-6">
          {pendingLink && <div className="space-y-3"><Header icon={<ShieldCheck />} title={t('أكمل ربط حسابك', 'Finish linking your account')} sub={t('ما أكدنا الربط بعد.', 'Linking is not confirmed yet.')} /><Msg m={message} /><Button className="h-12 w-full" disabled={busy} onClick={retryLink}>{busy && <Loader2 className="animate-spin" />}{t('إعادة المحاولة', 'Retry')}</Button><Button variant="outline" className="h-12 w-full" onClick={() => { sessionStorage.removeItem(PROOF_KEY); setPendingLink(false); setStep('phone'); setMessage(null); }}>{t('أكّد الرقم من جديد', 'Verify phone again')}</Button></div>}
          {!pendingLink && step === 'phone' && (
            <form className="space-y-5" onSubmit={sendCode} noValidate>
              <Header icon={<Phone />} title={t('رقم جوالك', 'Your mobile number')} sub={t('نرسل لك رمزاً من 6 أرقام على WhatsApp.', 'We will send a 6-digit code on WhatsApp.')} />
              <div className="space-y-2">
                <Label htmlFor="phone">{t('رقم الجوال', 'Mobile number')}</Label>
                <div className="flex gap-2" dir="ltr">
                  <select aria-label={t('الدولة', 'Country')} value={dial} onChange={(e) => setDial(e.target.value)} className="h-12 rounded-xl border border-input bg-background px-2 text-base">
                    {COUNTRIES.map((c) => <option key={c.code} value={c.dial}>{c.flag} {c.dial}</option>)}
                  </select>
                  <Input id="phone" type="tel" inputMode="tel" autoComplete="tel-national" autoFocus className="h-12 flex-1 text-lg tracking-wide" placeholder="7XX XXX XXX"
                    value={phone} aria-invalid={message?.tone === 'error'} aria-describedby="phone-hint"
                    onChange={(e) => { const s = splitInternationalInput(e.target.value, dial); setDial(COUNTRIES.some((c) => c.dial === s.dial) ? s.dial : dial); setPhone(s.phone); }} />
                </div>
                <p id="phone-hint" className="text-xs text-muted-foreground">{country ? (ar ? country.ar : country.en) : ''} · {t('يمكنك لصق الرقم مع رمز الدولة.', 'You can paste it with the country code.')}</p>
              </div>
              <Msg m={message} />
              <Button type="submit" className="h-12 w-full text-base" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <MessageCircle />}{t('أرسل الرمز على WhatsApp', 'Send code on WhatsApp')}</Button>
              {message?.tone === 'info' && <Button type="button" variant="outline" className="h-12 w-full" onClick={() => { setMessage(null); setStep('account'); }}>{t('المتابعة بدون رمز', 'Continue without a code')}</Button>}
              <button type="button" className="w-full text-sm text-primary underline-offset-4 hover:underline" onClick={() => { setMessage(null); setMode('in'); setStep('account'); }}>{t('عندك حساب؟ ادخل مباشرة', 'Have an account? Sign in directly')}</button>
            </form>
          )}

          {!pendingLink && step === 'code' && (
            <div className="space-y-5">
              <Header icon={<ShieldCheck />} title={t('أدخل الرمز', 'Enter the code')} sub={<>{t('أرسلناه على WhatsApp إلى', 'Sent on WhatsApp to')} <bdi dir="ltr" className="font-semibold text-foreground">{e164}</bdi></>} />
              <div className="relative" dir="ltr">
                <input ref={codeRef} aria-label={t('رمز التحقق', 'Verification code')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={busy}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(v); if (v.length === 6) checkCode(v); }}
                  className="absolute inset-0 z-10 opacity-0" />
                <div className="grid grid-cols-6 gap-2" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className={`flex h-14 items-center justify-center rounded-xl border text-2xl font-bold ${i === code.length ? 'border-primary ring-2 ring-primary/30' : 'border-input'} bg-background`}>{code[i] ?? ''}</div>
                  ))}
                </div>
              </div>
              {busy && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t('نتحقق...', 'Checking...')}</p>}
              <Msg m={message} />
              <div className="flex items-center justify-between text-sm">
                <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => { setMessage(null); setStep('phone'); }}>{t('غيّر الرقم', 'Change number')}</button>
                {resendIn > 0 ? <span className="text-muted-foreground">{t('إعادة الإرسال بعد', 'Resend in')} {resendIn}{t(' ث', 's')}</span>
                  : <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => sendCode()}>{t('أعد إرسال الرمز', 'Resend code')}</button>}
              </div>
            </div>
          )}

          {!pendingLink && step === 'account' && (
            <div className="space-y-5">
              <div className="flex items-start gap-2">
                <button type="button" aria-label={t('رجوع', 'Back')} onClick={() => { setMessage(null); setStep('phone'); }} className="mt-1 rounded-lg p-2 hover:bg-muted"><Back className="size-4" /></button>
                <Header icon={<Lock />} title={mode === 'up' ? t('أنشئ حسابك', 'Create your account') : t('ادخل إلى حسابك', 'Sign in')} sub={t('اختر الطريقة الأسهل لك.', 'Pick whichever is easiest.')} />
              </div>
              <GoogleButton label={t('المتابعة بحساب Google', 'Continue with Google')} onClick={google} />
              <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />{t('أو بالبريد', 'or with email')}<span className="h-px flex-1 bg-border" /></div>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist">
                {(['up', 'in'] as const).map((m) => <button key={m} role="tab" aria-selected={mode === m} type="button" onClick={() => setMode(m)} className={`h-10 rounded-lg text-sm font-semibold ${mode === m ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>{m === 'up' ? t('حساب جديد', 'New account') : t('دخول', 'Sign in')}</button>)}
              </div>
              <form className="space-y-4" onSubmit={submitEmail}>
                <div className="space-y-2"><Label htmlFor="email"><Mail className="inline size-4" /> {t('البريد الإلكتروني', 'Email')}</Label><Input id="email" type="email" autoComplete="email" dir="ltr" className="h-12" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="password"><Lock className="inline size-4" /> {t('كلمة المرور', 'Password')}</Label><Input id="password" type="password" autoComplete={mode === 'up' ? 'new-password' : 'current-password'} dir="ltr" className="h-12" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                  {mode === 'up' && <p className="text-xs text-muted-foreground">{t('8 أحرف على الأقل.', 'At least 8 characters.')}</p>}</div>
                <Msg m={message} />
                <Button className="h-12 w-full text-base" type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === 'in' ? t('دخول', 'Sign in') : t('إنشاء الحساب', 'Create account')}</Button>
              </form>
            </div>
          )}
        </section>
        <p className="mt-4 text-center text-xs text-muted-foreground"><a href="/privacy" className="underline-offset-4 hover:underline">{t('كيف نستخدم رقمك وبياناتك', 'How we use your number and data')}</a></p>
      </div>
    </main>
  );
}

function Header({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary [&>svg]:size-5">{icon}</span>
      <div><h1 className="text-xl font-bold">{title}</h1><p className="mt-0.5 text-sm text-muted-foreground">{sub}</p></div>
    </div>
  );
}

function Msg({ m }: { m: { tone: 'error' | 'info'; text: string } | null }) {
  if (!m) return null;
  return <p role={m.tone === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3 py-2 text-sm ${m.tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-foreground'}`}>{m.text}</p>;
}
