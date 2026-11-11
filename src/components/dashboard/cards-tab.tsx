import { useMemo, useState } from 'react';
import { ChevronRight, Copy, Info, Layers, MessageCircle, Search, Ticket, Users, Gauge as GaugeIcon, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cardState, formatBytes, formatDuration, usedShare, type CardRow, type CardState } from '@/lib/card-status';
import type { ProfileRow, RouterRow, Session, Source } from './types';
import { UserManagerSetup } from './user-manager-setup';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { requestRemoveFinished } from '@/lib/alerts.functions';
import { Trash2, Loader2 } from 'lucide-react';

export const STATE_LABEL: Record<CardState, [string, string]> = { unused: ['جديد', 'Unused'], active: ['قيد الاستخدام', 'In use'], almost: ['قارب على الانتهاء', 'Almost used'], finished: ['منتهي', 'Finished'], disabled: ['معطّل', 'Disabled'] };
export const STATE_TONE: Record<CardState, string> = { unused: 'bg-primary/15 text-primary', active: 'bg-secondary/20 text-foreground', almost: 'bg-destructive/10 text-destructive', finished: 'bg-muted text-muted-foreground', disabled: 'bg-muted text-muted-foreground' };

type Props = { cards: CardRow[]; profiles: ProfileRow[]; routers: RouterRow[]; sessions: Session[]; ar: boolean; initialFilter?: CardState | undefined };

