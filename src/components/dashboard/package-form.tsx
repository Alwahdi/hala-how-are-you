import { useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Minus, Plus, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { requestPackage } from '@/lib/card-actions.functions';
import { checkPackage, humanData, PKG_NAME, sizeToBytes, type PkgInput, type PkgSource } from '@/lib/packages';
import { durationToSeconds } from '@/lib/duration';
import { formatDuration } from '@/lib/card-status';
import { humanValidity } from '@/lib/card-actions';
import { isOnline } from '@/lib/router-script';
import { jobPhase, useRouterJob } from '@/hooks/use-router-job';
import type { ProfileRow, RouterRow } from './types';

type Choice = { label: [string, string]; v: number };
const DATA: Choice[] = [{ label: ['100 ميجا', '100 MB'], v: 100 }, { label: ['500 ميجا', '500 MB'], v: 500 }, { label: ['1 جيجا', '1 GB'], v: 1024 }, { label: ['5 جيجا', '5 GB'], v: 5120 }, { label: ['بلا حد', 'No limit'], v: 0 }];
const TIME: Choice[] = [{ label: ['ساعة', '1 hour'], v: 3600 }, { label: ['5 ساعات', '5 hours'], v: 5 * 3600 }, { label: ['يوم', '1 day'], v: 86400 }, { label: ['بلا حد', 'No limit'], v: 0 }];
const VALID: Choice[] = [{ label: ['يوم', '1 day'], v: 86400 }, { label: ['أسبوع', '1 week'], v: 7 * 86400 }, { label: ['شهر', '30 days'], v: 30 * 86400 }, { label: ['بلا حد', 'No limit'], v: 0 }];
const SPEED: Choice[] = [{ label: ['1 ميجا', '1 Mbps'], v: 1000 }, { label: ['2 ميجا', '2 Mbps'], v: 2000 }, { label: ['4 ميجا', '4 Mbps'], v: 4000 }, { label: ['10 ميجا', '10 Mbps'], v: 10000 }, { label: ['بلا حد', 'No limit'], v: 0 }];

/** "2000000/8000000", "512k/2M" → kbps up and down. */
function rateKbps(rate: string | null | undefined): { up: number; down: number } {
  if (!rate) return { up: 0, down: 0 };
  const k = (v?: string) => { const m = /^(\d+(?:\.\d+)?)([kKmMgG]?)$/.exec(v ?? ''); if (!m) return 0; return Math.round(Number(m[1]) * ({ k: 1, m: 1000, g: 1e6 }[m[2]!.toLowerCase()] ?? 0.001)); };
  const [up, down] = rate.trim().split(/\s+/)[0]!.split('/');
  return { up: k(up), down: k(down ?? up) };
}

/** Starting values for the form from a package we read from the router. */
export function packageDraft(source: PkgSource, p?: ProfileRow): Omit<PkgInput, 'action'> {
  if (!p) return { source, name: '', price: undefined, devices: 1, downKbps: 2000, upKbps: 2000, validityS: source === 'hotspot' ? 86400 : 30 * 86400, uptimeS: 0, dataMB: source === 'usermanager' ? 1024 : 0 };
  const r = rateKbps(p.rate_limit);
  const x = p.extra ?? {};
  const bytes = sizeToBytes(x['transferLimit']);
  return {
    source, name: p.name, price: p.price ? Math.round(Number(p.price)) || undefined : undefined, sell: p.sell_price ? Math.round(Number(p.sell_price)) || undefined : undefined,
    devices: Number(p.shared_users) || (p.shared_users === 'unlimited' ? 0 : 1), downKbps: r.down, upKbps: r.up,
    validityS: durationToSeconds(p.validity), uptimeS: durationToSeconds(x['uptimeLimit']), dataMB: bytes ? Math.round(bytes / 1024 / 1024) : 0,
  };
}

const ERR: Record<string, [string, string]> = {
  bad_name: ['اسم الباقة: حروف إنجليزية وأرقام فقط، بدون مسافات (مثل day-500).', 'Package name: English letters and digits only, no spaces (like day-500).'],
  bad_number: ['في رقم غير منطقي. راجع القيم.', 'One of the numbers does not make sense.'],
  validity_short: ['الصلاحية أقصر من وقت الاستخدام: الكرت بيخلص وفيه وقت باقي. طوّل الصلاحية أو قصّر الوقت.', 'Validity is shorter than usage time: the card would end with time left. Lengthen validity or shorten time.'],
  offline: ['الراوتر غير متصل الآن.', 'The router is offline.'],
  exists: ['فيه باقة بنفس الاسم.', 'A package with this name exists.'],
  missing: ['ما لقينا الباقة. يمكن انحذفت.', 'Package not found. It may have been removed.'],
  in_use: ['ما نقدر نحذفها: عليها كروت.', 'Cannot remove: it still has cards.'],
  busy: ['فيه تعديل باقة قيد التنفيذ. انتظر يخلص.', 'Another package change is running. Wait for it.'],
  no_um: ['User Manager غير مثبت على هذا الراوتر.', 'User Manager is not installed on this router.'],
};

/** Add or edit one package with ready-made choices and a one-line preview, so a beginner cannot get it wrong. */
export function PackageForm({ open, onClose, source, routers, edit, cardCount, ar }: { open: boolean; onClose: () => void; source: PkgSource; routers: RouterRow[]; edit?: ProfileRow | undefined; cardCount: number; ar: boolean }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const send = useServerFn(requestPackage);
  const qc = useQueryClient();
  const um = source === 'usermanager';
  const eligible = routers.filter((r) => !um || (r.last_status as { umi?: string } | null)?.umi?.startsWith('pkg'));
  const [routerId, setRouterId] = useState<string>(edit?.router_id ?? eligible.find((r) => isOnline(r.last_seen_at))?.id ?? eligible[0]?.id ?? '');
  const [d, setD] = useState(() => packageDraft(source, edit));
  const [custom, setCustom] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [job, setJob] = useState<{ id: string; action: 'add' | 'edit' | 'del' } | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const { data: jr, isError: jobReadError, refetch: retryJobRead } = useRouterJob(job?.id, () => { qc.invalidateQueries({ queryKey: ['profiles-pkg'] }); });
  const set = (k: keyof typeof d, v: number | string | undefined) => setD((x) => ({ ...x, [k]: v }));
  const action = edit ? 'edit' : 'add';
  const problem = checkPackage({ ...d, action });
  const router = routers.find((r) => r.id === routerId);
  const online = isOnline(router?.last_seen_at ?? null);

  const preview = useMemo(() => {
    const parts = [
      um ? (d.dataMB ? humanData(d.dataMB * 1024 * 1024, ar) : t('بيانات بلا حد', 'unlimited data')) : null,
      um && d.uptimeS ? t(`${formatDuration(d.uptimeS, true)} استخدام`, `${formatDuration(d.uptimeS, false)} of use`) : null,
      d.validityS ? t(`يشتغل ${humanValidity(`${d.validityS}s`, true)} من أول دخول`, `works ${humanValidity(`${d.validityS}s`, false)} from first login`) : t('بدون صلاحية بالأيام', 'no day limit'),
      d.downKbps ? t(`سرعة ${+(d.downKbps / 1000).toFixed(1)} ميجا`, `${+(d.downKbps / 1000).toFixed(1)} Mbps`) : t('سرعة بلا حد', 'unlimited speed'),
      d.devices ? (d.devices === 1 ? t('جهاز واحد', '1 device') : t(`${d.devices} أجهزة`, `${d.devices} devices`)) : t('أجهزة بلا حد', 'unlimited devices'),
    ].filter(Boolean);
    return `${t('كرت', 'A card')}${d.price ? t(` بـ ${d.price}`, ` for ${d.price}`) : ''}: ${parts.join(t('، ', ', '))}.`;
  }, [d, ar, um]);

  async function submit(act: 'add' | 'edit' | 'del') {
    setErr(null); setBusy(true);
    const res = await send({ data: { routerId, ...d, action: act } }).catch(() => ({ ok: false as const, error: 'error' as const }));
    setBusy(false);
    if (!res.ok) { setErr((ERR[res.error] ?? ['ما قدرنا نرسل. جرّب مرة ثانية.', "We couldn't send it. Try again."])[ar ? 0 : 1]); return; }
    setJob({ id: res.id, action: act }); setConfirmDel(false);
  }

  const phase = job ? jobPhase(jr, ar) : null;
  const doneText = job?.action === 'del' ? t('انحذفت الباقة من الراوتر.', 'Package removed from the router.') : jr?.result === 'partial' ? t('تغيرت السرعة والأجهزة. السعر والصلاحية ما تغيروا لأن الباقة فيها سكربت دخول خاص؛ عدّلها من Winbox.', 'Speed and devices changed. Price and validity did not: this package has its own login script; change it in Winbox.') : job?.action === 'add' ? t('انضافت الباقة على الراوتر. تقدر تبيع كروتها الآن.', 'Package added on the router.') : t('تعدلت الباقة على الراوتر.', 'Package updated on the router.');

  const chips = (key: 'dataMB' | 'uptimeS' | 'validityS' | 'downKbps', list: Choice[], unit: { label: [string, string]; mul: number }) => {
    const val = (d[key] as number | undefined) ?? 0;
    const isCustom = custom[key] || !list.some((c) => c.v === val);
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {list.map((c) => <button key={c.v} type="button" className="chip" aria-pressed={!isCustom && val === c.v} onClick={() => { setCustom((x) => ({ ...x, [key]: false })); set(key, c.v); if (key === 'downKbps') set('upKbps', c.v); }}>{t(...c.label)}</button>)}
          <button type="button" className="chip" aria-pressed={isCustom} onClick={() => setCustom((x) => ({ ...x, [key]: true }))}>{t('مخصص', 'Custom')}</button>
        </div>
        {isCustom && (
          <div className="flex items-center gap-2">
            <Input type="number" inputMode="numeric" min={0} dir="ltr" className="h-11 w-32" value={val ? +(val / unit.mul).toFixed(2) : ''} onChange={(e) => { const n = Math.round(Number(e.target.value) * unit.mul); set(key, Number.isFinite(n) ? n : 0); if (key === 'downKbps' && !custom['up']) set('upKbps', Number.isFinite(n) ? n : 0); }} />
            <span className="text-sm text-muted-foreground">{t(...unit.label)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir={ar ? 'rtl' : 'ltr'} className="max-h-[92dvh] bg-card overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{edit ? t(`تعديل الباقة ${edit.name}`, `Edit package ${edit.name}`) : t(`باقة ${um ? 'User Manager' : 'Hotspot'} جديدة`, `New ${um ? 'User Manager' : 'Hotspot'} package`)}</DialogTitle>
          <DialogDescription>{t('اختر من الجاهز أو «مخصص». نرسلها للراوتر ونأكد لك النتيجة.', 'Pick a ready choice or Custom. We send it to the router and confirm the result.')}</DialogDescription>
        </DialogHeader>

        {edit&&<p className="text-sm text-warning">{t('قد تؤثر تغييرات الباقة على الكروت المرتبطة بها؛ الورق المطبوع لا يتغير.','Package changes may affect linked cards; previously printed cards do not change.')}</p>}
        <p className="text-sm font-semibold">{t('الراوتر', 'Router')}: {router?.name ?? t('غير محدد', 'Not selected')}</p>
        {jobReadError && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{t('تعذر قراءة نتيجة الأمر. لا نعرف هل اكتمل؛ لا تعِد إرساله قبل التحقق.', 'Could not read the outcome. Completion is unknown; check before resending.')}</p><Button variant="outline" onClick={() => { retryJobRead(); }}>{t('إعادة قراءة النتيجة', 'Retry outcome')}</Button></div>}
        {phase ? (
          <div className="space-y-3">
            <div role="status" className={`flex items-start gap-2 rounded-xl p-3 text-sm ${phase.tone === 'ok' ? 'bg-primary/10' : phase.tone === 'bad' ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
              {phase.tone === 'wait' ? <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" /> : phase.tone === 'ok' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
              <span>{phase.tone === 'ok' ? doneText : phase.text}</span>
            </div>
            <div className="dialog-actions grid grid-cols-2 gap-2">
              {phase.tone === 'bad' && <Button variant="outline" className="h-11" onClick={() => setJob(null)}>{t('رجوع للنموذج', 'Back to form')}</Button>}
              <Button className={`h-11 ${phase.tone === 'bad' ? '' : 'col-span-2'}`} onClick={onClose}>{t('تم', 'Done')}</Button>
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (!problem) submit(action); }}>
            {eligible.length > 1 && !edit && (
              <label className="block space-y-1 text-sm font-semibold">{t('على أي راوتر؟', 'Which router?')}
                <select value={routerId} onChange={(e) => setRouterId(e.target.value)} className="h-11 w-full rounded-md border bg-background px-3 font-normal">
                  {eligible.map((r) => <option key={r.id} value={r.id}>{r.name}{isOnline(r.last_seen_at) ? '' : t(' (غير متصل)', ' (offline)')}</option>)}
                </select>
              </label>
            )}
            {!edit && (
              <label className="block space-y-1 text-sm font-semibold">{t('اسم الباقة', 'Package name')}
                <Input value={d.name} onChange={(e) => set('name', e.target.value.trim())} dir="ltr" className="h-11 font-mono" maxLength={24} placeholder="day-500" aria-invalid={!!d.name && !PKG_NAME.test(d.name)} />
                <span className={`block text-xs font-normal ${d.name && !PKG_NAME.test(d.name) ? 'text-destructive' : 'text-muted-foreground'}`}>{t('حروف إنجليزية وأرقام و - فقط. يشوفه الراوتر، مش الزبون.', 'English letters, digits and - only. The router sees it, not the customer.')}</span>
              </label>
            )}
            <label className="block space-y-1 text-sm font-semibold">{t('السعر', 'Price')}
              <Input type="number" inputMode="numeric" min={0} value={d.price ?? ''} onChange={(e) => set('price', e.target.value === '' ? undefined : Math.round(Number(e.target.value)))} dir="ltr" className="h-11 w-40" />
              <span className="block text-xs font-normal text-muted-foreground">{t('يظهر لك في التطبيق وفي Mikhmon. بدون عملة.', 'Shown in the app and in Mikhmon. No currency.')}</span>
            </label>
            {um && <fieldset className="space-y-2"><legend className="text-sm font-semibold">{t('البيانات (تنزيل + رفع)', 'Data (down + up)')}</legend>{chips('dataMB', DATA, { label: ['ميجا', 'MB'], mul: 1 })}</fieldset>}
            {um && <fieldset className="space-y-2"><legend className="text-sm font-semibold">{t('وقت الاستخدام', 'Usage time')}</legend><p className="text-xs text-muted-foreground">{t('يُحسب بس وقت ما الزبون متصل.', 'Counts only while connected.')}</p>{chips('uptimeS', TIME, { label: ['ساعة', 'hours'], mul: 3600 })}</fieldset>}
            <fieldset className="space-y-2"><legend className="text-sm font-semibold">{t('الصلاحية', 'Validity')}</legend><p className="text-xs text-muted-foreground">{t('أيام تبدأ من أول دخول، وبعدها يتوقف الكرت حتى لو فيه باقي.', 'Days from first login; then the card stops even with balance left.')}</p>{chips('validityS', VALID, { label: ['يوم', 'days'], mul: 86400 })}</fieldset>
            <fieldset className="space-y-2"><legend className="text-sm font-semibold">{t('السرعة', 'Speed')}</legend>{chips('downKbps', SPEED, { label: ['ميجا (تنزيل ورفع)', 'Mbps (down and up)'], mul: 1000 })}</fieldset>
            <fieldset className="space-y-2"><legend className="text-sm font-semibold">{t('عدد الأجهزة لكل كرت', 'Devices per card')}</legend>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="icon" className="size-11" aria-label={t('أقل', 'Fewer')} disabled={(d.devices ?? 1) <= 1} onClick={() => set('devices', Math.max(1, (d.devices ?? 1) - 1))}><Minus /></Button>
                <b className="w-8 text-center text-lg" dir="ltr">{d.devices || '∞'}</b>
                <Button type="button" variant="outline" size="icon" className="size-11" aria-label={t('أكثر', 'More')} disabled={(d.devices ?? 1) >= 50} onClick={() => set('devices', (d.devices || 0) + 1)}><Plus /></Button>
              </div>
            </fieldset>
            {!um && <p className="rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">{t('في Hotspot الوقت والبيانات تنحفظ على كل كرت وقت إنشائه، مش في الباقة. الصلاحية والسعر نكتبهم بطريقة Mikhmon، فتشتغل مع Mikhmon لو تستخدمه.', 'In Hotspot, time and data live on each card when it is made, not on the package. Validity and price are written the Mikhmon way, so Mikhmon keeps working.')}</p>}

            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm"><p className="text-xs text-muted-foreground">{t('هكذا يفهمها الزبون', 'What the customer gets')}</p><p className="mt-1 font-semibold">{preview}</p></div>
            {problem && problem !== 'bad_name' && <p role="alert" className="text-sm text-destructive">{(ERR[problem]?.[ar ? 0 : 1] ?? t('راجع القيم وأعد المحاولة.', 'Check the values and retry.'))}</p>}
            {!online && <p className="text-sm text-muted-foreground">{t('الراوتر غير متصل الآن؛ انتظر عودته ثم أرسل. اختياراتك باقية ما دامت النافذة مفتوحة.', 'The router is offline. Wait for it to return, then send. Your choices stay while this window is open.')}</p>}
            {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
            <div className="dialog-actions grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={onClose}>{t('إلغاء', 'Cancel')}</Button>
              <Button type="submit" className="h-11" disabled={busy || !!problem || !online || !routerId}>{busy ? <Loader2 className="animate-spin" /> : null}{edit ? t('احفظ على الراوتر', 'Save to router') : t('أضف للراوتر', 'Add to router')}</Button>
            </div>
            {edit && (confirmDel ? (
              <div className="space-y-2 rounded-xl border border-destructive/40 p-3">
                <p className="text-sm">{t(`حذف الباقة ${edit.name} من الراوتر؟ ما نقدر نرجعها.`, `Remove package ${edit.name} from the router? This cannot be undone.`)}</p>
                <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" className="h-11" onClick={() => setConfirmDel(false)}>{t('إلغاء', 'Cancel')}</Button><Button type="button" variant="destructive" className="h-11" disabled={busy} onClick={() => submit('del')}><Trash2 />{t('احذف', 'Remove')}</Button></div>
              </div>
            ) : (
              <Button type="button" variant="ghost" className="h-11 w-full text-destructive hover:text-destructive" disabled={cardCount > 0 || !online} onClick={() => setConfirmDel(true)}><Trash2 />{cardCount > 0 ? t(`ما تنحذف: عليها ${cardCount} كرت`, `Cannot remove: ${cardCount} cards use it`) : t('حذف الباقة', 'Remove package')}</Button>
            ))}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
