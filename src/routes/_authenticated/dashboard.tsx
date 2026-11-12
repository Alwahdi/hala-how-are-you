import { PageLanguage } from '@/components/page-language';
import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Activity, Bell, Globe2, HeartPulse, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@tanstack/react-router';
import { routerAlerts } from '@/components/dashboard/network-panel';
import { CARD_STATES, cardState, formatBytes, formatDuration, withPackage, type CardRow, type CardState } from '@/lib/card-status';
import { CardsTab } from '@/components/dashboard/cards-tab';
import { HomeTab } from '@/components/dashboard/home-tab';
import { EnableAlerts } from '@/components/alerts/enable-alerts';
import type { ProfileRow, RouterRow, Session } from '@/components/dashboard/types';
import type { LogPoint } from '@/lib/active-history';
import { QueryNotice } from '@/components/query-notice';
import { activeTotal, freshSession, packageKey } from '@/lib/operations-ui';
import { isOnline } from '@/lib/router-script';
import { Navigate } from '@tanstack/react-router';

type Tab = 'home' | 'cards' | 'active' | 'more';
const TABS: Tab[] = ['home', 'cards', 'active', 'more'];
const FILTERS: CardState[] = CARD_STATES;
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


/** Loads every card in pages of 1000, reporting progress so the cards page can show the list from the first page on. */
async function allCards(onProgress?: (loaded: CardRow[], total: number | null) => void): Promise<CardRow[]> {
  const { count, error: countError } = await supabase.from('router_cards').select('name', { count: 'exact', head: true });
  if (countError) throw countError;
  const total = count ?? null;
  const out: CardRow[] = [];
  onProgress?.([], total);
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase.from('router_cards').select('*').order('name').range(from, from + 999);
    if (error) throw error;
    out.push(...(data as CardRow[]));
    onProgress?.([...out], total);
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

  const { data: profile, isSuccess: profileReady, isError: profileError, refetch: retryProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('profiles').select('account_type, network_name, city').eq('id', u.user?.id ?? '').maybeSingle();
      if (error) throw error;
      return data ?? { account_type: null, network_name: null, city: null };
    },
  });
  const { data: routers = [], isLoading, isSuccess: routersReady, isError: routersError, refetch: retryRouters } = useQuery({
    queryKey: ['routers'], retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('routers').select('id, name, role, ros_version, connection_method, cloud_host, direct_port, direct_tls, last_seen_at, last_status, last_check_error, cards_synced_at').order('created_at');
      if (error) throw error;
      return data as RouterRow[];
    },
    refetchInterval: 15_000,
  });
  // First load shows each page of 1000 as it arrives, with a progress bar; later refreshes swap the list quietly.
  const [partial, setPartial] = useState<{ cards: CardRow[]; total: number | null } | null>(null);
  const { data: loadedCards, isFetching: cardsFetching, isError: cardsError, refetch: retryCards } = useQuery({ queryKey: ['cards'], retry: false, queryFn: () => allCards((c, total) => setPartial((p) => (p === null || c.length >= p.cards.length ? { cards: c, total } : p))), refetchInterval: 60_000 });
  const { data: pkgs = [], isError: pkgsError, refetch: retryPkgs } = useQuery({ queryKey: ['profiles-pkg'], retry: false, queryFn: async () => { const { data, error } = await supabase.from('router_profiles').select('*'); if (error) throw error; return data as ProfileRow[]; }, refetchInterval: 120_000 });
  const rawCards = loadedCards ?? partial?.cards ?? [];
  const cards = useMemo(() => withPackage(rawCards, pkgs), [rawCards, pkgs]);
  const cardsLoad = loadedCards ? null : { loaded: partial?.cards.length ?? 0, total: partial?.total ?? null, fetching: cardsFetching };
  const { data: sessions = [], isError: sessionsError, refetch: retrySessions } = useQuery({
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
    if (profileReady && profile && !profile.account_type) navigate({ to: '/onboarding', replace: true });
    else if (profileReady && profile && routersReady && routers.length === 0) navigate({ to: '/onboarding', replace: true });
  }, [profile, profileReady, routersReady, routers.length, navigate]);

  const onlineCount = routers.filter((r) => isOnline(r.last_seen_at)).length;
  
  const currentSessions = sessions.filter((s) => freshSession(s, routers));
  const activeNow = sessionsError || routersError ? null : activeTotal(routers);
  const counts = useMemo(() => { const c: Record<CardState, number> = { unused: 0, active: 0, almost: 0, finished: 0, expired: 0, disabled: 0 }; for (const card of cards) c[cardState(card)]++; return c; }, [cards]);
  const lowPackages = useMemo(() => {
    const m = new Map<string, { total: number; ready: number; name: string }>();
    for (const c of cards) { const name = `${c.profile || '-'} · ${routers.find((r) => r.id === c.router_id)?.name ?? ''}`; const k = packageKey({ router_id: c.router_id, source: c.source, name: c.profile || '-' }); const e = m.get(k) ?? { total: 0, ready: 0, name }; e.total++; if (cardState(c) === 'unused') e.ready++; m.set(k, e); }
    return [...m.entries()].filter(([, e]) => e.total >= 30 && e.ready < LOW_READY).map(([, e]) => ({ name: e.name, ready: e.ready }));
  }, [cards, routers]);
  const alerts = routers.flatMap((r) => routerAlerts(r as never, ar));
  const styleConfirmed = cards.length === 0 || styles.some((s) => s.confirmed);

  return (
    <main className="app-shell min-h-screen pb-28 pt-6 sm:pb-10" lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <PageLanguage titles={['لوحة الشبكة', 'Network dashboard']} />
      <div aria-hidden className="landing-pattern" />
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border pb-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">Mikro</p>
          <h1 className="truncate text-2xl font-bold">{profile?.network_name || t('شبكتي', 'My network')}</h1>
          <button type="button" onClick={() => navigate({to:'/routers'})} className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
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

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button asChild variant={tab === 'active' ? 'default' : 'outline'} className="h-11"><Link to="/dashboard" search={{tab:'active'}}><Activity />{t('النشطون','Active users')}</Link></Button>
        <Button asChild variant="outline" className="h-11"><Link to="/health"><HeartPulse />{t('صحة الشبكة','Network health')}</Link></Button>
      </div>

      {(profileError || routersError || cardsError || pkgsError || sessionsError) && <QueryNotice ar={ar} stale={cards.length > 0 || routers.length > 0} retry={() => { retryProfile(); retryRouters(); retryCards(); retryPkgs(); retrySessions(); }} />}
      {tab === 'home' && <div className="mt-6"><EnableAlerts ar={ar} compact /></div>}
      {tab === 'home' && <HomeTab ar={ar} activeNow={activeNow} log={log} counts={counts} total={cards.length} inUse={counts.active + counts.almost} lowPackages={lowPackages} onlineCount={onlineCount} routerCount={routers.length} alerts={alerts} styleConfirmed={styleConfirmed} go={(n, f) => n === 'more' ? navigate({to:'/routers'}) : go(n, f)} />}
      {tab === 'cards' && <CardsTab key={search.filter ?? 'all'} cards={cards} profiles={pkgs} routers={routers} sessions={currentSessions} ar={ar} initialFilter={search.filter} readError={cardsError} load={cardsError ? null : cardsLoad} />}
      {tab === 'active' && <ActiveTab sessions={currentSessions} reported={activeNow} staleCount={sessions.length - currentSessions.length} routers={routers} ar={ar} />}
      {tab === 'more' && <Navigate to="/routers" replace />}

    </main>
  );
}

