import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CheckSquare, Info, Layers, Loader2, Pencil, Plus, RotateCcw, Search, Trash2, Ban, Play, Wifi, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CARD_STATES, cardState, type CardRow, type CardState } from '@/lib/card-status';
import type { ProfileRow, RouterRow, Session, Source } from './types';
import { UserManagerSetup } from './user-manager-setup';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { requestRemoveFinished } from '@/lib/alerts.functions';
import { requestBulkAction, requestCardAction } from '@/lib/card-actions.functions';
import { Link } from '@tanstack/react-router';
import { BULK_MAX, SAFE_VALUE, umStatus } from '@/lib/card-actions';
import { packageFacts } from '@/lib/packages';
import { packageKey, relativeRead, summarizeBulk } from '@/lib/operations-ui';
import { isOnline } from '@/lib/router-script';
import { CardListRow, STATE_LABEL, STATE_TONE, type QuickAction, type RowJob } from './card-row';
import { CardDetail } from './card-detail';
import { EngineerDetails, PackageCard, PackageHelp, type PkgSummary } from './package-card';
import { PackageForm } from './package-form';
import { collectPages } from '@/lib/voucher-pages';

export { STATE_LABEL, STATE_TONE };

const PAGE = 50;
const SELECT_MAX = BULK_MAX * 5;

type Load = { loaded: number; total: number | null; fetching: boolean } | null;
type Props = { cards: CardRow[]; profiles: ProfileRow[]; routers: RouterRow[]; sessions: Session[]; ar: boolean; initialFilter?: CardState | undefined; load?: Load; readError?: boolean };
const key = (c: Pick<CardRow, 'router_id' | 'source' | 'name'>) => `${c.router_id}|${c.source}|${c.name}`;

const REQ_ERR: Record<string, [string, string]> = {
  offline: ['الراوتر غير متصل الآن.', 'The router is offline.'],
  busy: ['فيه أمر على هذا الكرت قيد التنفيذ.', 'An action on this card is still running.'],
  missing: ['ما لقينا الكرت.', 'Card not found.'],
  no_package: ['ما نعرف باقة هذا الكرت، فما نقدر نجدده.', "We don't know this card's package."],
};

