import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignInMethods({ ar }: { ar: boolean }) {
  const t = (a: string,b: string) => ar ? a : b;
  const { data: user, isError, refetch } = useQuery({ queryKey: ['account-auth-methods'], queryFn: async () => { const { data,error } = await supabase.auth.getUser(); if(error || !data.user) throw new Error('read_failed'); return data.user; } });
  const [email,setEmail] = useState(''); const [busy,setBusy] = useState(false); const [message,setMessage] = useState<string | null>(null);
  return <section className="mt-6 space-y-4 border-t border-border py-5"><h2 className="text-lg font-bold">{t('طرق الدخول','Sign-in methods')}</h2>{isError ? <Button variant="outline" onClick={()=>{refetch();}}>{t('أعد قراءة الحساب','Retry account')}</Button> : <><p className="text-sm">{t('البريد الإلكتروني','Email')}: <bdi>{user?.email ?? t('غير مرتبط','Not linked')}</bdi></p>{user?.new_email && <p className="text-sm text-muted-foreground">{t('تغيير البريد ينتظر التأكيد من الرسالة المرسلة.','Email change is awaiting confirmation from the sent message.')}</p>}<p className="text-sm">{t('رقم الدخول','Sign-in phone')}: <bdi>{user?.phone && user.phone_confirmed_at ? user.phone : t('غير مرتبط ومؤكّد','No verified linked phone')}</bdi></p></>}
  <p className="text-sm text-muted-foreground">{t('ربط الرقم للدخول ينتظر تفعيل خدمة تحقق معتمدة؛ رقم الملف الشخصي وحده ليس طريقة دخول.','Phone sign-in linking awaits supported verification setup; a profile phone alone is not a sign-in method.')}</p>
  {user && <form className="space-y-3" onSubmit={async(e)=>{ e.preventDefault();setBusy(true);setMessage(null);try{const result=await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/auth` });setMessage(result.error ? t('تعذر طلب ربط البريد. لم نغيّر الحساب؛ حاول مرة أخرى.','Email linking request failed. Account unchanged; retry.') : t('راجع رسائل التأكيد. البريد لا يصبح طريقة دخول جديدة قبل تأكيده.','Check confirmation messages. The new email is not a sign-in method until confirmed.'));}catch{setMessage(t('تعذر الاتصال؛ حاول مرة أخرى.','Connection failed; retry.'));}finally{setBusy(false);}}}><Label htmlFor="link-email">{user.email ? t('تغيير البريد','Change email') : t('إضافة بريد','Add email')}</Label><Input id="link-email" type="email" required dir="ltr" autoComplete="email" className="h-12" value={email} onChange={(e)=>setEmail(e.target.value)} /><Button variant="outline" className="h-12" disabled={busy || !email.trim()}>{t('أرسل طلب التأكيد','Send confirmation request')}</Button>{message && <p role="status" className="text-sm">{message}</p>}</form>}
  </section>;
}
