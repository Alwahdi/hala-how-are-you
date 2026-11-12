import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { PageLanguage } from '@/components/page-language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/reset-password')({ head: () => ({ meta: [{ title: 'Mikro — استعادة كلمة المرور' }, { name: 'description', content: 'Set a new password for your Mikro account using your recovery link.' }, { property: 'og:title', content: 'Mikro — Password recovery' }, { property: 'og:description', content: 'Securely recover access to your Mikro account.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: ResetPassword });
function ResetPassword() {
  const { ar } = useLanguage(); const t = (a: string,b: string) => ar ? a : b;
  const [ready,setReady] = useState(false); const [password,setPassword] = useState(''); const [confirm,setConfirm] = useState(''); const [busy,setBusy] = useState(false); const [done,setDone] = useState(false); const [error,setError] = useState(false);
  useEffect(() => {
    const recovery = new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
    const sub = supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') setReady(true); });
    if (recovery) supabase.auth.getUser().then(({ data }) => setReady(!!data.user));
    return () => sub.data.subscription.unsubscribe();
  }, []);
  return <main className="app-shell min-h-screen py-8" dir={ar ? 'rtl' : 'ltr'}><PageLanguage titles={['استعادة كلمة المرور','Password recovery']} /><div className="mx-auto max-w-sm space-y-5"><h1 className="text-2xl font-bold">{t('كلمة مرور جديدة','New password')}</h1>{done ? <p role="status">{t('تم تغيير كلمة المرور.','Password updated.')}</p> : !ready ? <p>{t('افتح رابط الاستعادة المرسل إلى بريدك. إذا انتهت صلاحيته، اطلب رابطًا جديدًا.','Open the recovery link sent to your email. Request a new link if it has expired.')}</p> : <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(false); try { const result = await supabase.auth.updateUser({ password }); if (result.error) setError(true); else setDone(true); } catch { setError(true); } finally { setBusy(false); } }}><Label htmlFor="new-password">{t('كلمة المرور','Password')}</Label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e)=>setPassword(e.target.value)} minLength={8} required className="h-12" /><Label htmlFor="confirm-password">{t('تأكيد كلمة المرور','Confirm password')}</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required className="h-12" />{error && <p role="alert" className="text-destructive">{t('تعذر تغيير كلمة المرور. تحقق من صلاحية الرابط وقوة كلمة المرور.','Password update failed. Check the recovery link and password strength.')}</p>}<Button className="h-12 w-full" disabled={busy || password.length<8 || password!==confirm}>{t('احفظ كلمة المرور','Save password')}</Button></form>}<Button asChild variant="outline"><Link to="/auth">{t('العودة للدخول','Back to sign in')}</Link></Button></div></main>;
}
