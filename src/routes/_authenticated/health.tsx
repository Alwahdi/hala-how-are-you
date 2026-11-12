import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Check, Copy, Info, OctagonAlert, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { checkHealth, healthScore, readTime, type HealthInput, type Issue } from '@/lib/router-health';
import { QueryNotice } from '@/components/query-notice';
import { freshReport, relativeRead } from '@/lib/operations-ui';
import { cardReadSecs, type CardRuns } from '@/lib/card-runs';

export const Route = createFileRoute('/_authenticated/health')({
  head: () => ({ meta: [
    { title: 'Mikro — صحة الراوتر' },
    { name: 'description', content: 'A read-only health check of your MikroTik router with plain fixes.' },
    { property: 'og:title', content: 'Mikro — Router health' },
    { property: 'og:description', content: 'Storage, time sync, security and hotspot settings checked automatically.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: HealthPage,
});

const SEV = { critical: { icon: <OctagonAlert className="size-5 text-destructive" />, ar: 'خطير', en: 'Critical' }, warn: { icon: <AlertTriangle className="size-5 text-destructive" />, ar: 'تحذير', en: 'Warning' }, info: { icon: <Info className="size-5 text-primary" />, ar: 'تحسين', en: 'Tip' } };

function HealthPage() {
  const { ar } = useLanguage();
  const t = (a: string, b: string) => (ar ? a : b);
  const { data: routers = [], isLoading, isError, refetch } = useQuery({ queryKey: ['routers-health'], queryFn: async () => { const { data, error } = await supabase.from('routers').select('id, name, last_status, last_seen_at, card_runs').order('created_at'); if (error) throw error; return data ?? []; }, refetchInterval: 15000 });
  return (
    <main className="app-shell min-h-screen pb-16 pt-6" lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <div aria-hidden className="landing-pattern" />
      <Link to="/dashboard" search={{ tab: 'more' }} className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4 rtl:rotate-180" />{t('رجوع', 'Back')}</Link>
      <h1 className="mt-2 text-2xl font-bold">{t('صحة الراوتر', 'Router health')}</h1>
      <p className="text-sm text-muted-foreground">{t('فحص للقراءة فقط — ما نغيّر أي شيء. نعرض آخر تقرير، ونتحقق من تحديثه كل 15 ثانية.', 'Read-only — we change nothing. Shows the last report; checks for updates every 15 seconds.')}</p>
      {isError && <QueryNotice ar={ar} stale={routers.length > 0} retry={() => { refetch(); }} />}
      {isLoading ? <p role="status" className="mt-4">{t('نحمّل الفحص…', 'Loading checks…')}</p> : routers.map((r) => {
        const st = (r.last_status ?? {}) as Record<string, never>;
        const fields = ['version','ntp','services','clockDate','totalHdd','totalMemory'].every((k) => k in st);
        const current = freshReport(r.last_seen_at) && !isError;
        const reliable = current && fields;
        const secs = cardReadSecs(r.card_runs as CardRuns | null);
        const issues = checkHealth({ ...(st as HealthInput), cardsSecs: secs });
        const score = healthScore(issues);
        return (
          <section key={r.id} className="app-panel mt-6 p-5">
            <div className="flex items-center gap-4">
              <div className="gauge" data-tone={score < 70 ? 'warn' : undefined} style={{ ['--v' as string]: reliable ? score : 0 }} role="img" aria-label={reliable ? t(`مؤشر الفحوص ${score} من 100`, `Checks indicator ${score} of 100`) : t('النتيجة غير معروفة', 'Score unknown')}><span dir="ltr">{reliable ? score : '—'}</span></div>
              <div><h2 className="text-lg font-bold">{r.name}</h2><p className="text-sm text-muted-foreground">{!reliable ? t('لا تكفي البيانات لحكم حالي.', 'Insufficient data for a current assessment.') : issues.length === 0 ? t('لا توجد ملاحظات في الفحوص المتاحة.', 'No issues in available checks.') : t(`${issues.length} نقطة تحتاج انتباه`, `${issues.length} things need attention`)}</p></div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t('آخر تقرير', 'Last report')}: {relativeRead(r.last_seen_at, ar)} · {current ? t('حديث', 'Recent') : t('قديم — ليست حالة حية', 'Stale — not live')}</p>
            <p className="text-xs text-muted-foreground">{t('المؤشر يلخص الفحوص المتاحة، وليس شهادة أمان أو ضمانًا لسلامة الشبكة.', 'The indicator summarizes available checks, not a security certificate or a network guarantee.')}</p>
            {secs != null && <p className="mt-3 text-sm text-muted-foreground">{t(`آخر قراءة كاملة للكروت أخذت ${readTime(secs, true)}.`, `The last full card read took ${readTime(secs, false)}.`)}</p>}
            {!fields && <p className="mt-4 rounded-xl bg-muted p-3 text-sm">{t('الفحص الكامل (الوقت، الخدمات، علامات الاختراق، إعدادات Hotspot) يبدأ بعد «إعادة الربط» مرة واحدة. الآن نفحص المساحة والذاكرة والإصدار فقط.', 'The full check (time, services, break-in signs, Hotspot settings) starts after one Reconnect. For now we check storage, memory and version only.')}</p>}
            {issues.length === 0 && reliable ? <p className="mt-4 flex items-center gap-2 text-sm text-primary"><ShieldCheck className="size-5" />{t('لم ترصد الفحوص المتاحة مشكلة في التقرير الحديث.', 'Available checks found no issue in the recent report.')}</p> : (
              <ul className="mt-4 space-y-3">{issues.map((i) => <IssueRow key={i.id} i={i} ar={ar} />)}</ul>
            )}
          </section>
        );
      })}
    </main>
  );
}

function IssueRow({ i, ar }: { i: Issue; ar: boolean }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const s = SEV[i.severity];
  return (
    <li className="rounded-xl border border-border p-4">
      <p className="flex items-start gap-2"><span className="shrink-0">{s.icon}</span><span className="flex-1"><b className="block">{ar ? i.ar[0] : i.en[0]}</b><span className="text-sm text-muted-foreground">{ar ? i.ar[1] : i.en[1]}</span></span><span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{ar ? s.ar : s.en}</span></p>
      {copyError && <p role="alert" className="mt-2 text-sm text-destructive">{ar ? 'تعذر النسخ؛ انسخ النص يدويًا.' : 'Copy failed; copy the text manually.'}</p>}
      {i.fix && (
        <div className="mt-3 flex items-center gap-2">
          <code dir="ltr" className="min-w-0 flex-1 break-all rounded-lg bg-muted px-3 py-2 text-xs">{i.fix}</code>
          <Button variant="outline" className="h-11 shrink-0" onClick={async () => { if (!i.fix) return; try { await navigator.clipboard.writeText(i.fix + '\n'); setCopied(true); setCopyError(false); } catch { setCopyError(true); } }}>{copied ? <Check /> : <Copy />}{ar ? (copied ? 'نُسخ' : 'نسخ الحل') : (copied ? 'Copied' : 'Copy fix')}</Button>
        </div>
      )}
    </li>
  );
}