export function CardsTab({ cards, profiles, routers, sessions, ar, initialFilter }: Props) {
  const t = (a: string, b: string) => (ar ? a : b);
  const hasUm = cards.some((c) => c.source === 'usermanager') || profiles.some((p) => p.source === 'usermanager');
  const hasHs = cards.some((c) => c.source === 'hotspot') || profiles.some((p) => p.source === 'hotspot') || !hasUm;
  const v7 = routers.some((r) => r.ros_version === 'v7');
  const [source, setSource] = useState<Source>(hasHs ? 'hotspot' : 'usermanager');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<CardState | 'all'>(initialFilter ?? 'all');
  const [pkg, setPkg] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);
  const [open, setOpen] = useState<CardRow | null>(null);
  const [explained, setExplained] = useState(false);
  const [confirmClean, setConfirmClean] = useState(false);
  const [cleanMsg, setCleanMsg] = useState<string | null>(null);
  const removeFinished = useServerFn(requestRemoveFinished);
  const qc = useQueryClient();
  const { data: pendingClean = 0 } = useQuery({ queryKey: ['clean-jobs'], queryFn: async () => { const { count } = await supabase.from('router_jobs').select('id', { count: 'exact', head: true }).eq('kind', 'remove_cards').in('status', ['pending', 'sent']); return count ?? 0; }, refetchInterval: 10_000 });
  const finishedHs = useMemo(() => cards.filter((c) => c.source === 'hotspot' && cardState(c) === 'finished'), [cards]);
  async function cleanAll() {
    setConfirmClean(false);
    let n = 0;
    for (const r of routers) { const x = await removeFinished({ data: { id: r.id } }).catch(() => ({ queued: 0 })); n += x.queued ?? 0; }
    setCleanMsg(n ? t(`أرسلنا ${n} كرت للحذف. الراوتر يتأكد من كل كرت ويحذفه خلال دقيقة أو اثنتين.`, `Sent ${n} cards for removal. The router re-checks each one and removes it within a minute or two.`) : t('ما في كروت منتهية مؤكدة بعد. حاول بعد دقيقة.', 'No confirmed used-up cards yet. Try again in a minute.'));
    qc.invalidateQueries({ queryKey: ['clean-jobs'] });
  }

  const mine = useMemo(() => cards.filter((c) => c.source === source), [cards, source]);
  const packages = useMemo(() => {
    const m = new Map<string, { name: string; total: number; ready: number; p?: ProfileRow }>();
    for (const p of profiles.filter((x) => x.source === source)) m.set(p.name, { name: p.name, total: 0, ready: 0, p });
    for (const c of mine) { const k = c.profile || '-'; const e = m.get(k) ?? { name: k, total: 0, ready: 0 }; e.total++; if (cardState(c) === 'unused') e.ready++; m.set(k, e); }
    return [...m.values()].filter((e) => e.name !== 'default' || e.total > 0).sort((a, b) => b.total - a.total);
  }, [profiles, mine, source]);
  const list = useMemo(() => mine.filter((c) => (filter === 'all' || cardState(c) === filter) && (!pkg || (c.profile || '-') === pkg) && (!q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.comment ?? '').toLowerCase().includes(q.toLowerCase()))), [mine, filter, pkg, q]);
  const routerName = (id: string) => routers.find((r) => r.id === id)?.name ?? '';
  const live = open ? sessions.find((s) => s.username === open.name && s.router_id === open.router_id) : undefined;

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="seg" role="group" aria-label={t('نوع الكروت', 'Card system')}>
          <button type="button" aria-pressed={source === 'hotspot'} onClick={() => { setSource('hotspot'); setPkg(null); }}>Hotspot</button>
          <button type="button" aria-pressed={source === 'usermanager'} onClick={() => { setSource('usermanager'); setPkg(null); }}>User Manager</button>
        </div>
        <button type="button" onClick={() => setExplained(!explained)} aria-expanded={explained} className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground"><Info className="size-4" />{t('ما الفرق؟', "What's the difference?")}</button>
      </div>
      {explained && (
        <p className="app-panel p-4 text-sm leading-relaxed">
          <b>Hotspot</b>: {t('الكروت محفوظة في الراوتر نفسه، وكل باقة لها سرعة وعدد أجهزة.', 'Cards live on the router itself; each package sets speed and devices.')}<br />
          <b>User Manager</b>: {t('نظام كروت مركزي داخل الراوتر (v7): مدة صلاحية، سعر، وحدود بيانات لكل باقة، ويخدم أكثر من راوتر.', 'A central card system on the router (v7): validity, price and data limits per package, serving more than one router.')}
        </p>
      )}

      {source === 'usermanager' && !hasUm ? <UserManagerSetup ar={ar} v7={v7} /> : (
        <>
          <section aria-label={t('الباقات', 'Packages')}>
            <h2 className="mb-2 flex items-center gap-2 font-bold"><Layers className="size-4 text-primary" />{t('الباقات', 'Packages')}</h2>
            {packages.length === 0 ? <p className="app-panel p-4 text-sm text-muted-foreground">{t('ما وصلت باقات بعد. تصل مع أول قائمة كروت (خلال 5 دقائق).', 'No packages yet. They arrive with the first card list (within 5 minutes).')}</p> : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {packages.map((e) => (
                  <button key={e.name} type="button" aria-pressed={pkg === e.name} onClick={() => { setPkg(pkg === e.name ? null : e.name); setLimit(100); }} className={`app-panel tap-card p-4 text-start ${pkg === e.name ? 'border-primary' : ''}`}>
                    <span className="flex items-center justify-between gap-1"><b className="truncate" dir="auto">{e.name}</b><ChevronRight className="tap-chevron" /></span>
                    <span className="mt-1 block text-xs text-muted-foreground" dir="ltr">{[e.p?.rate_limit, e.p?.validity, e.p?.price && `${e.p.price}`].filter(Boolean).join(' · ') || '—'}</span>
                    <span className="mt-3 flex items-end justify-between"><span><b className="block text-2xl" dir="ltr">{e.ready}</b><span className="text-xs text-muted-foreground">{t('جاهز للبيع', 'ready')}</span></span><span className="text-xs text-muted-foreground" dir="ltr">/ {e.total}</span></span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setLimit(100); }} placeholder={t('ابحث برقم الكرت أو الملاحظة', 'Search by card number or note')} className="h-12 ps-10" dir="auto" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t('الحالة', 'Status')}>
            {(['all', 'unused', 'active', 'almost', 'finished', 'disabled'] as const).map((f) => <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className="chip">{f === 'all' ? t('الكل', 'All') : t(...STATE_LABEL[f])}</button>)}
          </div>
          <p className="text-xs text-muted-foreground">{t(`${list.length} كرت`, `${list.length} cards`)}{pkg ? ` · ${pkg}` : ''}</p>
          {source === 'hotspot' && filter === 'finished' && finishedHs.length > 0 && (
            <div className="app-panel flex flex-wrap items-center gap-3 p-4">
              <span className="flex-1 text-sm">{pendingClean ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin text-primary" />{t('جاري الحذف على الراوتر...', 'Removing on the router...')}</span> : t('الكروت المنتهية تأخذ مساحة وتبطئ البحث في الراوتر.', 'Used-up cards take space and slow searches on the router.')}</span>
              <Button variant="destructive" className="h-11" disabled={pendingClean > 0} onClick={() => setConfirmClean(true)}><Trash2 />{t(`احذف الكل (${finishedHs.length})`, `Remove all (${finishedHs.length})`)}</Button>
            </div>
          )}
          {cleanMsg && <p role="status" className="rounded-xl bg-primary/10 p-3 text-sm">{cleanMsg}</p>}
          {mine.length === 0 ? <p className="app-panel p-6 text-center text-sm text-muted-foreground">{t('ما وصلت قائمة الكروت بعد.', 'No card list yet.')}</p> : (
            <ul className="space-y-2">
              {list.slice(0, limit).map((c) => {
                const st = cardState(c); const share = usedShare(c);
                return (
                  <li key={`${c.router_id}-${c.source}-${c.name}`}>
                    <button type="button" onClick={() => setOpen(c)} className="app-panel tap-card flex w-full items-center gap-3 p-3 text-start">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Ticket className="size-5" /></span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate font-mono" dir="ltr">{c.name}</b>
                        <span className="text-xs text-muted-foreground">{c.profile || '-'} · {formatDuration(c.uptime_s, ar)} · <bdi dir="ltr">{formatBytes(c.bytes)}</bdi></span>
                        {share != null && <span className="meter mt-1.5 block" data-tone={share >= 0.8 ? 'warn' : undefined}><span style={{ width: `${Math.min(100, share * 100)}%` }} /></span>}
                      </span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_TONE[st]}`}>{t(...STATE_LABEL[st])}</span>
                      <ChevronRight className="tap-chevron" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {list.length > limit && <Button variant="outline" className="h-11 w-full" onClick={() => setLimit(limit + 200)}>{t('عرض المزيد', 'Show more')}</Button>}
        </>
      )}

      <Dialog open={confirmClean} onOpenChange={setConfirmClean}>
        <DialogContent dir={ar ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t(`حذف ${finishedHs.length} كرت منتهي؟`, `Remove ${finishedHs.length} used-up cards?`)}</DialogTitle>
            <DialogDescription>{t('تنحذف من الراوتر نهائياً. الراوتر يتأكد بنفسه أن كل كرت خلص فعلاً قبل حذفه، والكرت اللي فيه رصيد ما ينحذف.', 'They are removed from the router for good. The router checks each card is really used up first; a card with balance left is never removed.')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11" onClick={() => setConfirmClean(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button variant="destructive" className="h-11" onClick={cleanAll}><Trash2 />{t('احذف', 'Remove')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent dir={ar ? 'rtl' : 'ltr'} className="max-h-[90vh] overflow-y-auto">
          {open && (() => {
            const st = cardState(open); const share = usedShare(open); const pct = share == null ? null : Math.min(100, Math.round(share * 100));
            const msg = t(`كرت الإنترنت: ${open.name}`, `Internet card: ${open.name}`);
            return (
              <>
                <DialogHeader>
                  <DialogTitle dir="ltr" className="font-mono text-2xl">{open.name}</DialogTitle>
                  <DialogDescription><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_TONE[st]}`}>{t(...STATE_LABEL[st])}</span> {open.source === 'usermanager' ? 'User Manager' : 'Hotspot'}</DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="gauge" data-tone={pct != null && pct >= 80 ? 'warn' : undefined} style={{ ['--v' as string]: pct ?? 0 }} role="img" aria-label={pct == null ? t('بدون حد', 'No limit') : t(`مستخدم ${pct}%`, `${pct}% used`)}><span dir="ltr">{pct == null ? '∞' : `${pct}%`}</span></div>
                  <div className="space-y-1 text-sm">
                    <p><b>{formatDuration(open.uptime_s, ar)}</b> <span className="text-muted-foreground">{open.limit_uptime_s ? t(`من ${formatDuration(open.limit_uptime_s, ar)}`, `of ${formatDuration(open.limit_uptime_s, ar)}`) : t('وقت مستخدم', 'time used')}</span></p>
                    <p><b dir="ltr">{formatBytes(open.bytes)}</b> <span className="text-muted-foreground">{open.limit_bytes ? t(`من ${formatBytes(open.limit_bytes)}`, `of ${formatBytes(open.limit_bytes)}`) : t('بيانات مستخدمة', 'data used')}</span></p>
                    {live ? <p className="flex items-center gap-1.5 text-primary"><span className="size-2 animate-pulse rounded-full bg-primary" />{t('متصل الآن', 'Online now')} <bdi dir="ltr" className="text-xs text-muted-foreground">{live.mac}</bdi></p> : null}
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Item icon={<Layers />} label={t('الباقة', 'Package')} value={open.profile || '-'} />
                  <Item icon={<Server />} label={t('الراوتر', 'Router')} value={routerName(open.router_id)} />
                  <Item icon={<GaugeIcon />} label={t('أول ظهور في Mikro', 'First seen in Mikro')} value={new Date(open.first_seen_at).toLocaleDateString('en-GB')} />
                  <Item icon={<Users />} label={t('ملاحظة', 'Note')} value={open.comment || '-'} />
                </dl>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-11" onClick={() => navigator.clipboard.writeText(open.name)}><Copy />{t('نسخ الرقم', 'Copy number')}</Button>
                  <Button className="h-11" asChild><a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer"><MessageCircle />{t('أرسل للزبون', 'Send to customer')}</a></Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Item({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="stat-tile"><dt className="flex items-center gap-1 text-xs text-muted-foreground [&>svg]:size-3.5">{icon}{label}</dt><dd className="mt-1 truncate font-semibold" dir="auto">{value}</dd></div>;
}
