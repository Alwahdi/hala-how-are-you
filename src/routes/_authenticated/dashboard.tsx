import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CreditCard, Globe2, Home, LogOut, Network, Printer, Radio, Search, Ticket, PlusCircle, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { NetworkPanel, routerAlerts } from '@/components/dashboard/network-panel';
import { cardState, formatBytes, formatDuration, usedShare, type CardRow, type CardState } from '@/lib/card-status';
import { isOnline } from '@/lib/router-script';

type Tab = 'home' | 'cards' | 'active' | 'network';
const TABS: Tab[] = ['home', 'cards', 'active', 'network'];

export const Route = createFileRoute('/_authenticated/dashboard')({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => (TABS.includes(s['tab'] as Tab) ? { tab: s['tab'] as Tab } : {}),
  head: () => ({ meta: [
    { title: 'Mikro — لوحة الشبكة' },
    { name: 'description', content: 'Watch your MikroTik network: active users, cards, packages and router health.' },
    { property: 'og:title', content: 'Mikro — Network dashboard' },
    { property: 'og:description', content: 'Active users, cards and router health for your network.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Dashboard,
});

type RouterRow = { id: string; name: string; last_seen_at: string | null; last_status: unknown; cloud_host: string | null; last_check_error: string | null; direct_port: number | null; role: string; ros_version: string; connection_method: string; direct_tls: boolean | null; cards_synced_at: string | null };
type Session = { router_id: string; source: string; username: string; address: string | null; mac: string | null; uptime_s: number; bytes: number };

async function allCards(): Promise<CardRow[]> {
  const out: CardRow[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase.from('router_cards').select('*').order('name').range(from, from + 999);
    if (error) throw error;
    out.push(...(data as CardRow[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const STATE_LABEL: Record<CardState, [string, string]> = { unused: ['جديد', 'Unused'], active: ['قيد الاستخدام', 'In use'], almost: ['قارب على الانتهاء', 'Almost used'], finished: ['منتهي', 'Finished'], disabled: ['معطّل', 'Disabled'] };
const STATE_TONE: Record<CardState, string> = { unused: 'bg-primary/15 text-primary', active: 'bg-secondary/20 text-foreground', almost: 'bg-destructive/10 text-destructive', finished: 'bg-muted text-muted-foreground', disabled: 'bg-muted text-muted-foreground' };

function Dashboard() {
  const { ar, toggleLanguage } = useLanguage();
  const t = (a: string, b: string) => (ar ? a : b);
  const navigate = useNavigate();
  const tab = Route.useSearch().tab ?? 'home';
  const setTab = (next: Tab) => navigate({ to: '/dashboard', search: next === 'home' ? {} : { tab: next } });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('account_type, network_name, city').eq('id', u.user?.id ?? '').maybeSingle();
      return data ?? { account_type: null, network_name: null, city: null };
    },
  });
  const { data: routers = [], isLoading } = useQuery({
    queryKey: ['routers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('routers').select('id, name, role, ros_version, connection_method, cloud_host, direct_port, direct_tls, last_seen_at, last_status, last_check_error, cards_synced_at').order('created_at');
      if (error) throw error;
      return data as RouterRow[];
    },
    refetchInterval: 15_000,
  });
  const { data: cards = [] } = useQuery({ queryKey: ['cards'], queryFn: allCards, refetchInterval: 60_000 });
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => { const { data, error } = await supabase.from('router_sessions').select('*').order('uptime_s', { ascending: false }).limit(1000); if (error) throw error; return data as Session[]; },
    refetchInterval: 30_000,
  });

  // First-time users finish onboarding (network + first router) before seeing the dashboard.
  useEffect(() => {
    if (profile && !profile.account_type) navigate({ to: '/onboarding', replace: true });
    else if (profile && !isLoading && routers.length === 0) navigate({ to: '/onboarding', replace: true });
  }, [profile, isLoading, routers.length, navigate]);

  const onlineCount = routers.filter((r) => isOnline(r.last_seen_at)).length;
  const reportedActive = routers.reduce((n, r) => { const s = (r.last_status ?? {}) as { hotspotActive?: number; umActive?: number }; return n + (s.hotspotActive ?? 0) + (s.umActive ?? 0); }, 0);
  const activeNow = sessions.length || reportedActive;
  const counts = useMemo(() => {
    const c: Record<CardState, number> = { unused: 0, active: 0, almost: 0, finished: 0, disabled: 0 };
    for (const card of cards) c[cardState(card)]++;
    return c;
  }, [cards]);
  const newThisWeek = useMemo(() => {
    if (!cards.length) return 0;
    const firstSync = Math.min(...cards.map((c) => new Date(c.first_seen_at).getTime()));
    const weekAgo = Date.now() - 7 * 86400_000;
    // Cards seen in the very first sync existed before Mikro, so they are not "new".
    return cards.filter((c) => { const tm = new Date(c.first_seen_at).getTime(); return tm > firstSync + 15 * 60_000 && tm > weekAgo; }).length;
  }, [cards]);
  const alerts = routers.flatMap((r) => routerAlerts(r as never, ar));
  const lastCardsSync = routers.map((r) => r.cards_synced_at).filter(Boolean).sort().pop() ?? null;

  const nav: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'home', icon: <Home />, label: t('الرئيسية', 'Home') },
    { id: 'cards', icon: <Ticket />, label: t('الكروت', 'Cards') },
    { id: 'active', icon: <Activity />, label: t('النشطون', 'Active') },
    { id: 'network', icon: <Network />, label: t('الشبكة', 'Network') },
  ];

  return (
    <main className="app-shell min-h-screen pb-28 pt-6 sm:pb-10" lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <div aria-hidden className="landing-pattern" />
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">Mikro</p>
          <h1 className="truncate text-2xl font-bold">{profile?.network_name || t('شبكتي', 'My network')}</h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={`size-2 rounded-full ${onlineCount === routers.length && routers.length ? 'bg-primary' : 'bg-destructive'}`} aria-hidden />
            {routers.length ? (onlineCount === routers.length ? t('الشبكة شغالة', 'Network online') : t(`${routers.length - onlineCount} راوتر غير متصل`, `${routers.length - onlineCount} router offline`)) : t('جارٍ التحميل...', 'Loading...')}
            {profile?.city && <span>· {profile.city}</span>}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" aria-label={ar ? 'English' : 'العربية'} onClick={toggleLanguage}><Globe2 /></Button>
          <Button variant="ghost" size="icon" aria-label={t('خروج', 'Sign out')} onClick={() => supabase.auth.signOut().then(() => location.assign('/auth'))}><LogOut /></Button>
        </div>
      </header>

      <nav aria-label={t('أقسام اللوحة', 'Dashboard sections')} className="dash-nav">
        {nav.map((n) => <button key={n.id} type="button" aria-current={tab === n.id ? 'page' : undefined} onClick={() => setTab(n.id)} className="dash-nav-item">{n.icon}<span>{n.label}</span></button>)}
      </nav>

      {tab === 'home' && (
        <div className="mt-6 space-y-6">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t('ملخص الشبكة', 'Network summary')}>
            <Kpi icon={<Wifi />} label={t('متصلون الآن', 'Active now')} value={activeNow} onClick={() => setTab('active')} />
            <Kpi icon={<Ticket />} label={t('كروت جديدة جاهزة', 'Unused cards')} value={counts.unused} onClick={() => setTab('cards')} />
            <Kpi icon={<CreditCard />} label={t('قيد الاستخدام', 'Cards in use')} value={counts.active + counts.almost} hint={counts.almost ? t(`${counts.almost} قاربت تنتهي`, `${counts.almost} almost used`) : undefined} onClick={() => setTab('cards')} />
            <Kpi icon={<Radio />} label={t('الراوترات', 'Routers')} value={`${onlineCount}/${routers.length}`} hint={alerts.length ? t(`${alerts.length} تنبيه`, `${alerts.length} alerts`) : t('كلها سليمة', 'All healthy')} onClick={() => setTab('network')} />
          </section>

          {alerts.length > 0 && <ul className="space-y-2">{alerts.map((a) => <li key={a} role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{a}</li>)}</ul>}

          <section className="grid gap-3 sm:grid-cols-2" aria-label={t('إجراءات سريعة', 'Quick actions')}>
            <SoonAction icon={<PlusCircle />} title={t('إضافة كروت', 'Add cards')} sub={t('توليد دفعة كروت على الراوتر', 'Generate a batch of cards on the router')} soon={t('قريباً', 'Soon')} />
            <SoonAction icon={<Printer />} title={t('طباعة كروت', 'Print cards')} sub={t('قوالب طباعة جاهزة للكروت', 'Ready print layouts for cards')} soon={t('قريباً', 'Soon')} />
          </section>

          <section className="app-panel p-5">
            <h2 className="font-bold">{t('الكروت', 'Cards')}</h2>
            {cards.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t('ننتظر أول قائمة كروت من الراوتر (تصل خلال 5 دقائق من الربط). لو الراوتر ربطته قبل هذا التحديث، اضغط «إعادة الربط» في قسم الشبكة.', 'Waiting for the first card list (arrives within 5 minutes of linking). If you linked before this update, tap Reconnect in Network.')}</p>
            ) : (
              <>
                <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
                  {(['unused', 'active', 'almost', 'finished', 'disabled'] as CardState[]).map((s) => counts[s] ? <span key={s} className={`state-bar-${s}`} style={{ width: `${(counts[s] / cards.length) * 100}%` }} /> : null)}
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                  {(['unused', 'active', 'almost', 'finished', 'disabled'] as CardState[]).map((s) => <li key={s} className="stat-tile"><span className="text-xs text-muted-foreground">{t(...STATE_LABEL[s])}</span><b className="block text-lg" dir="ltr">{counts[s]}</b></li>)}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{t(`إجمالي ${cards.length} كرت`, `${cards.length} cards total`)}{newThisWeek ? t(` · ${newThisWeek} أضيفت هذا الأسبوع`, ` · ${newThisWeek} added this week`) : ''}{lastCardsSync ? t(` · آخر تحديث ${new Date(lastCardsSync).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, ` · updated ${new Date(lastCardsSync).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`) : ''}</p>
              </>
            )}
          </section>
        </div>
      )}

      {tab === 'cards' && <CardsTab cards={cards} routers={routers} ar={ar} />}
      {tab === 'active' && <ActiveTab sessions={sessions} reported={reportedActive} routers={routers} ar={ar} />}
      {tab === 'network' && <div className="mt-6"><NetworkPanel /></div>}
    </main>
  );
}

function Kpi({ icon, label, value, hint, onClick }: { icon: React.ReactNode; label: string; value: number | string; hint?: string | undefined; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="app-panel p-4 text-start transition-colors hover:border-primary/50">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground [&>svg]:size-4">{icon}{label}</span>
      <b className="mt-1 block text-3xl" dir="ltr">{value}</b>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </button>
  );
}

function SoonAction({ icon, title, sub, soon }: { icon: React.ReactNode; title: string; sub: string; soon: string }) {
  return (
    <div aria-disabled className="app-panel flex items-center gap-3 p-4 opacity-80">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary [&>svg]:size-5">{icon}</span>
      <span className="flex-1"><b className="block">{title}</b><span className="text-xs text-muted-foreground">{sub}</span></span>
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{soon}</span>
    </div>
  );
}

function CardsTab({ cards, routers, ar }: { cards: CardRow[]; routers: RouterRow[]; ar: boolean }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<CardState | 'all'>('all');
  const [profile, setProfile] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);
  const [open, setOpen] = useState<CardRow | null>(null);
  const profiles = useMemo(() => { const m = new Map<string, number>(); for (const c of cards) m.set(c.profile || '-', (m.get(c.profile || '-') ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); }, [cards]);
  const list = useMemo(() => cards.filter((c) => (filter === 'all' || cardState(c) === filter) && (!profile || (c.profile || '-') === profile) && (!q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.comment ?? '').toLowerCase().includes(q.toLowerCase()))), [cards, filter, profile, q]);
  const routerName = (id: string) => routers.find((r) => r.id === id)?.name ?? '';

  return (
    <div className="mt-6 space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => { setQ(e.target.value); setLimit(100); }} placeholder={t('ابحث برقم الكرت أو الملاحظة', 'Search by card number or note')} className="h-12 ps-10" dir="auto" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t('الحالة', 'Status')}>
        {(['all', 'unused', 'active', 'almost', 'finished', 'disabled'] as const).map((f) => <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className="chip">{f === 'all' ? t('الكل', 'All') : t(...STATE_LABEL[f])}</button>)}
      </div>
      {profiles.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t('الباقات', 'Packages')}>
          <button type="button" aria-pressed={!profile} onClick={() => setProfile(null)} className="chip">{t('كل الباقات', 'All packages')}</button>
          {profiles.map(([p, n]) => <button key={p} type="button" aria-pressed={profile === p} onClick={() => setProfile(p)} className="chip">{p} <span className="text-muted-foreground" dir="ltr">{n}</span></button>)}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t(`${list.length} كرت`, `${list.length} cards`)}</p>
      {cards.length === 0 ? <p className="app-panel p-6 text-center text-sm text-muted-foreground">{t('ما وصلت قائمة الكروت بعد.', 'No card list yet.')}</p> : (
        <ul className="space-y-2">
          {list.slice(0, limit).map((c) => {
            const st = cardState(c); const share = usedShare(c);
            return (
              <li key={`${c.router_id}-${c.source}-${c.name}`}>
                <button type="button" onClick={() => setOpen(c)} className="app-panel flex w-full items-center gap-3 p-3 text-start hover:border-primary/50">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate font-mono" dir="ltr">{c.name}</b>
                    <span className="text-xs text-muted-foreground">{c.profile || '-'} · {formatDuration(c.uptime_s, ar)} · <bdi dir="ltr">{formatBytes(c.bytes)}</bdi>{c.source === 'usermanager' ? ' · User Manager' : ''}</span>
                    {share != null && <span className="meter mt-1.5 block" data-tone={share >= 0.8 ? 'warn' : undefined}><span style={{ width: `${Math.min(100, share * 100)}%` }} /></span>}
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_TONE[st]}`}>{t(...STATE_LABEL[st])}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {list.length > limit && <Button variant="outline" className="h-11 w-full" onClick={() => setLimit(limit + 200)}>{t('عرض المزيد', 'Show more')}</Button>}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent dir={ar ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle dir="ltr" className="font-mono">{open?.name}</DialogTitle><DialogDescription>{open && t(...STATE_LABEL[cardState(open)])}</DialogDescription></DialogHeader>
          {open && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Item label={t('الباقة', 'Package')} value={open.profile || '-'} />
              <Item label={t('المصدر', 'Source')} value={open.source === 'usermanager' ? 'User Manager' : 'Hotspot'} />
              <Item label={t('الوقت المستخدم', 'Time used')} value={formatDuration(open.uptime_s, ar)} />
              <Item label={t('حد الوقت', 'Time limit')} value={open.limit_uptime_s ? formatDuration(open.limit_uptime_s, ar) : t('بدون', 'None')} />
              <Item label={t('البيانات المستخدمة', 'Data used')} value={formatBytes(open.bytes)} />
              <Item label={t('حد البيانات', 'Data limit')} value={open.limit_bytes ? formatBytes(open.limit_bytes) : t('بدون', 'None')} />
              <Item label={t('الراوتر', 'Router')} value={routerName(open.router_id)} />
              <Item label={t('ملاحظة', 'Note')} value={open.comment || '-'} />
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActiveTab({ sessions, reported, routers, ar }: { sessions: Session[]; reported: number; routers: RouterRow[]; ar: boolean }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const [q, setQ] = useState('');
  const list = sessions.filter((s) => !q || s.username.toLowerCase().includes(q.toLowerCase()) || (s.mac ?? '').toLowerCase().includes(q.toLowerCase()));
  const routerName = (id: string) => routers.find((r) => r.id === id)?.name ?? '';
  return (
    <div className="mt-6 space-y-4">
      <div className="app-panel flex items-center gap-3 p-4"><Wifi className="size-5 text-primary" /><span className="flex-1 text-sm">{t('متصلون الآن', 'Active now')}</span><b className="text-2xl" dir="ltr">{sessions.length || reported}</b></div>
      {sessions.length === 0 ? (
        <p className="app-panel p-6 text-sm text-muted-foreground">{reported ? t(`الراوتر يقول ${reported} متصل الآن. تفاصيل كل مستخدم تظهر لما يكون الاتصال المباشر شغال.`, `The router reports ${reported} active. Per-user details appear once direct access works.`) : t('ما في أحد متصل الآن.', 'Nobody is connected right now.')}</p>
      ) : (
        <>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ابحث بالكرت أو MAC', 'Search by card or MAC')} className="h-12" dir="auto" />
          <ul className="space-y-2">
            {list.map((s) => (
              <li key={`${s.router_id}-${s.source}-${s.username}-${s.mac}`} className="app-panel flex items-center gap-3 p-3">
                <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary" aria-hidden />
                <span className="min-w-0 flex-1"><b className="block truncate font-mono" dir="ltr">{s.username}</b><span className="text-xs text-muted-foreground" dir="ltr">{[s.address, s.mac].filter(Boolean).join(' · ')}</span></span>
                <span className="shrink-0 text-end text-xs text-muted-foreground"><b className="block text-sm text-foreground">{formatDuration(s.uptime_s, ar)}</b><bdi dir="ltr">{formatBytes(s.bytes)}</bdi>{routers.length > 1 && <span className="block">{routerName(s.router_id)}</span>}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return <div className="stat-tile"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold" dir="auto">{value}</dd></div>;
}
