import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Settings, Bell, ChevronRight, LogOut, Loader2, UserRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { PageLanguage } from '@/components/page-language';
import { PageHeading } from '@/components/account/page-heading';
import { SignInMethods } from '@/components/account/sign-in-methods';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_authenticated/account')({ head:()=>({meta:[{title:'Mikro — حسابك'},{name:'description',content:'Manage your Mikro account, verified sign-in methods and network preferences.'},{property:'og:title',content:'Mikro — Your account'},{property:'og:description',content:'Your account and verified sign-in methods.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:Account });
function Account(){
  const { ar } = useLanguage(); const t=(a:string,b:string)=>ar?a:b; const navigate=useNavigate();
  const [busy,setBusy]=useState(false);const [error,setError]=useState(false);
  const {data:profile,isPending,isError,refetch}=useQuery({queryKey:['account-summary'],queryFn:async()=>{const {data:u}=await supabase.auth.getUser();if(!u.user)return null;const {data,error}=await supabase.from('profiles').select('network_name,city').eq('id',u.user.id).maybeSingle();if(error)throw error;return data;}});
  return <main className="app-shell min-h-screen py-6"><PageLanguage titles={['حسابك','Your account']} /><PageHeading title={t('حسابك','Your account')} />
    {isPending&&<p role="status" className="mt-4 text-sm text-muted-foreground">{t('جارٍ قراءة الحساب…','Loading account…')}</p>}
    {isError&&<div className="mt-4"><p role="alert" className="text-sm text-destructive">{t('تعذر قراءة بيانات الحساب.','Could not load account details.')}</p><Button variant="outline" onClick={()=>{void refetch();}}>{t('أعد المحاولة','Retry')}</Button></div>}
    <div className="account-layout mt-6">
      <div><div className="flex items-center gap-4 border-b border-border pb-6"><span className="grid size-14 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><UserRound /></span><div className="min-w-0"><h2 className="break-words text-lg font-semibold">{profile?.network_name || t('حساب Mikro','Mikro account')}</h2>{profile?.city && <p className="mt-1 text-sm text-muted-foreground">{profile.city}</p>}</div></div><SignInMethods ar={ar} /></div>
      <div className="space-y-2">
        <Button asChild variant="ghost" className="account-destination"><Link to="/settings"><Settings className="text-primary" /><span className="min-w-0 flex-1 text-start"><b className="block">{t('إعدادات الشبكة','Network settings')}</b><span className="text-xs text-muted-foreground">{t('شكل الكروت، التنبيهات وبيانات الشبكة','Card style, alerts and network details')}</span></span><ChevronRight className="rtl:rotate-180" /></Link></Button>
        <Button asChild variant="ghost" className="account-destination"><Link to="/alerts"><Bell className="text-primary" /><span className="flex-1 text-start">{t('التنبيهات وسجل الإجراءات','Alerts and action history')}</span><ChevronRight className="rtl:rotate-180" /></Link></Button>
        <div className="border-t border-border pt-4"><Button variant="ghost" className="h-12 w-full justify-start text-destructive" disabled={busy} onClick={async()=>{setBusy(true);setError(false);try{const r=await supabase.auth.signOut();if(r.error)throw r.error;await navigate({to:'/auth'});}catch{setError(true);}finally{setBusy(false);}}}>{busy ? <Loader2 className="animate-spin" /> : <LogOut />}{t('تسجيل الخروج','Sign out')}</Button>{error&&<p role="alert" className="text-sm text-destructive">{t('تعذر تسجيل الخروج؛ حاول مرة أخرى.','Could not sign out. Please retry.')}</p>}</div>
      </div>
    </div>
  </main>;
}