import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle2, Loader2, Mail, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useLanguage } from '@/components/language-provider';
import { PageLanguage } from '@/components/page-language';
import { GoogleButton } from '@/components/google-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/account/auth-layout';
import { PasswordField } from '@/components/account/password-field';

export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [{ title: 'Mikro — تسجيل الدخول' }, { name: 'description', content: 'Sign in or create your Mikro account with email and password. Manage linked sign-in methods in account settings.' }, { property: 'og:title', content: 'Mikro — Sign in' }, { property: 'og:description', content: 'Access your Mikro network account securely.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: AuthPage,
});

function AuthPage() {
  const { ar } = useLanguage();
  const t = (a: string, b: string) => ar ? a : b;
  const navigate = useNavigate();
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [retryAccount, setRetryAccount] = useState(false);
  const [sent, setSent] = useState(false);

  function changeMode(next: 'in' | 'up' | 'reset') {
    setMode(next); setMessage(null); setSent(false);
  }

  async function finish() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return;
    const profile = await supabase.from('profiles').select('account_type').eq('id', data.user.id).maybeSingle();
    if (profile.error) { setRetryAccount(true); setMessage({ error: true, text: t('تم الدخول، لكن تعذر فتح بيانات حسابك. أعد المحاولة.', 'Signed in, but account data could not load. Retry.') }); return; }
    navigate({ to: profile.data?.account_type ? '/dashboard' : '/onboarding', replace: true });
  }
  useEffect(() => { void finish(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setMessage(null);
    try {
      if (method === 'phone') return;
      if (mode === 'reset') {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        setMessage({ error: !!result.error, text: result.error ? t('تعذر إرسال رابط الاستعادة. حاول لاحقًا.', 'Could not send a recovery link. Retry later.') : t('إذا كان البريد مسجلًا، سيصلك رابط لاستعادة كلمة المرور.', 'If this email is registered, you will receive a password recovery link.') }); setSent(!result.error); return;
      }
      const result = mode === 'in' ? await supabase.auth.signInWithPassword({ email: email.trim(), password }) : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
      if (result.error) { setMessage({ error: true, text: t('تعذر إكمال الطلب. تحقق من البريد وكلمة المرور وحاول مرة أخرى.', 'Could not complete the request. Check your email and password and retry.') }); return; }
      if (result.data.session) await finish();
      else { setSent(true); setPassword(''); setMessage({ error: false, text: t('راجع بريدك لتأكيد الحساب، ثم ادخل بالبريد وكلمة المرور. لا تحتاج رقم هاتف.', 'Check your email to confirm your account, then sign in with email and password. No phone required.') }); }
    } catch { setMessage({ error: true, text: t('تعذر الاتصال. بقيت بياناتك هنا؛ حاول مرة أخرى.', 'Connection failed. Your entries are still here; retry.') }); }
    finally { setBusy(false); }
  }

  return <AuthLayout>
    <PageLanguage titles={['تسجيل الدخول', 'Sign in']} />
    <div className="mb-7 space-y-2">
      <h1 className="text-3xl font-bold">{mode === 'reset' ? t('استعادة كلمة المرور', 'Reset password') : mode === 'up' ? t('إنشاء حساب', 'Create account') : t('تسجيل الدخول', 'Sign in')}</h1>
      <p className="text-sm text-muted-foreground">{mode === 'reset' ? t('أدخل بريدك لاستعادة الوصول إلى حسابك.', 'Enter your email to recover your account.') : mode === 'up' ? t('أهلًا بك في Mikro.', 'Welcome to Mikro.') : t('أهلًا بعودتك إلى Mikro.', 'Welcome back to Mikro.')}</p>
    </div>
    {mode !== 'reset' && <div className="mb-6 grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/30 p-1" role="group" aria-label={t('طريقة الدخول', 'Sign-in method')}>
      <Button variant="ghost" className={`h-12 ${method === 'email' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`} aria-pressed={method === 'email'} disabled={busy} onClick={() => { setMethod('email'); changeMode('in'); }}><Mail />{t('البريد الإلكتروني', 'Email')}</Button>
      <Button variant="ghost" className={`h-12 ${method === 'phone' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`} aria-pressed={method === 'phone'} disabled={busy} onClick={() => { setMethod('phone'); changeMode('in'); }}><Phone /><span className="text-start leading-4">{t('رقم الجوال', 'Phone')}<span className="mt-1 block text-[10px] font-normal text-muted-foreground">{t('غير متاح حاليًا', 'Currently unavailable')}</span></span></Button>
    </div>}
    {method === 'phone' ? <div className="space-y-5 border-y border-border py-6">
      <p className="text-sm text-muted-foreground">{t('الدخول برقم الجوال غير متاح حاليًا.', 'Phone sign-in is currently unavailable.')}</p>
      <Button className="h-12 w-full" onClick={() => { setMethod('email'); changeMode('in'); }}><Mail />{t('المتابعة بالبريد', 'Continue with email')}</Button>
    </div> : sent ? <div className="space-y-5" role="status">
      <CheckCircle2 className="size-9 text-primary" />
      <h2 className="text-xl font-semibold">{t('راجع بريدك', 'Check your email')}</h2>
      <p className="text-sm leading-6 text-muted-foreground">{message?.text}</p>
      <Button variant="outline" className="h-12 w-full" onClick={() => changeMode('in')}>{t('العودة للدخول', 'Back to sign in')}</Button>
    </div> : <>
      <form className="space-y-5" onSubmit={submit} aria-busy={busy}>
        <div className="space-y-2"><Label htmlFor="login-id">{t('البريد الإلكتروني', 'Email address')}</Label><Input id="login-id" className="h-12 bg-card" type="email" dir="ltr" autoComplete="email" placeholder="name@example.com" required disabled={busy} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {mode !== 'reset' && <div className="space-y-2">
          <div className="flex min-h-8 items-center justify-between gap-2"><Label htmlFor="login-password">{t('كلمة المرور', 'Password')}</Label>{mode === 'in' && <Button type="button" variant="link" className="h-9 px-0 text-xs" disabled={busy} onClick={() => changeMode('reset')}>{t('نسيت كلمة المرور؟', 'Forgot password?')}</Button>}</div>
          <PasswordField ar={ar} id="login-password" required disabled={busy} minLength={mode === 'up' ? 8 : 1} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby={mode === 'up' ? 'password-hint' : undefined} />
          {mode === 'up' && <p id="password-hint" className="text-xs text-muted-foreground">{t('8 أحرف على الأقل.', 'At least 8 characters.')}</p>}
        </div>}
        {message && <p role={message.error ? 'alert' : 'status'} className={`rounded-md border p-3 text-sm leading-6 ${message.error ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-border text-muted-foreground'}`}>{message.text}</p>}
        <Button className="h-12 w-full" disabled={busy} type="submit">{busy && <Loader2 className="animate-spin" />}{busy ? t('جارٍ المتابعة…', 'Please wait…') : mode === 'reset' ? t('أرسل رابط الاستعادة', 'Send recovery link') : mode === 'up' ? t('إنشاء الحساب', 'Create account') : t('دخول', 'Sign in')}</Button>
        {retryAccount && <Button type="button" variant="outline" className="h-12 w-full" onClick={() => { void finish(); }}>{t('أعد فتح الحساب', 'Retry account')}</Button>}
      </form>
      {mode === 'reset' ? <Button variant="ghost" className="mt-4 h-11 w-full" disabled={busy} onClick={() => changeMode('in')}><ArrowLeft className="rtl:rotate-180" />{t('العودة للدخول', 'Back to sign in')}</Button> : <>
        <div className="my-5 flex items-center gap-4" aria-hidden><span className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">{t('أو', 'or')}</span><span className="h-px flex-1 bg-border" /></div>
        <GoogleButton disabled={busy} label={t('المتابعة بحساب Google', 'Continue with Google')} onClick={async () => { if (busy) return; setBusy(true); setMessage(null); try { const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/auth` }); if (result.error) setMessage({ error: true, text: t('تعذر الدخول بحساب Google. حاول مرة أخرى.', 'Google sign-in failed. Please retry.') }); else await finish(); } catch { setMessage({ error: true, text: t('تعذر الاتصال. حاول مرة أخرى.', 'Connection failed. Please retry.') }); } finally { setBusy(false); } }} />
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-1 text-sm"><span className="text-muted-foreground">{mode === 'up' ? t('لديك حساب؟', 'Already have an account?') : t('ليس لديك حساب؟', 'New to Mikro?')}</span><Button variant="link" className="h-11 px-1" disabled={busy} onClick={() => changeMode(mode === 'up' ? 'in' : 'up')}>{mode === 'up' ? t('تسجيل الدخول', 'Sign in') : t('إنشاء حساب', 'Create account')}</Button></div>
      </>}
    </>}
  </AuthLayout>;
}
