import { PageLanguage } from '@/components/page-language';
import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Bell, CheckCircle2, ChevronRight, Info, ListChecks, OctagonAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { PageHeading } from '@/components/account/page-heading';
import { QueryNotice } from '@/components/query-notice';
import { actionHistoryLabel } from '@/lib/action-history';

export const Route = createFileRoute('/_authenticated/alerts')({
  head: () => ({ meta: [
    { title: 'Mikro — التنبيهات وسجل الشبكة' },
    { name: 'description', content: 'Every alert and router action, saved even if the router restarts.' },
    { property: 'og:title', content: 'Mikro — Alerts and network log' },
    { property: 'og:description', content: 'Alerts, restarts and card cleanups for your network.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: AlertsPage,
});

type Alert = { id: string; title: string; body: string; path: string; severity: string; read_at: string | null; created_at: string };
type Job = { id: string; kind: string; status: string; auto: boolean; result: string | null; requested_at: string; payload: { names?: string[] }; router_id: string };

const ICON = { critical: <OctagonAlert className="size-5 text-destructive" />, warn: <AlertTriangle className="size-5 text-destructive" />, ok: <CheckCircle2 className="size-5 text-primary" />, info: <Info className="size-5 text-primary" /> } as Record<string, React.ReactNode>;

function when(iso: string, ar: boolean) {
  const d = new Date(iso); const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 3600) return ar ? `قبل ${Math.max(1, Math.round(s / 60))} د` : `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return ar ? `قبل ${Math.round(s / 3600)} س` : `${Math.round(s / 3600)}h ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function AlertsPage() {
  const { ar } = useLanguage();
  const t = (a: string, b: string) => (ar ? a : b);
  const navigate = useNavigate(); const qc = useQueryClient();
  const [tab, setTab] = useState<'alerts' | 'log'>('alerts');
  const { data: alerts = [], isPending: alertsLoading, isError: alertsError, refetch: retryAlerts } = useQuery({ queryKey: ['alerts'], queryFn: async () => { const { data,error } = await supabase.from('alerts').select('id, title, body, path, severity, read_at, created_at').order('created_at', { ascending: false }).limit(200); if(error)throw error;return (data ?? []) as Alert[]; }, refetchInterval: 30_000 });
  const { data: jobs = [], isPending: jobsLoading, isError: jobsError, refetch: retryJobs } = useQuery({ queryKey: ['jobs'], queryFn: async () => { const { data, error } = await supabase.from('router_jobs').select('id, kind, status, auto, result, requested_at, payload, router_id').order('requested_at', { ascending: false }).limit(200); if(error)throw error;return (data ?? []) as Job[]; }, refetchInterval: 15_000 });
  const {data:routers=[]}=useQuery({queryKey:['history-router-names'],queryFn:async()=>{const {data,error}=await supabase.from('routers').select('id,name');if(error)throw error;return data??[];}});
  // Opening the page marks everything as read.
  useEffect(() => {
    const unread = alerts.filter((a) => !a.read_at).map((a) => a.id);
    if (unread.length) supabase.from('alerts').update({ read_at: new Date().toISOString() }).in('id', unread).then(() => qc.invalidateQueries({ queryKey: ['alerts-unread'] }));
  }, [alerts, qc]);
  const jobLabel = (j: Job) => actionHistoryLabel(j.kind,j.payload,ar,j.auto);
  const jobStatus = (j: Job) => ({ pending: t('بانتظار الراوتر', 'Waiting for router'), sent: t('وصل للراوتر', 'Sent to router'), done: j.result?.startsWith('removed:') ? t(`تم — حُذف ${j.result.slice(8)}`, `Done — removed ${j.result.slice(8)}`) : t('تم', 'Done'), failed: t('فشل', 'Failed'), expired: t('انتهت المهلة (الراوتر غير متصل)', 'Timed out (router offline)') }[j.status] ?? j.status);

  return (
    <main className="app-shell min-h-screen pb-16 pt-6" lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <PageLanguage titles={['التنبيهات والإجراءات', 'Alerts and actions']} />
      <div aria-hidden className="landing-pattern" />
      <PageHeading title={t('التنبيهات والسجل','Alerts & history')} back="/account" />
      <div className="seg mt-4" role="group">
        <Button variant="ghost" aria-pressed={tab === 'alerts'} onClick={() => setTab('alerts')}><Bell className="me-1 inline size-4" />{t('التنبيهات', 'Alerts')}</Button>
        <Button variant="ghost" aria-pressed={tab === 'log'} onClick={() => setTab('log')}><ListChecks className="me-1 inline size-4" />{t('سجل الإجراءات', 'Action log')}</Button>
      </div>
      {(tab==='alerts'?alertsError:jobsError)&&<QueryNotice ar={ar} stale={tab==='alerts'?alerts.length>0:jobs.length>0} retry={()=>{void(tab==='alerts'?retryAlerts():retryJobs());}}/>}
      {(tab==='alerts'?alertsLoading:jobsLoading)&&<p role="status" className="py-6 text-sm text-muted-foreground">{t('جارٍ قراءة السجل…','Loading history…')}</p>}
      {tab === 'alerts' ? (
        alerts.length === 0 ? (!alertsLoading&&!alertsError&&<p className="mt-4 border-b border-border py-8 text-sm text-muted-foreground">{t('لا توجد تنبيهات مسجّلة.','No recorded alerts.')}</p>) : (
          <ul className="mt-4 space-y-2">
            {alerts.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => navigate({ href: a.path })} className={`app-panel tap-card flex w-full items-start gap-3 p-4 text-start ${a.read_at ? '' : 'border-primary/50'}`}>
                  <span className="mt-0.5 shrink-0">{ICON[a.severity] ?? ICON['info']}</span>
                  <span className="min-w-0 flex-1"><b className="block" dir="auto">{a.title}</b><span className="block text-sm text-muted-foreground" dir="auto">{a.body}</span><span className="mt-1 block text-xs text-muted-foreground">{when(a.created_at, ar)}</span></span>
                  <ChevronRight className="tap-chevron mt-1" />
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        jobs.length === 0 ? (!jobsLoading&&!jobsError&&<p className="mt-4 border-b border-border py-8 text-sm text-muted-foreground">{t('لا توجد إجراءات مسجّلة.','No recorded actions.')}</p>) : (
          <ul className="mt-4 space-y-2">
            {jobs.map((j) => (
              <li key={j.id} className="app-panel flex items-center gap-3 p-4">
                <span className={`size-2.5 shrink-0 rounded-full ${j.status === 'done' ? 'bg-primary' : j.status === 'expired' || j.status === 'failed' ? 'bg-destructive' : 'animate-pulse bg-primary/60'}`} aria-hidden />
                <span className="min-w-0 flex-1"><b className="block">{jobLabel(j)}</b><span className="mt-1 block text-sm text-muted-foreground">{routers.find(r=>r.id===j.router_id)?.name||t('راوتر','Router')}{j.payload.names?.length?` · ${j.payload.names.length} ${t('كرت','cards')}`:''}</span><span className="text-xs text-muted-foreground">{jobStatus(j)} · {when(j.requested_at, ar)}</span></span>
              </li>
            ))}
          </ul>
        )
      )}
    </main>
  );
}
