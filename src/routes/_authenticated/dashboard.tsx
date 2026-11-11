import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Activity, Bell, ChevronRight, Globe2, HeartPulse, ListChecks, Home, LogOut, Menu, Plus, PlusCircle, Printer, Search, Settings, Ticket, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Link } from '@tanstack/react-router';
import { NetworkPanel, routerAlerts } from '@/components/dashboard/network-panel';
import { cardState, formatBytes, formatDuration, type CardRow, type CardState } from '@/lib/card-status';
import { CardsTab } from '@/components/dashboard/cards-tab';
import { HomeTab } from '@/components/dashboard/home-tab';
import { EnableAlerts } from '@/components/alerts/enable-alerts';
import type { ProfileRow, RouterRow, Session } from '@/components/dashboard/types';
import type { LogPoint } from '@/lib/active-history';
import { isOnline } from '@/lib/router-script';

type Tab = 'home' | 'cards' | 'active' | 'more';
const TABS: Tab[] = ['home', 'cards', 'active', 'more'];
const FILTERS: CardState[] = ['unused', 'active', 'almost', 'finished', 'disabled'];
type Search = { tab?: Tab; filter?: CardState };

export const Route = createFileRoute('/_authenticated/dashboard')({
  validateSearch: (s: Record<string, unknown>): Search => {
    const tab = s['tab'] === 'network' ? 'more' : TABS.includes(s['tab'] as Tab) ? (s['tab'] as Tab) : undefined;
    const filter = FILTERS.includes(s['filter'] as CardState) ? (s['filter'] as CardState) : undefined;
    return { ...(tab ? { tab } : {}), ...(filter ? { filter } : {}) };
  },
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

const LOW_READY = 20;

function Dashboard() {
  const { ar, toggleLanguage } = useLanguage();
  const t = (a: string, b: string) => (ar ? a : b);
  const navigate = useNavigate();
  const search = Route.useSearch();
  const tab = search.tab ?? 'home';
  const go = (next: Tab | 'home', filter?: CardState) => navigate({ to: '/dashboard', search: { ...(next !== 'home' ? { tab: next } : {}), ...(filter ? { filter } : {}) } });
  const [quick, setQuick] = useState(false);

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
  const { data: pkgs = [] } = useQuery({ queryKey: ['profiles-pkg'], queryFn: async () => { const { data, error } = await supabase.from('router_profiles').select('*'); if (error) throw error; return data as ProfileRow[]; }, refetchInterval: 120_000 });
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => { const { data, error } = await supabase.from('router_sessions').select('*').order('uptime_s', { ascending: false }).limit(1000); if (error) throw error; return data as Session[]; },
    refetchInterval: 30_000,
  });
  // Our own 5-minute record of every router: survives reboots and wiped router logs.
  const { data: log = [] } = useQuery({
    queryKey: ['active-log'],
    queryFn: async () => { const { data, error } = await supabase.from('router_status_log').select('router_id, created_at, status').gte('created_at', new Date(Date.now() - 25 * 3600_000).toISOString()).order('created_at').limit(5000); if (error) throw error; return data as unknown as LogPoint[]; },
    refetchInterval: 300_000,
  });
  const { data: unread = 0 } = useQuery({ queryKey: ['alerts-unread'], queryFn: async () => { const { count } = await supabase.from('alerts').select('id', { count: 'exact', head: true }).is('read_at', null); return count ?? 0; }, refetchInterval: 30_000 });
  const { data: styles = [] } = useQuery({ queryKey: ['card-style'], queryFn: async () => { const { data } = await supabase.from('network_settings').select('source, confirmed'); return data ?? []; } });

  useEffect(() => {
    if (profile && !profile.account_type) navigate({ to: '/onboarding', replace: true });
    else if (profile && !isLoading && routers.length === 0) navigate({ to: '/onboarding', replace: true });
  }, [profile, isLoading, routers.length, navigate]);

  const onlineCount = routers.filter((r) => isOnline(r.last_seen_at)).length;
  const reportedActive = routers.reduce((n, r) => { const s = (r.last_status ?? {}) as { hotspotActive?: number; umActive?: number }; return n + (s.hotspotActive ?? 0) + (s.umActive ?? 0); }, 0);
  const activeNow = sessions.length || reportedActive;
  const counts = useMemo(() => { const c: Record<CardState, number> = { unused: 0, active: 0, almost: 0, finished: 0, disabled: 0 }; for (const card of cards) c[cardState(card)]++; return c; }, [cards]);
  const lowPackages = useMemo(() => {
    const m = new Map<string, { total: number; ready: number }>();
    for (const c of cards) { const k = c.profile || '-'; const e = m.get(k) ?? { total: 0, ready: 0 }; e.total++; if (cardState(c) === 'unused') e.ready++; m.set(k, e); }
    return [...m.entries()].filter(([, e]) => e.total >= 30 && e.ready < LOW_READY).map(([name, e]) => ({ name, ready: e.ready }));
  }, [cards]);
  const alerts = routers.flatMap((r) => routerAlerts(r as never, ar));
  const styleConfirmed = cards.length === 0 || styles.some((s) => s.confirmed);

  const nav: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'home', icon: <Home />, label: t('الرئيسية', 'Home') },
    { id: 'cards', icon: <Ticket />, label: t('الكروت', 'Cards') },
    { id: 'active', icon: <Activity />, label: t('النشطون', 'Active') },
    { id: 'more', icon: <Menu />, label: t('المزيد', 'More') },
  ];
  const navButton = (n: (typeof nav)[number]) => <button key={n.id} type="button" aria-current={tab === n.id ? 'page' : undefined} onClick={() => go(n.id)} className="dash-nav-item">{n.icon}<span>{n.label}</span></button>;

  return (
    <main className="app-shell min-h-screen pb-28 pt-6 sm:pb-10" lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <div aria-hidden className="landing-pattern" />
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">Mikro</p>
          <h1 className="truncate text-2xl font-bold">{profile?.network_name || t('شبكتي', 'My network')}</h1>
          <button type="button" onClick={() => go('more')} className="flex min-h-8 items-center gap-2 text-sm text-muted-foreground">
            <span className={`size-2 rounded-full ${onlineCount === routers.length && routers.length ? 'bg-primary' : 'bg-destructive'}`} aria-hidden />
            {routers.length ? (onlineCount === routers.length ? t('الشبكة شغالة', 'Network online') : t(`${routers.length - onlineCount} راوتر غير متصل`, `${routers.length - onlineCount} router offline`)) : t('جارٍ التحميل...', 'Loading...')}
            {profile?.city && <span>· {profile.city}</span>}
          </button>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" className="relative size-11" aria-label={t(`التنبيهات${unread ? ` (${unread} جديد)` : ''}`, `Alerts${unread ? ` (${unread} new)` : ''}`)} asChild>
            <Link to="/alerts"><Bell />{unread > 0 && <span className="absolute end-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground" dir="ltr">{unread > 9 ? '9+' : unread}</span>}</Link>
          </Button>
          <Button variant="ghost" size="icon" className="size-11" aria-label={ar ? 'English' : 'العربية'} onClick={toggleLanguage}><Globe2 /></Button>
        </div>
      </header>

      <nav aria-label={t('أقسام اللوحة', 'Dashboard sections')} className="dash-nav items-center">
        {nav.slice(0, 2).map(navButton)}
        <button type="button" className="dash-nav-quick" aria-label={t('إجراءات سريعة', 'Quick actions')} onClick={() => setQuick(true)}><Plus /></button>
        {nav.slice(2).map(navButton)}
      </nav>

      {tab === 'home' && <div className="mt-6"><EnableAlerts ar={ar} compact /></div>}
      {tab === 'home' && <HomeTab ar={ar} activeNow={activeNow} log={log} counts={counts} total={cards.length} inUse={counts.active + counts.almost} lowPackages={lowPackages} onlineCount={onlineCount} routerCount={routers.length} alerts={alerts} styleConfirmed={styleConfirmed} go={(n, f) => go(n, f)} />}
      {tab === 'cards' && <CardsTab key={search.filter ?? 'all'} cards={cards} profiles={pkgs} routers={routers} sessions={sessions} ar={ar} initialFilter={search.filter} />}
      {tab === 'active' && <ActiveTab sessions={sessions} reported={reportedActive} routers={routers} ar={ar} />}
      {tab === 'more' && (
        <div className="mt-6 space-y-6">
          <section className="grid gap-2 sm:grid-cols-2">
            <Link to="/settings" className="app-panel tap-card flex items-center gap-3 p-4"><Settings className="size-5 text-primary" /><span className="flex-1"><b className="block">{t('إعدادات الحساب', 'Account settings')}</b><span className="text-xs text-muted-foreground">{t('شكل الكروت، اسم الشبكة', 'Card style, network name')}</span></span><ChevronRight className="tap-chevron" /></Link>
            <Link to="/alerts" className="app-panel tap-card flex items-center gap-3 p-4"><ListChecks className="size-5 text-primary" /><span className="flex-1"><b className="block">{t('التنبيهات وسجل الإجراءات', 'Alerts and action log')}</b><span className="text-xs text-muted-foreground">{t('كل ما حصل في شبكتك، محفوظ', 'Everything that happened, saved')}</span></span><ChevronRight className="tap-chevron" /></Link>
            <Link to="/health" className="app-panel tap-card flex items-center gap-3 p-4"><HeartPulse className="size-5 text-primary" /><span className="flex-1"><b className="block">{t('صحة الراوتر', 'Router health')}</b><span className="text-xs text-muted-foreground">{t('فحص الأعطال الشائعة والأمان', 'Common faults and security check')}</span></span><ChevronRight className="tap-chevron" /></Link>
            <button type="button" onClick={() => supabase.auth.signOut().then(() => location.assign('/auth'))} className="app-panel tap-card flex items-center gap-3 p-4 text-start"><LogOut className="size-5 text-destructive" /><b className="flex-1">{t('تسجيل الخروج', 'Sign out')}</b></button>
          </section>
          <NetworkPanel />
        </div>
      )}

      <Sheet open={quick} onOpenChange={setQuick}>
        <SheetContent side="bottom" dir={ar ? 'rtl' : 'ltr'} className="rounded-t-2xl pb-8">
          <SheetHeader><SheetTitle>{t('إجراءات سريعة', 'Quick actions')}</SheetTitle><SheetDescription>{t('أكثر ما يحتاجه صاحب الشبكة يومياً', 'What network owners do most')}</SheetDescription></SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-3 px-4">
            <QuickAction icon={<Search />} label={t('ابحث عن كرت', 'Look up a card')} onClick={() => { setQuick(false); go('cards'); }} />
            <QuickAction icon={<Wifi />} label={t('من متصل الآن', "Who's online")} onClick={() => { setQuick(false); go('active'); }} />
            <QuickAction icon={<PlusCircle />} label={t('إضافة كروت', 'Add cards')} soon={t('قريباً', 'Soon')} />
            <QuickAction icon={<Printer />} label={t('طباعة آخر دفعة', 'Print last batch')} soon={t('قريباً', 'Soon')} />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}

function QuickAction({ icon, label, onClick, soon }: { icon: React.ReactNode; label: string; onClick?: () => void; soon?: string }) {
  return (
    <button type="button" disabled={!!soon} onClick={onClick} className="app-panel tap-card flex min-h-24 flex-col items-start justify-between gap-2 p-4 text-start disabled:cursor-not-allowed disabled:opacity-60">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary [&>svg]:size-5">{icon}</span>
      <span className="font-semibold">{label}{soon && <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{soon}</span>}</span>
    </button>
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