export function CardsTab({ cards, profiles, routers, sessions, ar, initialFilter, load, readError = false }: Props) {
  const t = (a: string, b: string) => (ar ? a : b);
  const hasUm = cards.some((c) => c.source === 'usermanager') || profiles.some((p) => p.source === 'usermanager');
  const hasHs = cards.some((c) => c.source === 'hotspot') || profiles.some((p) => p.source === 'hotspot') || !hasUm;
  const v7 = routers.some((r) => r.ros_version === 'v7');
  const [source, setSource] = useState<Source>(hasHs ? 'hotspot' : 'usermanager');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<CardState | 'all' | 'online'>(initialFilter ?? 'all');
  const [pkg, setPkg] = useState<string | null>(null);
  const [batch,setBatch]=useState('');
  const {data: batchRows=[]}=useQuery({queryKey:['card-issuance-batches'],queryFn:()=>collectPages(async offset=>{const {data,error,count}=await supabase.from('voucher_batches').select('id,label,source',{count:'exact'}).order('created_at',{ascending:false}).order('id').range(offset,offset+99);if(error||count===null)throw error??Error('read_failed');return {rows:data??[],total:count};})});
  const {data: batchItems=[]}=useQuery({queryKey:['card-issuance-items',batch],enabled:!!batch,queryFn:()=>collectPages(async offset=>{const {data,error,count}=await supabase.from('voucher_items').select('router_id,source,name',{count:'exact'}).eq('batch_id',batch).eq('state','confirmed').order('ordinal').range(offset,offset+99);if(error||count===null)throw error??Error('read_failed');return {rows:data??[],total:count};})});
  const batchKeys=useMemo(()=>new Set(batchItems.map(key)),[batchItems]);
  const [page, setPage] = useState(0);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [explained, setExplained] = useState(false);
  const [pkgHelp, setPkgHelp] = useState(false);
  const [showPackages, setShowPackages] = useState(false);
  const [moreFilters,setMoreFilters]=useState(false);
  const [sending, setSending] = useState(false);
  const [bulkTargets, setBulkTargets] = useState<Record<string, { routerId: string; source: Source; action: 'off' | 'on' | 'del'; names: string[] }>>({});
  const [form, setForm] = useState<{ edit?: ProfileRow | undefined } | null>(null);
  const [confirmClean, setConfirmClean] = useState(false);
  const [cleanMsg, setCleanMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ action: 'renew' | 'off' | 'del'; card: CardRow } | null>(null);
  const [jobs, setJobs] = useState<Record<string, RowJob>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<'off' | 'on' | 'del' | null>(null);
  const [bulkJobs, setBulkJobs] = useState<string[]>([]);
  const removeFinished = useServerFn(requestRemoveFinished);
  const sendAction = useServerFn(requestCardAction);
  const sendBulk = useServerFn(requestBulkAction);
  const qc = useQueryClient();
  const refresh = () => { qc.invalidateQueries({ queryKey: ['cards'] }); qc.invalidateQueries({ queryKey: ['sessions'] }); };
  const { data: pendingClean = 0 } = useQuery({ queryKey: ['clean-jobs'], queryFn: async () => { const { count } = await supabase.from('router_jobs').select('id', { count: 'exact', head: true }).eq('kind', 'remove_cards').in('status', ['pending', 'sent']); return count ?? 0; }, refetchInterval: 10_000 });
  const { data: bulkState = [], isError: bulkReadError, refetch: retryBulkRead } = useQuery({
    queryKey: ['bulk-jobs', bulkJobs], enabled: bulkJobs.length > 0,
    queryFn: async () => { const { data, error } = await supabase.from('router_jobs').select('id, status, result, payload').in('id', bulkJobs); if (error) throw error; const rows = data ?? []; if (rows.every((r) => ['done', 'failed', 'expired'].includes(r.status))) refresh(); return rows; },
    refetchInterval: (qq) => ((qq.state.data as { status: string }[] | undefined)?.every((r) => ['done', 'failed', 'expired'].includes(r.status)) ? false : 3000),
  });
  const finishedHs = useMemo(() => cards.filter((c) => c.source === 'hotspot' && cardState(c) === 'finished'), [cards]);
  async function cleanAll() {
    setSending(true); setCleanMsg(null);
    let n = 0, failures = 0;
    for (const r of routers) {
      try { const x = await removeFinished({ data: { id: r.id } }); n += x.queued ?? 0; }
      catch { failures++; }
    }
    setSending(false); setConfirmClean(false);
    setCleanMsg(failures ? t(`تعذر إرسال الحذف إلى ${failures} راوتر. أُرسل ${n} كرت؛ تأكد من الاتصال وحاول مرة أخرى.`, `Removal failed for ${failures} routers. Sent ${n} cards; check connectivity and retry.`) : n ? t(`أرسلنا ${n} كرت للحذف؛ ننتظر تأكيد الراوتر.`, `Sent ${n} cards for removal; waiting for router confirmation.`) : t('لا توجد كروت مؤكدة خلص رصيدها للحذف.', 'No confirmed used-up cards to remove.'));
    qc.invalidateQueries({ queryKey: ['clean-jobs'] });
  }

  const mine = useMemo(() => cards.filter((c) => c.source === source), [cards, source]);
  const onlineSet = useMemo(() => new Set(sessions.map((s) => `${s.router_id}|${s.username}`)), [sessions]);
  const isLive = (c: CardRow) => onlineSet.has(`${c.router_id}|${c.name}`);
  const readyRouter = (id: string) => { const r = routers.find((x) => x.id === id); return (r?.last_status as { umi?: string } | null)?.umi !== undefined; };
  const counts = useMemo(() => { const c: Record<string, number> = { online: 0 }; for (const s of CARD_STATES) c[s] = 0; for (const x of mine) { c[cardState(x)] = (c[cardState(x)] ?? 0) + 1; if (onlineSet.has(`${x.router_id}|${x.name}`)) c['online'] = (c['online'] ?? 0) + 1; } return c; }, [mine, onlineSet]);
  const umStates = routers.map((r) => ({ r, st: umStatus(r.last_status as { umi?: string; umr?: number } | null) }));
  const packages = useMemo(() => {
    const m = new Map<string, Omit<PkgSummary, 'facts'> & { cards: CardRow[] }>();
    const blank = (name: string, routerId: string, p?: ProfileRow) => ({ name, routerId, id: packageKey({ router_id: routerId, source, name }), routerName: routers.find((r) => r.id === routerId)?.name ?? '', total: 0, ready: 0, live: 0, today: 0, cards: [] as CardRow[], ...(p ? { p } : {}) });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (const p of profiles.filter((x) => x.source === source)) if (!m.has(packageKey(p))) m.set(packageKey(p), blank(p.name, p.router_id, p));
    for (const c of mine) {
      const name = c.profile || '-'; const k = packageKey({ router_id: c.router_id, source: c.source, name }); const e = m.get(k) ?? blank(name, c.router_id); e.total++; e.cards.push(c);
      if (cardState(c) === 'unused') e.ready++;
      if (onlineSet.has(`${c.router_id}|${c.name}`)) e.live++;
      if (c.first_used_at && new Date(c.first_used_at) >= today) e.today++;
      m.set(k, e);
    }
    return [...m.values()].filter((e) => e.name !== 'default' || e.total > 0).sort((a, b) => b.total - a.total).map(({ cards: cs, ...e }) => ({ ...e, facts: packageFacts(e.p, cs) }) as PkgSummary);
  }, [profiles, mine, source, onlineSet, routers]);
  const selectedPkg = packages.find((e) => e.id === pkg);
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return mine.filter((c) => (!batch || batchKeys.has(key(c))) && (filter === 'all' || (filter === 'online' ? onlineSet.has(`${c.router_id}|${c.name}`) : cardState(c) === filter)) && (!pkg || packageKey({ router_id: c.router_id, source: c.source, name: c.profile || '-' }) === pkg) && (!ql || c.name.toLowerCase().includes(ql) || (c.comment ?? '').toLowerCase().includes(ql)));
  }, [mine, filter, pkg, q, onlineSet,batch,batchKeys]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const pg = Math.min(page, pages - 1);
  const shown = list.slice(pg * PAGE, pg * PAGE + PAGE);
  const open = openKey ? cards.find((c) => key(c) === openKey) ?? null : null;
  const live = open ? sessions.find((s) => s.username === open.name && s.router_id === open.router_id) : undefined;
  const syncLabel = relativeRead(routers.map((r) => r.cards_synced_at).filter((v): v is string => !!v).sort()[0], ar);
  const canAdd = routers.length > 0 && (source === 'hotspot' || umStates.some((s) => s.st === 'on' || s.st === 'on_no_reader' || s.st === 'off'));

  const resetPage = () => setPage(0);
  async function runAction(card: CardRow, action: 'renew' | 'off' | 'on' | 'del' | 'kick') {
    setMsg(null);
    const res = await sendAction({ data: { routerId: card.router_id, source: card.source as Source, name: card.name, action } }).catch(() => ({ ok: false as const, error: 'error' as const }));
    if (!res.ok) { setMsg((REQ_ERR[res.error] ?? ['ما قدرنا نرسل الأمر. جرّب مرة ثانية.', "We couldn't send it. Try again."])[ar ? 0 : 1]); return; }
    setJobs((j) => ({ ...j, [key(card)]: { id: res.id, action } }));
  }
  function onQuick(card: CardRow, a: QuickAction) {
    if (a === 'copy') { navigator.clipboard.writeText(card.name).then(() => setMsg(t(`نسخنا ${card.name}`, `Copied ${card.name}`))).catch(() => setMsg(t('تعذر النسخ؛ افتح التفاصيل وانسخ الرقم يدويًا.', 'Copy failed; open details and copy the number manually.'))); return; }
    if (a === 'send') { window.open(`https://wa.me/?text=${encodeURIComponent(t(`كرت الإنترنت: ${card.name}`, `Internet card: ${card.name}`))}`, '_blank', 'noreferrer'); return; }
    if (a === 'renew' || a === 'off' || a === 'del') { setConfirm({ action: a, card }); return; }
    runAction(card, a);
  }
  const selected = useMemo(() => mine.filter((c) => sel.has(key(c))), [mine, sel]);
  function toggle(c: CardRow, v: boolean) { setSel((s) => { const n = new Set(s); if (v && n.size < SELECT_MAX) n.add(key(c)); else n.delete(key(c)); return n; }); }
  function selectPage() { setSel((s) => { const n = new Set(s); for (const c of shown) if (SAFE_VALUE.test(c.name) && readyRouter(c.router_id) && n.size < SELECT_MAX) n.add(key(c)); return n; }); }
  async function runBulk(action: 'off' | 'on' | 'del') {
    if (sending) return; setSending(true); setBulkConfirm(null); setMsg(null);
    const byRouter = new Map<string, string[]>();
    for (const c of selected) byRouter.set(c.router_id, [...(byRouter.get(c.router_id) ?? []), c.name]);
    const ids: string[] = []; const targets: typeof bulkTargets = {}; let failed = 0;
    for (const [routerId, names] of byRouter) for (let i = 0; i < names.length; i += BULK_MAX) {
      const res = await sendBulk({ data: { routerId, source, action, names: names.slice(i, i + BULK_MAX) } }).catch(() => ({ ok: false as const, error: 'error' as const }));
      if (res.ok) { ids.push(res.id); targets[res.id] = { routerId, source, action, names: names.slice(i, i + BULK_MAX) }; } else failed++;
    }
    setBulkJobs(ids); setBulkTargets(targets); setSending(false); if (!failed) { setSel(new Set()); setSelecting(false); }
    if (failed) setMsg(t('بعض الكروت ما انرسلت: الراوتر غير متصل. جرّب بعدين.', 'Some cards were not sent: the router is offline.'));
  }
  const bulkSummary = summarizeBulk(bulkState.map((r) => ({ ...r, payload: r.payload as { names?: string[] } | null })));
  async function retryBulk() {
    if (sending) return; setSending(true);
    const keep = bulkJobs.filter((id) => !bulkSummary.retryIds.includes(id));
    const targets = { ...bulkTargets }; let failed = false;
    for (const id of bulkSummary.retryIds) { const target = targets[id]; if (!target) continue; const res = await sendBulk({ data: target }).catch(() => ({ ok: false as const })); if (res.ok) { keep.push(res.id); targets[res.id] = target; } else { keep.push(id); failed = true; } }
    setBulkJobs(keep); setBulkTargets(targets); setSending(false); if (failed) setMsg(t('تعذرت إعادة بعض الأوامر؛ تأكد من اتصال الراوتر.', 'Some retries failed; check router connectivity.'));
  }

  const filterChips: (CardState | 'all' | 'online')[] = ['all', 'online', 'unused', 'active', 'almost', 'finished', 'expired', 'disabled'];
  const chipLabel = (f: (typeof filterChips)[number]) => f === 'all' ? t('الكل', 'All') : f === 'online' ? t('متصل الآن', 'Online now') : t(...STATE_LABEL[f]);

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap gap-2"><Button asChild className="h-11"><Link to="/vouchers" search={{add:true}}><Plus/>{t("إضافة كروت","Add cards")}</Link></Button><Button asChild variant="outline" className="h-11"><Link to="/vouchers">{t('إصدار الكروت والقوالب والطباعة','Issue cards, templates & print')}</Link></Button></div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="seg" role="group" aria-label={t('نوع الكروت', 'Card system')}>
          <button type="button" aria-pressed={source === 'hotspot'} onClick={() => { setSource('hotspot'); setPkg(null); resetPage(); setSel(new Set()); }}>Hotspot</button>
          <button type="button" aria-pressed={source === 'usermanager'} onClick={() => { setSource('usermanager'); setPkg(null); resetPage(); setSel(new Set()); }}>User Manager</button>
        </div>
        <Button variant="ghost" type="button" onClick={() => setExplained(!explained)} aria-expanded={explained} className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground"><Info className="size-4" />{t('ما الفرق؟', "What's the difference?")}</Button>
      </div>
      {explained && (
        <p className="app-panel p-4 text-sm leading-relaxed">
          <b>Hotspot</b>: {t('الكروت محفوظة في الراوتر نفسه، وكل باقة لها سرعة وعدد أجهزة.', 'Cards live on the router itself; each package sets speed and devices.')}<br />
          <b>User Manager</b>: {t('نظام كروت مركزي داخل الراوتر (v6 وv7): مدة صلاحية، سعر، وحدود بيانات لكل باقة، ويخدم أكثر من راوتر.', 'A central card system on the router (v6 and v7): validity, price and data limits per package, serving more than one router.')}
        </p>
      )}

      {load && (
        <div role="status" className="app-panel space-y-2 p-4">
          <p className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin text-primary" />{load.total ? t(`نحمّل الكروت... ${load.loaded.toLocaleString('en')} من ${load.total.toLocaleString('en')}`, `Loading cards... ${load.loaded.toLocaleString('en')} of ${load.total.toLocaleString('en')}`) : t('نحمّل الكروت...', 'Loading cards...')}</p>
          <div className="meter h-3" role="progressbar" aria-valuemin={0} aria-valuemax={load.total ?? 100} aria-valuenow={load.loaded}><span style={{ width: `${load.total ? Math.max(4, (load.loaded / load.total) * 100) : 10}%` }} /></div>
        </div>
      )}

      {source === 'usermanager' && !hasUm && !load ? <UmEmpty states={umStates} ar={ar} v7={v7} /> : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label={t('البحث عن كرت', 'Search cards')} value={q} onChange={(e) => { setQ(e.target.value); resetPage(); }} placeholder={t('ابحث برقم الكرت أو الملاحظة', 'Search by card number or note')} className="h-12 ps-10 pe-12" dir="auto" />
            {q && <Button variant="ghost" size="icon" className="absolute end-1 top-1 size-10" aria-label={t('مسح البحث','Clear search')} onClick={()=>{setQ('');resetPage();}}><X /></Button>}
          </div>
          <section aria-label={t('الباقات', 'Packages')}>
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <h2 className="flex min-w-0 items-center gap-1 font-bold"><Button variant="ghost" className="h-11" aria-expanded={showPackages} onClick={() => setShowPackages(!showPackages)}><Layers />{t(`الباقات (${packages.length})`, `Packages (${packages.length})`)}</Button>
                <button type="button" onClick={() => setPkgHelp(!pkgHelp)} aria-expanded={pkgHelp} aria-label={t('وش الفرق بين الوقت والصلاحية؟', 'Time vs validity?')} className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><Info className="size-4" /></button>
              </h2>
              {canAdd && <Button variant="outline" className="h-11 shrink-0" onClick={() => setForm({})}><Plus />{t('باقة جديدة', 'New package')}</Button>}
            </div>
            {pkgHelp && <div className="mb-3"><PackageHelp ar={ar} /></div>}
            {showPackages && (packages.length === 0 ? <p className="app-panel p-4 text-sm text-muted-foreground">{t('ما وصلت باقات بعد. تظهر بعد اكتمال قراءة الراوتر، أو أضف باقة جديدة.', 'No packages yet. They appear after the router completes a read, or add a new one.')}</p> : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {packages.map((e) => <PackageCard key={e.id} e={e} ar={ar} selected={pkg === e.id} onClick={() => { setPkg(pkg === e.id ? null : e.id); resetPage(); }} />)}
              </div>
            ))}
          </section>
          {selectedPkg?.p && (
            <div className="space-y-3">
              <Button variant="outline" className="h-11 w-full" onClick={() => setForm({ edit: selectedPkg.p })}><Pencil />{t(`تعديل الباقة ${selectedPkg.name}`, `Edit package ${selectedPkg.name}`)}</Button>
              <EngineerDetails p={selectedPkg.p} ar={ar} />
            </div>
          )}

          <label className="block text-sm"><span className="mb-2 block text-muted-foreground">{t('دفعة الإصدار','Issuance batch')}</span><select className="h-11 w-full rounded-md border border-input bg-card px-3" value={batch} onChange={e=>{setBatch(e.target.value);resetPage();}}><option value="">{t('كل الدفعات','All batches')}</option>{batchRows.filter(b=>b.source===source).map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select></label>
          <div className="card-filters" role="group" aria-label={t('الحالة', 'Status')}>
            {filterChips.filter((f)=>moreFilters || ['all','online','unused'].includes(f) || filter===f).map((f) => (
              <Button variant="ghost" key={f} type="button" aria-pressed={filter === f} onClick={() => { setFilter(f); resetPage(); }} className="chip">
                {f === 'online' && <span className={`size-2 rounded-full ${counts['online'] ? 'bg-primary' : 'bg-muted-foreground/40'}`} />}
                {chipLabel(f)}{f !== 'all' && (!readError || mine.length > 0) && <span className="chip-count" dir="ltr">{counts[f] ?? 0}</span>}
              </Button>
            ))}
            <Button variant="outline" className="h-11" aria-expanded={moreFilters} onClick={()=>setMoreFilters(!moreFilters)}>{moreFilters?t('فلاتر أقل','Fewer filters'):t('كل الحالات','All statuses')}</Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{list.length ? t(`${pg * PAGE + 1}–${Math.min(list.length, pg * PAGE + PAGE)} من ${list.length.toLocaleString('en')} كرت`, `${pg * PAGE + 1}–${Math.min(list.length, pg * PAGE + PAGE)} of ${list.length.toLocaleString('en')} cards`) : readError ? t('تعذرت القراءة', 'Read failed') : t('0 كرت', '0 cards')}{selectedPkg ? ` · ${selectedPkg.name} · ${selectedPkg.routerName}` : ''} · {t('أقدم قراءة', 'Oldest reading')}: {syncLabel}</span>
            {mine.length > 0 && (selecting
              ? <span className="flex gap-2"><Button variant="ghost" className="h-11" onClick={selectPage}>{t('حدد الصفحة', 'Select page')}</Button><Button variant="ghost" className="h-11" onClick={() => { setSelecting(false); setSel(new Set()); }}><X />{t('إلغاء', 'Cancel')}</Button></span>
              : <Button variant="ghost" className="h-11" onClick={() => setSelecting(true)}><CheckSquare />{t('تحديد', 'Select')}</Button>)}
          </div>

          {source === 'hotspot' && filter === 'finished' && finishedHs.length > 0 && (
            <div className="app-panel flex flex-wrap items-center gap-3 p-4">
              <span className="flex-1 text-sm">{pendingClean ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin text-primary" />{t('جاري الحذف على الراوتر...', 'Removing on the router...')}</span> : t('الكروت اللي خلص رصيدها تأخذ مساحة وتبطئ البحث في الراوتر.', 'Used-up cards take space and slow searches on the router.')}</span>
              <Button variant="destructive" className="h-11" disabled={pendingClean > 0} onClick={() => setConfirmClean(true)}><Trash2 />{t(`احذف الكل (${finishedHs.length})`, `Remove all (${finishedHs.length})`)}</Button>
            </div>
          )}
          {cleanMsg && <p role="status" className="rounded-lg bg-muted p-3 text-sm">{cleanMsg}</p>}
          {msg && <p role="status" className="rounded-xl bg-muted p-3 text-sm">{msg}</p>}
          {bulkJobs.length > 0 && (
            <p role="status" className="flex flex-wrap items-center gap-2 rounded-lg bg-muted p-3 text-sm">
              {bulkReadError ? <>{t('تعذر قراءة نتيجة الأوامر؛ لا نعرف هل اكتملت.', 'Could not read command outcomes; completion is unknown.')}<Button variant="outline" onClick={() => { retryBulkRead(); }}>{t('إعادة المحاولة', 'Retry')}</Button></> : bulkSummary.over ? <>{t(`تم على ${bulkSummary.succeeded} كرت؛ لم يُنفذ ${bulkSummary.failed}.`, `${bulkSummary.succeeded} cards completed; ${bulkSummary.failed} not completed.`)}{bulkSummary.retryIds.length > 0 && <Button variant="outline" className="h-11" disabled={sending} onClick={retryBulk}>{t('أعد محاولة الفاشل', 'Retry failed')}</Button>}<button type="button" className="ms-auto text-xs underline" onClick={() => setBulkJobs([])}>{t('إخفاء', 'Hide')}</button></> : <><Loader2 className="size-4 animate-spin" />{t('الراوتر ينفذ على الكروت المحددة...', 'The router is working through the selected cards...')}</>}
            </p>
          )}

          {readError && mine.length === 0 ? null : mine.length === 0 && !load ? <p className="app-panel p-6 text-center text-sm text-muted-foreground">{t('ما وصلت قائمة الكروت بعد.', 'No card list yet.')}</p> : list.length === 0 && !load ? (
            <p className="app-panel p-6 text-center text-sm text-muted-foreground">{t('ما في كروت بهذا البحث أو الفلتر.', 'No cards match this search or filter.')}</p>
          ) : (
            <ul className="space-y-2">
              {shown.map((c) => (
                <CardListRow key={key(c)} c={c} ar={ar} live={isLive(c)} ready={readyRouter(c.router_id) && isOnline(routers.find((r) => r.id === c.router_id)?.last_seen_at ?? null)} selecting={selecting} selected={sel.has(key(c))} job={jobs[key(c)]}
                  onOpen={() => setOpenKey(key(c))} onSelect={(v) => toggle(c, v)} onAction={(a) => onQuick(c, a)} onJobOver={refresh} />
              ))}
            </ul>
          )}

          {pages > 1 && <Pager page={pg} pages={pages} onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }} ar={ar} />}
          {selecting && (
            <div className="sticky bottom-24 z-20 app-panel flex flex-wrap items-center gap-2 p-3 sm:bottom-4">
              <b className="flex-1 text-sm">{t(`${sel.size} محدد`, `${sel.size} selected`)}{sel.size >= SELECT_MAX ? t(` (الحد ${SELECT_MAX})`, ` (max ${SELECT_MAX})`) : ''}</b>
              <Button variant="outline" className="h-11" disabled={!sel.size} onClick={() => setBulkConfirm('off')}><Ban />{t('إيقاف', 'Off')}</Button>
              <Button variant="outline" className="h-11" disabled={!sel.size} onClick={() => setBulkConfirm('on')}><Play />{t('تشغيل', 'On')}</Button>
              <Button variant="destructive" className="h-11" disabled={!sel.size} onClick={() => setBulkConfirm('del')}><Trash2 />{t('حذف', 'Remove')}</Button>
            </div>
          )}
        </>
      )}

      <Dialog open={confirmClean} onOpenChange={setConfirmClean}>
        <DialogContent dir={ar ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t(`حذف ${finishedHs.length} كرت خلص رصيده؟`, `Remove ${finishedHs.length} used-up cards?`)}</DialogTitle>
            <DialogDescription>{t('تنحذف من الراوتر نهائياً. الراوتر يتأكد بنفسه أن كل كرت خلص فعلاً قبل حذفه، والكرت اللي فيه رصيد ما ينحذف.', 'They are removed from the router for good. The router checks each card is really used up first; a card with balance left is never removed.')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11" onClick={() => setConfirmClean(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button variant="destructive" className="h-11" disabled={sending} onClick={cleanAll}><Trash2 />{t('احذف', 'Remove')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent dir={ar ? 'rtl' : 'ltr'}>
          {confirm && (
            <>
              <DialogHeader>
                <DialogTitle>{confirm.action === 'renew' ? t(`تجديد ${confirm.card.name}؟`, `Renew ${confirm.card.name}?`) : confirm.action === 'off' ? t(`إيقاف ${confirm.card.name}؟`, `Turn off ${confirm.card.name}?`) : t(`حذف ${confirm.card.name}؟`, `Remove ${confirm.card.name}?`)}</DialogTitle>
                <DialogDescription>{confirm.action === 'renew' ? t('الزبون يبدأ من صفر بنفس الرقم: الوقت والبيانات ترجع كاملة، والصلاحية تبدأ من أول دخول جديد.', 'The customer starts from zero with the same number; validity restarts at the next login.') : confirm.action === 'off' ? t('ما يقدر أحد يدخل فيه حتى تشغله. لو أحد متصل، ينفصل.', 'Nobody can log in until you turn it on. Anyone connected is cut off.') : t('ينحذف من الراوتر نهائياً، ولو أحد متصل ينفصل. ما نقدر نرجعه.', 'Removed from the router for good; anyone connected is cut off. This cannot be undone.')}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11" onClick={() => setConfirm(null)}>{t('إلغاء', 'Cancel')}</Button>
                <Button variant={confirm.action === 'del' ? 'destructive' : 'default'} className="h-11" onClick={() => { const c = confirm; setConfirm(null); runAction(c.card, c.action); }}>
                  {confirm.action === 'renew' ? <><RotateCcw />{t('جدّد', 'Renew')}</> : confirm.action === 'off' ? <><Ban />{t('أوقف', 'Turn off')}</> : <><Trash2 />{t('احذف', 'Remove')}</>}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!bulkConfirm} onOpenChange={(o) => !o && setBulkConfirm(null)}>
        <DialogContent dir={ar ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{bulkConfirm === 'del' ? t(`حذف ${sel.size} كرت؟`, `Remove ${sel.size} cards?`) : bulkConfirm === 'off' ? t(`إيقاف ${sel.size} كرت؟`, `Turn off ${sel.size} cards?`) : t(`تشغيل ${sel.size} كرت؟`, `Turn on ${sel.size} cards?`)}</DialogTitle>
            <DialogDescription>{bulkConfirm === 'del' ? t('تنحذف من الراوتر نهائياً، واللي متصل ينفصل. ما نقدر نرجعها.', 'Removed for good; connected customers are cut off. This cannot be undone.') : bulkConfirm === 'off' ? t('ما يقدر أحد يدخل فيها حتى تشغلها، واللي متصل ينفصل.', 'Nobody can log in until turned on; connected customers are cut off.') : t('ترجع تشتغل عادي.', 'They work again as normal.')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11" onClick={() => setBulkConfirm(null)}>{t('إلغاء', 'Cancel')}</Button>
            <Button disabled={sending} variant={bulkConfirm === 'del' ? 'destructive' : 'default'} className="h-11" onClick={() => bulkConfirm && runBulk(bulkConfirm)}>{t('تأكيد', 'Confirm')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenKey(null)}>
        <DialogContent dir={ar ? 'rtl' : 'ltr'} className="max-h-[90dvh] overflow-y-auto bg-card">
          {open && <CardDetail card={open} pkg={profiles.find((p) => p.router_id === open.router_id && p.source === open.source && p.name === open.profile)} router={routers.find((r) => r.id === open.router_id)} routers={routers} live={live} ar={ar} onRenamed={(name) => setOpenKey(key({ ...open, name }))} />}
        </DialogContent>
      </Dialog>

      {form && <PackageForm open onClose={() => setForm(null)} source={source} routers={routers} edit={form.edit} cardCount={form.edit ? (packages.find((p) => p.p === form.edit)?.total ?? 0) : 0} ar={ar} />}
    </div>
  );
}

/** Numbered pages: previous / a few numbers around the current page / next. */
function Pager({ page, pages, onPage, ar }: { page: number; pages: number; onPage: (p: number) => void; ar: boolean }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const nums = [...new Set([0, page - 1, page, page + 1, pages - 1].filter((p) => p >= 0 && p < pages))].sort((a, b) => a - b);
  const Prev = ar ? ChevronRight : ChevronLeft; const Next = ar ? ChevronLeft : ChevronRight;
  return (
    <nav aria-label={t('الصفحات', 'Pages')} className="flex items-center justify-center gap-1">
      <Button variant="outline" size="icon" className="size-11" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label={t('السابق', 'Previous')}><Prev /></Button>
      {nums.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - (nums[i - 1] ?? p) > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Button variant={p === page ? 'default' : 'ghost'} className="size-11 p-0" aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}><span dir="ltr">{p + 1}</span></Button>
        </span>
      ))}
      <Button variant="outline" size="icon" className="size-11" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} aria-label={t('التالي', 'Next')}><Next /></Button>
    </nav>
  );
}

