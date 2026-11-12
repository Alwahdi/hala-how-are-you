import { AlertTriangle, CalendarClock, ChevronRight, Clock, Database, Gauge, Smartphone, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { humanDevices, humanRate, humanValidity } from '@/lib/card-actions';
import { humanData, type PkgFacts } from '@/lib/packages';
import { formatDuration } from '@/lib/card-status';
import type { ProfileRow } from './types';

export type PkgSummary = { id: string; routerId: string; routerName: string; name: string; total: number; ready: number; live: number; today: number; p?: ProfileRow; facts: PkgFacts };

const LOW_READY = 20;

/** One package as an owner reads it: price, then data, usage time, validity, speed and devices, then how many are ready. */
export function PackageCard({ e, selected, ar, onClick }: { e: PkgSummary; selected: boolean; ar: boolean; onClick: () => void }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const f = e.facts;
  const none = t('بلا حد', 'No limit');
  const rows: { icon: React.ReactNode; label: string; value: string; muted?: boolean }[] = [
    { icon: <Database />, label: t('بيانات', 'Data'), value: f.dataBytes ? `${humanData(f.dataBytes, ar)}${f.fromCards ? t(' (حسب الكروت)', ' (from cards)') : ''}` : none, muted: !f.dataBytes },
    { icon: <Clock />, label: t('وقت', 'Time'), value: f.uptimeS ? formatDuration(f.uptimeS, ar) : none, muted: !f.uptimeS },
    { icon: <CalendarClock />, label: t('صلاحية', 'Valid'), value: f.validityS ? humanValidity(e.p?.validity, ar) ?? none : none, muted: !f.validityS },
    { icon: <Gauge />, label: t('سرعة', 'Speed'), value: humanRate(f.rate, ar) ?? none, muted: !f.rate },
    { icon: <Smartphone />, label: t('أجهزة', 'Devices'), value: humanDevices(f.devices, ar) ?? t('جهاز واحد', '1 device') },
  ];
  const low = e.p && e.total > 0 && (e.ready === 0 || (e.total >= 30 && e.ready < LOW_READY));
  return (
    <Button variant="ghost" type="button" aria-pressed={selected} onClick={onClick} className={`app-panel tap-card h-auto items-stretch whitespace-normal flex flex-col p-4 text-start ${selected ? 'border-primary' : ''}`}>
      <span className="flex items-center justify-between gap-1"><b className="truncate" dir="auto">{e.name === '-' ? t('بدون باقة', 'No package') : e.name}</b><ChevronRight className="tap-chevron" /></span>
      <span className="mt-1 text-xs text-muted-foreground">{e.routerName}</span>
      <span className="mt-1 block text-lg font-bold" dir="auto">
        {f.price ? <span className="text-primary">{f.price}</span> : <span className="text-sm font-normal text-muted-foreground">{t('بدون سعر', 'No price')}</span>}
        {f.sell ? <span className="ms-1 text-xs font-normal text-muted-foreground">{t(`(بيع ${f.sell})`, `(sells ${f.sell})`)}</span> : null}
      </span>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="flex items-center gap-1 text-muted-foreground [&>svg]:size-3.5">{r.icon}{r.label}</dt>
            <dd className={r.muted ? 'text-muted-foreground' : 'font-semibold'}>{r.value}</dd>
          </div>
        ))}
      </dl>
      <span className="mt-auto flex items-end justify-between gap-2 pt-3">
        <span><b className="block text-2xl" dir="ltr">{e.ready}</b><span className="text-xs text-muted-foreground">{t('جاهز للبيع', 'ready')}</span></span>
        <span className="text-end text-xs text-muted-foreground">
          {e.live > 0 && <span className="flex items-center justify-end gap-1 text-primary"><span className="size-1.5 rounded-full bg-primary" />{t(`${e.live} متصل`, `${e.live} online`)}</span>}
          {e.today > 0 && <span className="block">{t(`${e.today} بدأ اليوم`, `${e.today} started today`)}</span>}
          <span className="block">{t(`من ${e.total}`, `of ${e.total}`)}</span>
        </span>
      </span>
      {low && <span className="mt-2 flex items-center gap-1 rounded-lg bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive"><AlertTriangle className="size-3.5" />{e.ready === 0 ? t('خلص الجاهز', 'None left') : t('الجاهز قليل', 'Running low')}</span>}
    </Button>
  );
}

/** The two words owners mix up most, explained with one example each. */
export function PackageHelp({ ar }: { ar: boolean }) {
  const t = (a: string, b: string) => (ar ? a : b);
  return (
    <div className="space-y-2 border-y border-border py-4 text-sm leading-relaxed">
      <p><b>{t('وقت الاستخدام', 'Usage time')}</b>: {t('يُحسب بس وقت ما الزبون متصل. مثال: 5 ساعات = يقدر يتصل ساعة كل يوم لخمسة أيام.', 'Counts only while the customer is connected. Example: 5 hours = one hour a day for five days.')}</p>
      <p><b>{t('الصلاحية', 'Validity')}</b>: {t('أيام تقويم تبدأ من أول دخول، وتخلص حتى لو ما استخدمه. مثال: أسبوع = يخلص بعد 7 أيام من أول دخول مهما كان الباقي.', 'Calendar days from the first login; it ends even if unused. Example: a week = ends 7 days after first login, whatever is left.')}</p>
      <p><b>{t('البيانات', 'Data')}</b>: {t('مجموع التنزيل والرفع. الكرت يوقف أول ما يخلص أي واحد من الثلاثة.', 'Download plus upload. The card stops as soon as any of the three runs out.')}</p>
    </div>
  );
}

/** Package settings an engineer looks for, hidden by default so owners see only what they sell. */
export function EngineerDetails({ p, ar }: { p: ProfileRow; ar: boolean }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const x = p.extra ?? {};
  const rows: [string, string | null | undefined][] = [
    ['rate-limit', p.rate_limit], ['shared-users', p.shared_users], ['validity', p.validity], ['session-timeout', x['sessionTimeout']], ['idle-timeout', x['idle']], ['keepalive-timeout', x['keepalive']], ['address-pool', x['pool']],
    ['Mikhmon', x['expiry'] ? `${x['expiry']}${x['lock'] ? ` · lock ${x['lock']}` : ''}` : null], ['name-for-users', x['forUsers']], ['uptime-limit', x['uptimeLimit']], ['transfer-limit', x['transferLimit']],
  ];
  const shown = rows.filter(([, v]) => !!v);
  if (!shown.length) return null;
  return (
    <details className="border-b border-border py-4 text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold"><Wrench className="size-4 text-muted-foreground" />{t(`تفاصيل للمهندس: ${p.name}`, `Engineer details: ${p.name}`)}</summary>
      <dl className="mt-3 grid grid-cols-2 gap-2">{shown.map(([k, v]) => <div key={k} className="stat-tile"><dt className="text-xs text-muted-foreground" dir="ltr">{k}</dt><dd className="mt-1 break-all font-mono" dir="ltr">{v}</dd></div>)}</dl>
    </details>
  );
}
