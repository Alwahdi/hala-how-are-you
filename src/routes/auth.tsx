import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Globe2 } from 'lucide-react';

export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [
    { title: 'Mikro — تسجيل الدخول' },
    { name: 'description', content: 'Sign in to Mikro to manage your MikroTik routers.' },
    { property: 'og:title', content: 'Mikro — Sign in' },
    { property: 'og:description', content: 'Sign in to Mikro by Alwahdi.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const { ar, toggleLanguage } = useLanguage();
  const t = (a: string, b: string) => (ar ? a : b);
  const navigate = useNavigate();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(null);
    const res = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/routers` } });
    setBusy(false);
    if (res.error) return setMessage(res.error.message);
    if (mode === 'up' && !res.data.session) return setMessage(t('أرسلنا رابط تأكيد إلى بريدك. افتحه ثم سجّل الدخول.', 'We sent a confirmation link to your email. Open it, then sign in.'));
    navigate({ to: '/routers' });
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/auth` });
    if (r.error) return setMessage(r.error.message);
    if (!r.redirected) navigate({ to: '/routers' });
  }

  return (
    <main className="landing-width min-h-screen py-10" lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <div className="flex justify-end"><Button variant="ghost" onClick={toggleLanguage}><Globe2 />{ar ? 'English' : 'العربية'}</Button></div>
      <div className="mx-auto mt-10 max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6">
        <div>
          <h1 className="text-2xl font-bold">{mode === 'in' ? t('دخول إلى Mikro', 'Sign in to Mikro') : t('إنشاء حساب', 'Create account')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('لإضافة راوتراتك ومتابعة حالتها.', 'To add your routers and watch their status.')}</p>
        </div>
        <Button className="w-full" variant="outline" onClick={google}>{t('المتابعة بحساب Google', 'Continue with Google')}</Button>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2"><Label htmlFor="email">{t('البريد الإلكتروني', 'Email')}</Label><Input id="email" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="password">{t('كلمة المرور', 'Password')}</Label><Input id="password" type="password" dir="ltr" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
          <Button className="w-full" type="submit" disabled={busy}>{busy ? t('لحظة...', 'One moment...') : mode === 'in' ? t('دخول', 'Sign in') : t('إنشاء الحساب', 'Create account')}</Button>
        </form>
        <button type="button" className="text-sm text-primary underline-offset-4 hover:underline" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? t('ما عندك حساب؟ أنشئ واحداً', 'No account? Create one') : t('عندك حساب؟ سجّل الدخول', 'Have an account? Sign in')}
        </button>
      </div>
    </main>
  );
}
