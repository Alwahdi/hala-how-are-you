import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Globe2, Loader2, Mail, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useLanguage } from '@/components/language-provider';
import { PageLanguage } from '@/components/page-language';
import { GoogleButton } from '@/components/google-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalizePhone } from '@/lib/phone-otp';

export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [{ title: 'Mikro — تسجيل الدخول' }, { name: 'description', content: 'Sign in or create your Mikro account with email and password. Manage linked sign-in methods in account settings.' }, { property: 'og:title', content: 'Mikro — Sign in' }, { property: 'og:description', content: 'Access your Mikro network account securely.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: AuthPage,
});

function AuthPage() {
  const { ar, toggleLanguage } = useLanguage();
  const t = (a: string, b: string) => ar ? a : b;
  const navigate = useNavigate();
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [retryAccount, setRetryAccount] = useState(false);

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
      if (method === 'phone') {
        const number = normalizePhone(phone);
        if (!number) { setMessage({ error: true, text: t('أدخل رقم الجوال مع رمز الدولة، مثل +967.', 'Enter your mobile number with its country code, such as +967.') }); return; }
        const result = await supabase.auth.signInWithPassword({ phone: number, password });
        if (result.error) { setMessage({ error: true, text: t('تعذر الدخول. تحقق من الرقم وكلمة المرور وأن الرقم مرتبط بالحساب.', 'Could not sign in. Check the number and password and that the phone is linked to your account.') }); return; }
        await finish(); return;
      }
      if (mode === 'reset') {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        setMessage({ error: !!result.error, text: result.error ? t('تعذر إرسال رابط الاستعادة. حاول لاحقًا.', 'Could not send a recovery link. Retry later.') : t('إذا كان البريد مسجلًا، سيصلك رابط لاستعادة كلمة المرور.', 'If this email is registered, you will receive a password recovery link.') }); return;
      }
      const result = mode === 'in' ? await supabase.auth.signInWithPassword({ email: email.trim(), password }) : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
      if (result.error) { setMessage({ error: true, text: t('تعذر إكمال الطلب. تحقق من البريد وكلمة المرور وحاول مرة أخرى.', 'Could not complete the request. Check your email and password and retry.') }); return; }
      if (result.data.session) await finish();
      else { setPassword(''); setMessage({ error: false, text: t('راجع بريدك لتأكيد الحساب، ثم ادخل بالبريد وكلمة المرور. لا تحتاج رقم هاتف.', 'Check your email to confirm your account, then sign in with email and password. No phone required.') }); }
    } catch { setMessage({ error: true, text: t('تعذر الاتصال. بقيت بياناتك هنا؛ حاول مرة أخرى.', 'Connection failed. Your entries are still here; retry.') }); }
    finally { setBusy(false); }
  }

  return <main className="app-shell min-h-screen py-6" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}>
    <PageLanguage titles={['تسجيل الدخول', 'Sign in']} /><div aria-hidden className="landing-pattern" />
    <header className="flex items-center justify-between"><Link to="/" className="text-lg font-bold">Mikro</Link><Button variant="ghost" onClick={toggleLanguage}><Globe2 />{ar ? 'English' : 'العربية'}</Button></header>
    <div className="mx-auto mt-10 max-w-sm space-y-6">
      <h1 className="text-2xl font-bold">{mode === 'reset' ? t('استعادة كلمة المرور', 'Reset password') : t('أهلًا بك في Mikro', 'Welcome to Mikro')}</h1>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('طريقة الدخول', 'Sign-in method')}>
        <Button variant={method === 'phone' ? 'default' : 'outline'} className="h-12" aria-pressed={method === 'phone'} disabled={busy} onClick={() => { setMethod('phone'); setMode('in'); setMessage(null); }}><Phone />{t('رقم الجوال', 'Phone')}</Button>
        <Button variant={method === 'email' ? 'default' : 'outline'} className="h-12" aria-pressed={method === 'email'} disabled={busy} onClick={() => { setMethod('email'); setMode('in'); setMessage(null); }}><Mail />{t('البريد الإلكتروني', 'Email')}</Button>
      </div>
      {method === 'phone' && <p className="text-sm text-muted-foreground">{t('الدخول بالرقم وكلمة المرور متاح للحسابات ذات الرقم المرتبط والمؤكّد. إنشاء حساب بالرقم ورمز WhatsApp غير متاح بعد؛ يمكنك إنشاء حساب بالبريد الآن.', 'Phone/password sign-in is for accounts with a linked, verified phone. Phone signup with a WhatsApp code is not available yet; you can create an email account now.')}</p>}
      {method === 'email' && mode !== 'reset' && <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('الدخول أو إنشاء الحساب', 'Sign in or create account')}><Button variant={mode === 'in' ? 'default' : 'outline'} disabled={busy} onClick={() => { setMode('in'); setMessage(null); }}>{t('تسجيل الدخول', 'Sign in')}</Button><Button variant={mode === 'up' ? 'default' : 'outline'} disabled={busy} onClick={() => { setMode('up'); setMessage(null); }}>{t('حساب جديد', 'New account')}</Button></div>}
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2"><Label htmlFor="login-id">{method === 'email' ? t('البريد الإلكتروني', 'Email address') : t('رقم الجوال مع رمز الدولة', 'Phone with country code')}</Label><Input id="login-id" className="h-12" type={method === 'email' ? 'email' : 'tel'} dir="ltr" autoComplete={method === 'email' ? 'email' : 'tel'} required value={method === 'email' ? email : phone} onChange={(e) => method === 'email' ? setEmail(e.target.value) : setPhone(e.target.value)} /></div>
        {mode !== 'reset' && <div className="space-y-2"><Label htmlFor="login-password">{t('كلمة المرور', 'Password')}</Label><Input id="login-password" className="h-12" type="password" dir="ltr" required minLength={mode === 'up' ? 8 : 1} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />{mode === 'up' && <p className="text-xs text-muted-foreground">{t('8 أحرف على الأقل.', 'At least 8 characters.')}</p>}</div>}
        {message && <p role={message.error ? 'alert' : 'status'} className={message.error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{message.text}</p>}
        <Button className="h-12 w-full" disabled={busy} type="submit">{busy && <Loader2 className="animate-spin" />}{mode === 'reset' ? t('أرسل رابط الاستعادة', 'Send recovery link') : mode === 'up' ? t('إنشاء الحساب', 'Create account') : t('دخول', 'Sign in')}</Button>
        {retryAccount && <Button type="button" variant="outline" className="h-12 w-full" onClick={() => { void finish(); }}>{t('أعد فتح الحساب', 'Retry account')}</Button>}
      </form>
      {method === 'email' && <Button variant="ghost" className="w-full" disabled={busy} onClick={() => { setMode(mode === 'reset' ? 'in' : 'reset'); setMessage(null); }}>{mode === 'reset' ? t('العودة للدخول', 'Back to sign in') : t('نسيت كلمة المرور؟', 'Forgot password?')}</Button>}
      <GoogleButton label={t('المتابعة بحساب Google', 'Continue with Google')} onClick={async () => { const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/auth` }); if (result.error) setMessage({ error: true, text: t('تعذر الدخول بحساب Google.', 'Google sign-in failed.') }); else await finish(); }} />
      <Link to="/privacy" className="block text-center text-xs text-muted-foreground">{t('الخصوصية', 'Privacy')}</Link>
    </div>
  </main>;
}
