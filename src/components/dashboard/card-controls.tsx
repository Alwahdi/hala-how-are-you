import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, Copy, KeyRound, Loader2, MessageCircle, PencilLine, Play, RotateCcw, Trash2, Unplug, XCircle } from 'lucide-react';
import { cardState } from '@/lib/card-status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { requestCardAction } from '@/lib/card-actions.functions';
import { SAFE_VALUE, suggestPassword, type CardAction } from '@/lib/card-actions';
import { isOnline } from '@/lib/router-script';
import type { CardRow } from '@/lib/card-status';
import type { RouterRow } from './types';

type Job = { status: string; result: string | null; requested_at: string; sent_at: string | null };

/** Fixed actions on one card. Each one is queued for the router's own script and followed until the router replies. */
export function CardControls({ card, router, live, ar, onRenamed }: { card: CardRow; router: RouterRow | undefined; live: boolean; ar: boolean; onRenamed: (name: string) => void }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const send = useServerFn(requestCardAction);
  const qc = useQueryClient();
  const [form, setForm] = useState<null | 'pw' | 'name' | 'del' | 'renew'>(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [run, setRun] = useState<{ id: string; action: CardAction; value?: string } | null>(null);
  const [newPw, setNewPw] = useState<string | null>(null);

  const { data: job, isError: jobError, refetch: retryOutcome } = useQuery({
    queryKey: ['card-job', run?.id],
    enabled: !!run,
    queryFn: async () => {
      if (!run) return null;
      const { data, error } = await supabase.from('router_jobs').select('status, result, requested_at, sent_at').eq('id', run.id).maybeSingle();
      if (error) throw error;
      const j = data as Job | null;
      if (j && (j.status === 'done' || j.status === 'failed')) {
        if (j.status === 'done' && run.action === 'name' && run.value) onRenamed(run.value);
        qc.invalidateQueries({ queryKey: ['cards'] });
        qc.invalidateQueries({ queryKey: ['sessions'] });
      }
      return j;
    },
    refetchInterval: (q) => { const s = (q.state.data as Job | null | undefined)?.status; return s === 'done' || s === 'failed' || s === 'expired' ? false : 3000; },
  });

  const online = isOnline(router?.last_seen_at ?? null);
  // Routers linked before card control send no "umi" in their report: their script cannot run these actions yet.
  const ready = (router?.last_status as { umi?: string } | null)?.umi !== undefined;
  const nameOk = SAFE_VALUE.test(card.name);
  const disabledCard = card.disabled;
  const working = !!run && (!job || job.status === 'pending' || job.status === 'sent');

  async function go(action: CardAction, v?: string) {
    setErr(null); setBusy(true);
    const res = await send({ data: { routerId: card.router_id, source: card.source as 'hotspot' | 'usermanager', name: card.name, action, ...(v ? { value: v } : {}) } }).catch(() => ({ ok: false as const, error: 'error' as const }));
    setBusy(false);
    if (!res.ok) { setErr(REQUEST_ERR[res.error]?.[ar ? 0 : 1] ?? t('ما قدرنا نرسل الأمر. جرّب مرة ثانية.', "We couldn't send it. Try again.")); return; }
    if (action === 'pw' && v) setNewPw(v);
    setRun({ id: res.id, action, ...(v ? { value: v } : {}) });
    setForm(null); setValue('');
  }

  if (!nameOk) return <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{t('اسم هذا الكرت فيه رموز ما نقدر نرسلها للراوتر بأمان، فالتحكم فيه من Winbox فقط.', 'This card name has characters we cannot send to the router safely; manage it from Winbox.')}</p>;
  if (!ready) return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
      <p>{t('عشان تتحكم بالكروت من هنا، حدّث ربط هذا الراوتر مرة وحدة: «إعادة الربط» ثم الصق الأمر القصير.', 'To control cards from here, update this router once: tap Reconnect and paste the short command.')}</p>
      <Button asChild variant="outline" className="mt-2 h-11"><Link to="/dashboard" search={{ tab: 'more' }}>{t('افتح الراوترات', 'Open routers')}</Link></Button>
    </div>
  );

  const status = run && job ? jobMessage(job, run.action, ar) : run ? { tone: 'wait' as const, text: t('نرسل الأمر...', 'Sending...') } : null;

  return (
    <section aria-label={t('تحكم بالكرت', 'Card control')} className="space-y-3">
      {jobError && <div role="alert" className="text-sm text-destructive"><p>{t('تعذر قراءة نتيجة الأمر؛ لا نؤكد اكتماله.', 'Could not read the outcome; completion is unconfirmed.')}</p><Button variant="outline" onClick={() => { retryOutcome(); }}>{t('إعادة قراءة النتيجة', 'Retry outcome')}</Button></div>}
      <h3 className="text-sm font-bold">{t('تحكم بالكرت', 'Card control')}</h3>
      {!online && <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{t('الراوتر غير متصل الآن. الأوامر تشتغل لما يرجع.', 'The router is offline now. Actions work once it is back.')}</p>}

      {status && (
        <div role="status" className={`flex items-start gap-2 rounded-xl p-3 text-sm ${status.tone === 'ok' ? 'bg-primary/10' : status.tone === 'bad' ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
          {status.tone === 'wait' ? <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" /> : status.tone === 'ok' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
          <span className="flex-1">{status.text}</span>
        </div>
      )}
      {newPw && job?.status === 'done' && run?.action === 'pw' && (
        <div className="stat-tile">
          <p className="text-xs text-muted-foreground">{t('كلمة السر الجديدة (ما نحفظها عندنا، انسخها الآن)', "New password (we don't keep it, copy it now)")}</p>
          <p className="mt-1 font-mono text-xl font-bold" dir="ltr">{newPw}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11" onClick={() => navigator.clipboard.writeText(newPw)}><Copy />{t('نسخ', 'Copy')}</Button>
            <Button className="h-11" asChild><a href={`https://wa.me/?text=${encodeURIComponent(t(`كرت الإنترنت: ${card.name}\nكلمة السر: ${newPw}`, `Internet card: ${card.name}\nPassword: ${newPw}`))}`} target="_blank" rel="noreferrer"><MessageCircle />{t('أرسل للزبون', 'Send')}</a></Button>
          </div>
        </div>
      )}

      {form === 'pw' || form === 'name' ? (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (SAFE_VALUE.test(value)) go(form, value); }}>
          <label className="block text-sm font-semibold" htmlFor="card-value">{form === 'pw' ? t('كلمة السر الجديدة', 'New password') : t('الاسم الجديد للكرت', 'New card name')}</label>
          <div className="flex gap-2">
            <Input id="card-value" value={value} onChange={(e) => setValue(e.target.value.trim())} dir="ltr" className="h-11 font-mono" autoComplete="off" maxLength={32} autoFocus aria-invalid={!!value && !SAFE_VALUE.test(value)} />
            {form === 'pw' && <Button type="button" variant="outline" className="h-11 shrink-0" onClick={() => setValue(suggestPassword())}>{t('اقترح', 'Suggest')}</Button>}
          </div>
          <p className={`text-xs ${value && !SAFE_VALUE.test(value) ? 'text-destructive' : 'text-muted-foreground'}`}>{t('حروف إنجليزية وأرقام فقط، حتى 32، بدون مسافات. مسموح . _ @ -', 'English letters and digits only, up to 32, no spaces. Allowed: . _ @ -')}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => { setForm(null); setValue(''); }}>{t('إلغاء', 'Cancel')}</Button>
            <Button type="submit" className="h-11" disabled={busy || !SAFE_VALUE.test(value) || (form === 'name' && value === card.name)}>{busy ? <Loader2 className="animate-spin" /> : null}{t('أرسل للراوتر', 'Send to router')}</Button>
          </div>
        </form>
      ) : form === 'renew' ? (
        <div className="space-y-2 rounded-xl border border-primary/40 p-3">
          <p className="text-sm">{t(`تجديد ${card.name}؟ الزبون يبدأ من صفر بنفس الرقم: الوقت والبيانات ترجع كاملة، والصلاحية تبدأ من أول دخول جديد.`, `Renew ${card.name}? The customer starts from zero with the same number: time and data are full again, and validity restarts at the next login.`)}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11" onClick={() => setForm(null)}>{t('إلغاء', 'Cancel')}</Button>
            <Button className="h-11" disabled={busy} onClick={() => go('renew')}><RotateCcw />{t('جدّد', 'Renew')}</Button>
          </div>
        </div>
      ) : form === 'del' ? (
        <div className="space-y-2 rounded-xl border border-destructive/40 p-3">
          <p className="text-sm">{t(`حذف الكرت ${card.name} من الراوتر نهائياً؟ لو الزبون متصل، ينفصل. ما نقدر نرجعه بعد الحذف.`, `Remove card ${card.name} from the router for good? A connected customer is cut off. This cannot be undone.`)}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11" onClick={() => setForm(null)}>{t('إلغاء', 'Cancel')}</Button>
            <Button variant="destructive" className="h-11" disabled={busy} onClick={() => go('del')}><Trash2 />{t('احذف', 'Remove')}</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {cardState(card) !== 'unused' && <Button className="col-span-2 h-11" disabled={working || busy || !online} onClick={() => setForm('renew')}><RotateCcw />{t('تجديد الكرت', 'Renew card')}</Button>}
          <Button variant="outline" className="h-11 justify-start" disabled={working || busy || !online} onClick={() => { setForm('pw'); setValue(suggestPassword()); }}><KeyRound />{t('كلمة السر', 'Password')}</Button>
          <Button variant="outline" className="h-11 justify-start" disabled={working || busy || !online} onClick={() => { setForm('name'); setValue(card.name); }}><PencilLine />{t('تغيير الاسم', 'Rename')}</Button>
          {disabledCard
            ? <Button variant="outline" className="h-11 justify-start" disabled={working || busy || !online} onClick={() => go('on')}><Play />{t('تشغيل الكرت', 'Turn on')}</Button>
            : <Button variant="outline" className="h-11 justify-start" disabled={working || busy || !online} onClick={() => go('off')}><Ban />{t('إيقاف الكرت', 'Turn off')}</Button>}
          <Button variant="outline" className="h-11 justify-start" disabled={working || busy || !online || !live} onClick={() => go('kick')} title={live ? undefined : t('الكرت غير متصل الآن', 'Not online now')}><Unplug />{t('افصله الآن', 'Disconnect')}</Button>
          <Button variant="ghost" className="col-span-2 h-11 text-destructive hover:text-destructive" disabled={working || busy || !online} onClick={() => setForm('del')}><Trash2 />{t('حذف الكرت', 'Remove card')}</Button>
        </div>
      )}
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
    </section>
  );
}

