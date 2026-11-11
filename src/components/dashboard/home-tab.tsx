import { AlertTriangle, ChevronRight, CreditCard, Palette, Radio, Ticket, TrendingDown, TrendingUp, Wifi } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import type { CardState } from '@/lib/card-status';
import { buckets, yesterdayAt, type LogPoint } from '@/lib/active-history';
import { STATE_LABEL } from './cards-tab';

type Props = {
  ar: boolean; activeNow: number; log: LogPoint[]; counts: Record<CardState, number>; total: number; inUse: number;
  lowPackages: { name: string; ready: number }[]; onlineCount: number; routerCount: number; alerts: string[]; styleConfirmed: boolean;
  go: (tab: 'cards' | 'active' | 'more', filter?: CardState) => void;
};

export function HomeTab({ ar, activeNow, log, counts, total, inUse, lowPackages, onlineCount, routerCount, alerts, styleConfirmed, go }: Props) {
  const t = (a: string, b: string) => (ar ? a : b);
  const y = yesterdayAt(log); const diff = y == null ? null : activeNow - y;
  const series = buckets(log); const max = Math.max(1, ...series.map((b) => b.value ?? 0));
  return (
    <div className="mt-6 space-y-5">
      {!styleConfirmed && (
        <Link to="/settings" className="app-panel tap-card flex items-center gap-3 border-primary/50 p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Palette className="size-5" /></span>
          <span className="flex-1"><b className="block">{t('أكّد شكل كروتك', 'Confirm your card style')}</b><span className="text-xs text-muted-foreground">{t('استنتجناه من كروتك الحالية — خطوة واحدة.', 'We guessed it from your current cards — one step.')}</span></span>
          <ChevronRight className="tap-chevron" />
        </Link>
      )}

      <button type="button" onClick={() => go('active')} className="app-panel tap-card block w-full p-5 text-start">
        <span className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Wifi className="size-4 text-primary" />{t('متصلون الآن', 'Connected now')}</span><ChevronRight className="tap-chevron" /></span>
        <span className="mt-1 flex items-end gap-3">
          <b className="text-5xl" dir="ltr">{activeNow}</b>
          {diff != null && <span className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold ${diff >= 0 ? 'bg-primary/15 text-primary' : 'bg-destructive/10 text-destructive'}`}>{diff >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}<bdi dir="ltr">{diff >= 0 ? `+${diff}` : diff}</bdi></span>}
        </span>
        <span className="text-xs text-muted-foreground">{diff == null ? t('المقارنة مع أمس تظهر بعد 24 ساعة من التسجيل.', 'The comparison with yesterday appears after 24 hours of history.') : t(`مقارنة بنفس الوقت أمس (${y})`, `vs. same time yesterday (${y})`)}</span>
        <span className="spark mt-4" aria-hidden>{series.map((b) => <span key={b.at} data-empty={b.value == null ? '' : undefined} style={{ height: `${b.value == null ? 4 : Math.max(4, (b.value / max) * 100)}%` }} />)}</span>
        <span className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{t('قبل 24 ساعة', '24h ago')}</span><span>{t('الآن', 'now')}</span></span>
      </button>

      {alerts.length > 0 && <ul className="space-y-2">{alerts.map((a) => <li key={a} role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{a}</li>)}</ul>}
      {lowPackages.map((p) => <p key={p.name} role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"><Ticket className="mt-0.5 size-4 shrink-0" />{t(`باقي ${p.ready} كرت جاهز في باقة «${p.name}»`, `Only ${p.ready} ready cards left in "${p.name}"`)}</p>)}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t('ملخص', 'Summary')}>
        <Kpi icon={<Ticket />} label={t('جاهزة للبيع', 'Ready to sell')} value={counts.unused} onClick={() => go('cards', 'unused')} />
        <Kpi icon={<CreditCard />} label={t('قاربت تنتهي', 'Almost used')} value={counts.almost} onClick={() => go('cards', 'almost')} />
        <Kpi icon={<TrendingUp />} label={t('قيد الاستخدام', 'In use')} value={inUse} onClick={() => go('cards', 'active')} />
        <Kpi icon={<Radio />} label={t('الراوترات', 'Routers')} value={`${onlineCount}/${routerCount}`} onClick={() => go('more')} />
      </section>

      {total > 0 && (
        <section className="app-panel p-5">
          <h2 className="font-bold">{t(`كل الكروت (${total})`, `All cards (${total})`)}</h2>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
            {(['unused', 'active', 'almost', 'finished', 'disabled'] as CardState[]).map((s) => counts[s] ? <span key={s} className={`state-bar-${s}`} style={{ width: `${(counts[s] / total) * 100}%` }} /> : null)}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(['unused', 'active', 'almost', 'finished', 'disabled'] as CardState[]).map((s) => <li key={s}><button type="button" onClick={() => go('cards', s)} className="stat-tile tap-card w-full text-start"><span className="text-xs text-muted-foreground">{t(...STATE_LABEL[s])}</span><b className="block text-lg" dir="ltr">{counts[s]}</b></button></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: number | string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="app-panel tap-card p-4 text-start">
      <span className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs text-muted-foreground [&>svg]:size-4">{icon}{label}</span><ChevronRight className="tap-chevron" /></span>
      <b className="mt-1 block text-3xl" dir="ltr">{value}</b>
    </button>
  );
}
