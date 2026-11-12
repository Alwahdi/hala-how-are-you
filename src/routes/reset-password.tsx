import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { PageLanguage } from '@/components/page-language';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/account/auth-layout';
import { PasswordField } from '@/components/account/password-field';

export const Route = createFileRoute('/reset-password')({ head: () => ({ meta: [{ title: 'Mikro — استعادة كلمة المرور' }, { name: 'description', content: 'Set a new password for your Mikro account using your recovery link.' }, { property: 'og:title', content: 'Mikro — Password recovery' }, { property: 'og:description', content: 'Securely recover access to your Mikro account.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: ResetPassword });
function ResetPassword() {
  const { ar } = useLanguage(); const t = (a: string,b: string) => ar ? a : b;
  const [ready,setReady] = useState(false); const [checking,setChecking] = useState(true);
  const [password,setPassword] = useState(''); const [confirm,setConfirm] = useState(''); const [busy,setBusy] = useState(false); const [done,setDone] = useState(false); const [error,setError] = useState(false);
  const mismatch = confirm.length > 0 && password !== confirm;
  useEffect(() => {
    const recovery = new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
    const sub = supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') { setReady(true); setChecking(false); } });
    if (recovery) supabase.auth.getUser().then(({ data }) => { setReady(!!data.user); setChecking(false); }).catch(() => setChecking(false));
    else setChecking(false);
    return () => sub.data.subscription.unsubscribe();
  }, []);
  return <AuthLayout><PageLanguage titles={['استعادة كلمة المرور','Password recovery']} />
    <div className="mb-7 space-y-3">{done ? <CheckCircle2 className="size-9 text-primary" /> : <KeyRound className="size-7 text-primary" />}<h1 className="text-3xl font-bold">{done ? t('تم تغيير كلمة المرور','Password updated') : t('كلمة مرور جديدة','New password')}</h1></div>
    {checking ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t('جارٍ التحقق من الرابط…','Checking your link…')}</p> : done ? <p role="status" className="text-sm text-muted-foreground">{t('يمكنك الدخول بكلمة المرور الجديدة.','You can sign in with your new password.')}</p> : !ready ? <p className="text-sm leading-7 text-muted-foreground">{t('افتح رابط الاستعادة المرسل إلى بريدك. إذا انتهت صلاحيته، اطلب رابطًا جديدًا.','Open the recovery link sent to your email. Request a new link if it has expired.')}</p> : <form className="space-y-5" aria-busy={busy} onSubmit={async (e) => { e.preventDefault(); if (busy || mismatch || password.length < 8) return; setBusy(true); setError(false); try { const result = await supabase.auth.updateUser({ password }); if (result.error) setError(true); else setDone(true); } catch { setError(true); } finally { setBusy(false); } }}>
      <div className="space-y-2"><Label htmlFor="new-password">{t('كلمة المرور','Password')}</Label><PasswordField ar={ar} id="new-password" autoComplete="new-password" value={password} onChange={(e)=>setPassword(e.target.value)} minLength={8} required disabled={busy} aria-describedby="new-password-hint" /><p id="new-password-hint" className="text-xs text-muted-foreground">{t('8 أحرف على الأقل.','At least 8 characters.')}</p></div>
      <div className="space-y-2"><Label htmlFor="confirm-password">{t('تأكيد كلمة المرور','Confirm password')}</Label><PasswordField ar={ar} id="confirm-password" autoComplete="new-password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required disabled={busy} aria-invalid={mismatch} aria-describedby={mismatch ? 'password-mismatch' : undefined} />{mismatch && <p id="password-mismatch" role="status" className="text-sm text-destructive">{t('كلمتا المرور غير متطابقتين.','Passwords do not match.')}</p>}</div>
      {error && <p role="alert" className="text-sm text-destructive">{t('تعذر تغيير كلمة المرور. تحقق من صلاحية الرابط وقوة كلمة المرور.','Password update failed. Check the recovery link and password strength.')}</p>}
      <Button className="h-12 w-full" disabled={busy || password.length<8 || password!==confirm}>{busy && <Loader2 className="animate-spin" />}{busy ? t('جارٍ الحفظ…','Saving…') : t('احفظ كلمة المرور','Save password')}</Button>
    </form>}
    <Button asChild variant="outline" className="mt-6 h-12 w-full"><Link to="/auth">{t('العودة للدخول','Back to sign in')}</Link></Button>
  </AuthLayout>;
}