const REQUEST_ERR: Record<string, [string, string]> = {
  offline: ['الراوتر غير متصل الآن، فما نقدر نرسل الأمر.', 'The router is offline, so we cannot send this.'],
  busy: ['فيه أمر على هذا الكرت قيد التنفيذ. انتظر يخلص.', 'An action on this card is still running. Wait for it to finish.'],
  bad_value: ['استخدم حروف إنجليزية وأرقام فقط، حتى 32، بدون مسافات.', 'Use English letters and digits only, up to 32, no spaces.'],
  bad_name: ['اسم هذا الكرت فيه رموز ما نقدر نرسلها للراوتر.', 'This card name has characters we cannot send.'],
  same_name: ['الاسم الجديد نفس القديم.', 'The new name is the same as the old one.'],
  exists: ['فيه كرت ثاني بنفس هذا الاسم.', 'Another card already has this name.'],
  missing: ['ما لقينا الكرت. يمكن انحذف من الراوتر.', "We couldn't find this card. It may have been removed on the router."],
  no_router: ['ما لقينا الراوتر.', "We couldn't find the router."],
  no_package: ['ما نعرف باقة هذا الكرت، فما نقدر نجدده. جدده من Winbox أو انتظر قراءة الكروت القادمة.', "We don't know this card's package, so we can't renew it."],
};