type UmState = ReturnType<typeof umStatus>;
/** User Manager tab with no cards yet: say what is really going on instead of "not enabled". */
function UmEmpty({ states, ar, v7 }: { states: { r: RouterRow; st: UmState }[]; ar: boolean; v7: boolean }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const names = (list: { r: RouterRow }[]) => list.map((s) => s.r.name).join(ar ? '، ' : ', ');
  const noReader = states.filter((s) => s.st === 'on_no_reader');
  const reading = states.filter((s) => s.st === 'on');
  const off = states.filter((s) => s.st === 'off');
  if (noReader.length) return (
    <div className="app-panel space-y-3 p-5">
      <p className="flex min-w-0 items-center gap-1 font-bold"><span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary"><Wifi className="size-3.5" /></span>{t(`User Manager شغال على ${names(noReader)}`, `User Manager is on at ${names(noReader)}`)}</p>
      <p className="text-sm text-muted-foreground">{t('بس ربط هذا الراوتر قديم وما يقرأ كروته. حدّثه مرة وحدة: «إعادة الربط» ثم الصق الأمر القصير، وتوصل الكروت والباقات خلال دقائق.', 'But this router was linked before we could read it. Update it once: tap Reconnect and paste the short command; cards and packages arrive within minutes.')}</p>
      <Button asChild className="h-11"><Link to="/routers"><Wrench />{t('افتح الراوترات', 'Open routers')}</Link></Button>
    </div>
  );
  if (reading.length) return <p className="app-panel p-5 text-sm">{t(`User Manager شغال على ${names(reading)}. ننتظر أول قائمة كروت (بعد اكتمال قراءة الكروت). لو ما فيه كروت أصلاً، تظهر هنا أول ما تضيفها.`, `User Manager is on at ${names(reading)}. Waiting for the first card list (after a completed card read). If it has no cards yet, they appear here once added.`)}</p>;
  if (off.length) return (
    <div className="space-y-3">
      <p className="app-panel p-4 text-sm">{t(`User Manager مثبت على ${names(off)} لكنه غير مفعّل. فعّله بالخطوات أدناه.`, `User Manager is installed on ${names(off)} but switched off. Turn it on with the steps below.`)}</p>
      <UserManagerSetup ar={ar} v7={v7} />
    </div>
  );
  return <UserManagerSetup ar={ar} v7={v7} />;
}
