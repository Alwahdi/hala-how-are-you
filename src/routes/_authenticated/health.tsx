import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Check, Copy, Info, OctagonAlert, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { checkHealth, healthScore, type HealthInput, type Issue } from '@/lib/router-health';
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
  const { data: routers = [], isLoading } = useQuery({ queryKey: ['routers-health'], queryFn: async () => { const { data } = await supabase.from('routers').select('id, name, last_status, last_seen_at, card_runs').order('created_at'); return data ?? []; } });
  return (
    <main className="app-shell min-h-screen pb-16 pt-6" lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <div aria-hidden className="landing-pattern" />
      <Link to="/dashboard" search={{ tab: 'more' }} className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4 rtl:rotate-180" />{t('رجوع', 'Back')}</Link>
      <h1 className="mt-2 text-2xl font-bold">{t('صحة الراوتر', 'Router health')}</h1>
      <p className="text-sm text-muted-foreground">{t('فحص للقراءة فقط — ما نغيّر أي شيء. يتحدث مع كل إشارة من الراوتر.', 'Read-only — we change nothing. Updates with every router report.')}</p>
      {isLoading ? null : routers.map((r) => {
        const st = (r.last_status ?? {}) as Record<string, never>;
        const fields = 'ntp' in st;
        const secs = cardReadSecs(r.card_runs as CardRuns | null);
        const issues = checkHealth({ ...(st as HealthInput), cardsSecs: secs });
        const score = healthScore(issues);
        return (
          <section key={r.id} className="app-panel mt-6 p-5">
            <div className="flex items-center gap-4">
              <div className="gauge" data-tone={score < 70 ? 'warn' : undefined} style={{ ['--v' as string]: score }} role="img" aria-label={t(`النتيجة ${score} من 100`, `Score ${score} of 100`)}><span dir="ltr">{score}</span></div>
              <div><h2 className="text-lg font-bold">{r.name}</h2><p className="text-sm text-muted-foreground">{issues.length === 0 ? t('ما لقينا مشاكل.', 'No problems found.') : t(`${issues.length} نقطة تحتاج انتباه`, `${issues.length} things need attention`)}</p></div>
            </div>
            {secs != null && <p className="mt-3 text-sm text-muted-foreground">{t(`آخر قراءة كاملة للكروت أخذت ${readTime(secs, true)}.`, `The last full card read took ${readTime(secs, false)}.`)}</p>}
            {!fields && <p className="mt-4 rounded-xl bg-muted p-3 text-sm">{t('الفحص الكامل (الوقت، الخدمات، علامات الاختراق، إعدادات Hotspot) يبدأ بعد «إعادة الربط» مرة واحدة. الآن نفحص المساحة والذاكرة والإصدار فقط.', 'The full check (time, services, break-in signs, Hotspot settings) starts after one Reconnect. For now we check storage, memory and version only.')}</p>}
            {issues.length === 0 ? <p className="mt-4 flex items-center gap-2 text-sm text-primary"><ShieldCheck className="size-5" />{t('راوترك بحالة ممتازة.', 'Your router is in great shape.')}</p> : (
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
  const s = SEV[i.severity];
  return (
    <li className="rounded-xl border border-border p-4">
      <p className="flex items-start gap-2"><span className="shrink-0">{s.icon}</span><span className="flex-1"><b className="block">{ar ? i.ar[0] : i.en[0]}</b><span className="text-sm text-muted-foreground">{ar ? i.ar[1] : i.en[1]}</span></span><span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{ar ? s.ar : s.en}</span></p>
      {i.fix && (
        <div className="mt-3 flex items-center gap-2">
          <code dir="ltr" className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs">{i.fix}</code>
          <Button variant="outline" className="h-11 shrink-0" onClick={() => { navigator.clipboard.writeText(i.fix! + '\n'); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? <Check /> : <Copy />}{ar ? (copied ? 'نُسخ' : 'نسخ الحل') : (copied ? 'Copied' : 'Copy fix')}</Button>
        </div>
      )}
    </li>
  );
}

function readTime(secs: number, ar: boolean) {
  if (secs < 90) return ar ? `${secs} ثانية` : `${secs} seconds`;
  const m = Math.round(secs / 60);
  return ar ? `${m} دقائق` : `${m} minutes`;
}