const DONE: Record<CardAction, [string, string]> = {
  pw: ['تغيرت كلمة السر على الراوتر.', 'Password changed on the router.'],
  name: ['تغيّر اسم الكرت على الراوتر.', 'Card renamed on the router.'],
  off: ['توقف الكرت. لو كان أحد متصل فيه، انفصل.', 'Card turned off. Anyone using it was disconnected.'],
  on: ['رجع الكرت يشتغل.', 'Card is on again.'],
  kick: ['انفصل الزبون. يقدر يدخل من جديد بنفس الكرت.', 'Customer disconnected. They can log in again with the same card.'],
  del: ['انحذف الكرت من الراوتر.', 'Card removed from the router.'],
  renew: ['تجدد الكرت. يقدر الزبون يستخدمه من جديد.', 'Card renewed. The customer can use it again.'],
};

function jobMessage(j: Job, action: CardAction, ar: boolean): { tone: 'wait' | 'ok' | 'bad'; text: string } {
  const t = (a: string, b: string) => (ar ? a : b);
  if (j.status === 'done') return { tone: 'ok', text: t(...DONE[action]) };
  if (j.status === 'expired') return { tone: 'bad', text: t('الراوتر ما استلم الأمر خلال 5 دقائق، فألغيناه. تأكد إنه متصل وجرّب.', "The router didn't pick it up within 5 minutes, so we cancelled it. Check it is online and try again.") };
  if (j.status === 'failed') {
    if (j.result === 'missing') return { tone: 'bad', text: t('الكرت ما عاد موجود على الراوتر.', 'The card is no longer on the router.') };
    if (j.result === 'exists') return { tone: 'bad', text: t('الاسم الجديد مستخدم لكرت ثاني على الراوتر.', 'Another card on the router already has that name.') };
    return { tone: 'bad', text: t('الراوتر رفض الأمر. جرّب مرة ثانية.', 'The router refused it. Try again.') };
  }
  const since = (iso: string | null) => (iso ? Date.now() - new Date(iso).getTime() : 0);
  if (j.status === 'sent' && since(j.sent_at) > 90_000) return { tone: 'bad', text: t('أرسلنا الأمر والراوتر ما رد. افتح الكرت بعد دقيقة وتأكد من حالته.', 'We sent it but the router did not reply. Check the card again in a minute.') };
  if (j.status === 'sent') return { tone: 'wait', text: t('الراوتر استلم الأمر وينفذه...', 'The router got it and is running it...') };
  return { tone: 'wait', text: t('ننتظر الراوتر يستلم الأمر (عادة أقل من 30 ثانية)...', 'Waiting for the router to pick it up (usually under 30 seconds)...') };
}
