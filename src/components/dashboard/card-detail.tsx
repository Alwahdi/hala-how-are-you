import { CalendarClock, Copy, Layers, MessageCircle, Server, StickyNote, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cardState, formatBytes, isDecimalSize, formatDuration, remaining, shortLeft, usedShare, type CardRow } from '@/lib/card-status';
import { CardControls } from './card-controls';
import { STATE_LABEL, STATE_TONE } from './card-row';
import type { ProfileRow, RouterRow, Session } from './types';

const day = (iso: string, ar: boolean) => new Date(iso).toLocaleDateString(ar ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long' });
const ago = (iso: string, ar: boolean) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 2 ? (ar ? 'الآن' : 'just now') : ar ? `قبل ${shortLeft(m * 60000, true)}` : `${shortLeft(m * 60000, false)} ago`; };

/** Everything about one card: used and left (data, time, days), online now, package and the actions. */
export function CardDetail({ card, pkg, router, routers, live, ar, onRenamed }: { card: CardRow; pkg?: ProfileRow | undefined; router?: RouterRow | undefined; routers: RouterRow[]; live?: Session | undefined; ar: boolean; onRenamed: (n: string) => void }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const st = cardState(card); const share = usedShare(card); const pct = share == null ? null : Math.min(100, Math.round(share * 100));
  const left = remaining(card);
  const msg = t(`كرت الإنترنت: ${card.name}`, `Internet card: ${card.name}`);
  return (
    <>
      <DialogHeader>
        <DialogTitle dir="ltr" className="font-mono text-2xl">{card.name}</DialogTitle>
        <DialogDescription><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_TONE[st]}`}>{t(...STATE_LABEL[st])}</span><span className="ms-2">{card.source === 'usermanager' ? 'User Manager' : 'Hotspot'}</span></DialogDescription>
      </DialogHeader>
      <div className="flex items-center gap-4">
        <div className="gauge shrink-0" data-tone={pct != null && pct >= 80 ? 'warn' : undefined} style={{ ['--v' as string]: pct ?? 0 }} role="img" aria-label={pct == null ? t('بدون حد', 'No limit') : t(`مستخدم ${pct}%`, `${pct}% used`)}><span dir="ltr">{pct == null ? '∞' : `${pct}%`}</span></div>
        <dl className="min-w-0 space-y-2 text-sm">
          <div><dt className="text-xs text-muted-foreground">{t('البيانات', 'Data')}</dt><dd><b dir="ltr">{formatBytes(card.bytes, dec)}</b> {card.limit_bytes ? <span className="text-muted-foreground">{t(`من ${formatBytes(card.limit_bytes, dec)} · باقي `, `of ${formatBytes(card.limit_bytes, dec)} · left `)}<b className="text-foreground" dir="ltr">{formatBytes(left.bytes ?? 0, dec)}</b></span> : <span className="text-muted-foreground">{t('· بلا حد', '· no limit')}</span>}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{t('وقت الاستخدام', 'Usage time')}</dt><dd><b>{formatDuration(card.uptime_s, ar)}</b> {card.limit_uptime_s ? <span className="text-muted-foreground">{t(`من ${formatDuration(card.limit_uptime_s, true)} · باقي `, `of ${formatDuration(card.limit_uptime_s, false)} · left `)}<b className="text-foreground">{formatDuration(left.seconds ?? 0, ar)}</b></span> : <span className="text-muted-foreground">{t('· بلا حد', '· no limit')}</span>}</dd></div>
        </dl>
      </div>

      <div className="stat-tile text-sm">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarClock className="size-3.5" />{t('الصلاحية', 'Validity')}</p>
        {card.expires_at ? (
          <p className="mt-1">
            {card.first_used_at && <>{t('بدأ ', 'Started ')}<b>{day(card.first_used_at, ar)}</b> · </>}
            {st === 'expired' ? t('انتهى ', 'Ended ') : t('ينتهي ', 'Ends ')}<b>{day(card.expires_at, ar)}</b>
            {st !== 'expired' && left.untilMs != null && <> · {t('باقي ', 'left ')}<b>{shortLeft(left.untilMs, ar)}</b></>}
            {card.expires_est && <span className="block text-xs text-muted-foreground">{t('تقريبي: من أول استخدام شفناه + صلاحية الباقة.', 'Approximate: first use we saw + package validity.')}</span>}
          </p>
        ) : card.validity_s ? (
          <p className="mt-1">{t(`${formatDuration(card.validity_s, true)} تبدأ من أول دخول. ما بدأ بعد.`, `${formatDuration(card.validity_s, false)} from first login. Not started yet.`)}</p>
        ) : <p className="mt-1 text-muted-foreground">{t('بلا صلاحية بالأيام.', 'No day limit.')}</p>}
      </div>

      {live ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-primary"><Wifi className="size-4" />{t('متصل الآن', 'Online now')}</p>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div><dt className="text-muted-foreground">{t('من', 'For')}</dt><dd className="font-semibold">{formatDuration(live.uptime_s, ar)}</dd></div>
            <div><dt className="text-muted-foreground">{t('هذي الجلسة', 'This session')}</dt><dd className="font-semibold" dir="ltr">{formatBytes(live.bytes)}</dd></div>
            <div className="min-w-0"><dt className="text-muted-foreground">{t('الجهاز', 'Device')}</dt><dd className="truncate font-mono" dir="ltr">{live.mac || live.address || '-'}</dd></div>
          </dl>
        </div>
      ) : <p className="text-sm text-muted-foreground">{card.last_online_at ? t(`غير متصل الآن · آخر مرة شفناه ${ago(card.last_online_at, true)}`, `Not online now · last seen ${ago(card.last_online_at, false)}`) : t('غير متصل الآن', 'Not online now')}</p>}

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Item icon={<Layers />} label={t('الباقة', 'Package')} value={`${card.profile || '-'}${pkg?.price ? ` · ${pkg.price}` : ''}`} />
        <Item icon={<Server />} label={t('الراوتر', 'Router')} value={router?.name ?? ''} />
        <Item icon={<CalendarClock />} label={card.first_used_at ? t('أول استخدام', 'First used') : t('أول ظهور في Mikro', 'First seen in Mikro')} value={new Date(card.first_used_at ?? card.first_seen_at).toLocaleDateString('en-GB')} />
        <Item icon={<StickyNote />} label={t('ملاحظة', 'Note')} value={card.comment || '-'} />
      </dl>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11" onClick={() => navigator.clipboard.writeText(card.name)}><Copy />{t('نسخ الرقم', 'Copy number')}</Button>
        <Button className="h-11" asChild><a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer"><MessageCircle />{t('أرسل للزبون', 'Send to customer')}</a></Button>
      </div>
      <CardControls key={`${card.router_id}-${card.source}-${card.name}`} card={card} router={router ?? routers.find((r) => r.id === card.router_id)} live={!!live} ar={ar} onRenamed={onRenamed} />
    </>
  );
}

function Item({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="stat-tile"><dt className="flex items-center gap-1 text-xs text-muted-foreground [&>svg]:size-3.5">{icon}{label}</dt><dd className="mt-1 truncate font-semibold" dir="auto">{value}</dd></div>;
}