function ActiveTab({ sessions, reported, staleCount, routers, ar }: { sessions: Session[]; reported: number | null; staleCount: number; routers: RouterRow[]; ar: boolean }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const [q, setQ] = useState('');
  const list = sessions.filter((s) => !q || s.username.toLowerCase().includes(q.toLowerCase()) || (s.mac ?? '').toLowerCase().includes(q.toLowerCase()));
  const routerName = (id: string) => routers.find((r) => r.id === id)?.name ?? '';
  return (
    <div className="mt-6 space-y-4">
      <div className="app-panel flex items-center gap-3 p-4"><Wifi className="size-5 text-primary" /><span className="flex-1 text-sm">{t('متصلون الآن', 'Active now')}</span><b className="text-2xl" dir="ltr">{reported ?? '—'}</b></div>
      {(reported == null || staleCount > 0) && <p role="status" className="text-sm text-muted-foreground">{t('الحالة الحالية غير مكتملة. لا نعتبر جلسات الراوتر المنقطع اتصالًا حيًا.', 'Current status is incomplete. Offline-router sessions are not shown as live.')}</p>}
      {reported != null && reported > sessions.length && <p className="text-sm text-muted-foreground">{t(`تفاصيل ${sessions.length} جلسة من إجمالي ${reported}؛ التفاصيل قد تكون جزئية.`, `Details for ${sessions.length} sessions of ${reported} total; coverage may be partial.`)}</p>}
      {sessions.length === 0 ? (
        <p className="app-panel p-6 text-sm text-muted-foreground">{reported ? t(`الراوتر يقول ${reported} متصل الآن. تفاصيل كل مستخدم تظهر لما يكون الاتصال المباشر شغال.`, `The router reports ${reported} active. Per-user details appear once direct access works.`) : reported === 0 ? t('ما في أحد متصل الآن.', 'Nobody is connected right now.') : t('ننتظر تقريرًا حديثًا من الراوتر.', 'Waiting for a recent router report.')}</p>
      ) : (
        <>
          <Input aria-label={t('البحث في الجلسات', 'Search sessions')} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ابحث بالكرت أو MAC', 'Search by card or MAC')} className="h-12" dir="auto" />
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

