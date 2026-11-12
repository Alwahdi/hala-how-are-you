import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, Mail, Phone, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignInMethods({ ar }: { ar: boolean }) {
  const t = (a: string,b: string) => ar ? a : b;
  const { data: user, isError, isPending, refetch } = useQuery({ queryKey: ['account-auth-methods'], queryFn: async () => { const { data,error } = await supabase.auth.getUser(); if(error || !data.user) throw new Error('read_failed'); return data.user; } });
  const [email,setEmail] = useState(''); const [editing,setEditing] = useState(false); const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const hasPhone = !!(user?.phone && user.phone_confirmed_at);
  return <section className="mt-4 py-6" aria-labelledby="sign-in-methods-title">
    <h2 id="sign-in-methods-title" className="mb-5 flex items-center gap-2 text-lg font-bold"><ShieldCheck className="size-5 text-primary" />{t('طرق الدخول','Sign-in methods')}</h2>
    {isPending ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t('جارٍ قراءة طرق الدخول…','Loading sign-in methods…')}</p> : isError ? <div className="space-y-3"><p role="alert" className="text-sm text-destructive">{t('تعذر قراءة طرق الدخول.','Could not load sign-in methods.')}</p><Button variant="outline" className="h-11" onClick={()=>{void refetch();}}>{t('أعد المحاولة','Retry')}</Button></div> : user && <>
      <div className="flex items-start gap-3 border-b border-border pb-5">
        <Mail className="mt-1 size-5 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{t('البريد الإلكتروني','Email')}</h3><p className="mt-1 break-all text-sm text-muted-foreground"><bdi>{user.email || t('غير مرتبط','Not linked')}</bdi></p><p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">{user.email_confirmed_at && <Check className="size-3 text-primary" />}{user.email ? (user.email_confirmed_at ? t('مؤكّد','Verified') : t('بانتظار التأكيد','Awaiting confirmation')) : t('غير مرتبط','Not linked')}</p></div>
        {!editing && <Button variant="outline" className="h-11 shrink-0" onClick={() => {setEditing(true);setMessage(null);}}>{user.email ? t('تغيير','Change') : t('إضافة','Add')}</Button>}
      </div>
      {user.new_email && <p role="status" className="mt-3 text-sm leading-6 text-muted-foreground">{t('بانتظار تأكيد تغيير البريد؛ راجع رسائل التأكيد.','Email change is awaiting confirmation. Check your confirmation messages.')}</p>}
      {editing && <form className="my-5 space-y-3" aria-busy={busy} onSubmit={async(e)=>{ e.preventDefault();if(busy) return;setBusy(true);setMessage(null);try{const result=await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/auth` });setMessage({ error: !!result.error, text: result.error ? t('تعذر طلب ربط البريد. لم نغيّر الحساب؛ حاول مرة أخرى.','Email linking request failed. Account unchanged; retry.') : t('راجع رسائل التأكيد. لن يتغيّر بريد الدخول قبل تأكيده.','Check confirmation messages. Your sign-in email will not change until confirmed.') });if(!result.error){setEditing(false);void refetch();}}catch{setMessage({error:true,text:t('تعذر الاتصال؛ حاول مرة أخرى.','Connection failed; retry.')});}finally{setBusy(false);}}}>
        <Label htmlFor="link-email">{user.email ? t('البريد الجديد','New email') : t('إضافة بريد','Add email')}</Label><Input id="link-email" type="email" required dir="ltr" autoComplete="email" className="h-12 bg-card" autoFocus disabled={busy} value={email} onChange={(e)=>{setEmail(e.target.value);setMessage(null);}} />
        <div className="flex flex-wrap gap-2"><Button className="h-11" disabled={busy || !email.trim() || email.trim()===user.email}>{busy && <Loader2 className="animate-spin" />}{busy ? t('جارٍ الإرسال…','Sending…') : t('أرسل طلب التأكيد','Send confirmation request')}</Button><Button type="button" variant="ghost" className="h-11" disabled={busy} onClick={()=>{setEditing(false);setMessage(null);}}>{t('إلغاء','Cancel')}</Button></div>
      </form>}
      {message && <p role={message.error ? 'alert' : 'status'} className={`my-4 rounded-md border p-3 text-sm leading-6 ${message.error ? 'border-destructive/30 text-destructive' : 'border-primary/30 text-foreground'}`}>{message.text}</p>}
      <div className="mt-5 flex items-start gap-3"><Phone className="mt-1 size-5 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{t('رقم الجوال','Phone')}</h3><p className="mt-1 text-sm text-muted-foreground"><bdi>{hasPhone ? user.phone : t('غير مرتبط','Not linked')}</bdi></p><p className="mt-2 text-xs text-muted-foreground">{hasPhone ? t('مؤكّد','Verified') : t('ربط الرقم للدخول غير متاح حاليًا.','Linking a phone for sign-in is currently unavailable.')}</p></div></div>
    </>}
  </section>;
}
