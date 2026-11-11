import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Check, Loader2, Stethoscope, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { enablePush } from '@/lib/push-client';
import { checkPushSubscription, getPushKey, savePushSubscription, sendTestAlert } from '@/lib/alerts.functions';

type Step = { id: string; label: string; ok: boolean | null; fix?: string };

/** Step-by-step check that alerts can reach and show on this phone, with a one-tap repair. */
export function PhoneCheck({ ar }: { ar: boolean }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const check = useServerFn(checkPushSubscription); const test = useServerFn(sendTestAlert);
  const keyFn = useServerFn(getPushKey); const save = useServerFn(savePushSubscription);
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState(false);
  const [sawLocal, setSawLocal] = useState<boolean | null>(null);

  const put = (s: Step) => setSteps((all) => [...all.filter((x) => x.id !== s.id), s]);

  async function run() {
    setBusy(true); setSteps([]); setSawLocal(null);
    try {
      const perm = 'Notification' in window ? Notification.permission : 'denied';
      put({ id: 'perm', label: t('الإذن بالتنبيهات لهذا الموقع', 'Notification permission for this site'), ok: perm === 'granted', fix: t('اضغط القفل جنب العنوان ← الأذونات ← الإشعارات ← سماح.', 'Tap the lock by the address → Permissions → Notifications → Allow.') });
      if (perm !== 'granted') return;
      let reg = await navigator.serviceWorker.getRegistration('/');
      await reg?.update().catch(() => {});
      reg = await navigator.serviceWorker.getRegistration('/');
      const workerOk = !!reg?.active?.scriptURL.endsWith('/push-sw.js');
      put({ id: 'sw', label: t('خدمة التنبيهات مثبّتة في المتصفح', 'Alert service installed in the browser'), ok: workerOk, fix: t('اضغط «أصلح» تحت.', 'Tap "Repair" below.') });
      const sub = await reg?.pushManager.getSubscription();
      const known = sub ? (await check({ data: { endpoint: sub.endpoint } }).catch(() => ({ known: false }))).known : false;
      put({ id: 'sub', label: t('هذا الجوال مسجّل عندنا', 'This phone is registered with us'), ok: known, fix: t('اضغط «أصلح» تحت.', 'Tap "Repair" below.') });
      if (!workerOk || !known || !reg) return;
      // Local notification: proves the phone can display alerts at all (no internet involved).
      let localOk = true;
      await reg.showNotification(t('Mikro — تجربة من الجوال نفسه', 'Mikro — on-phone test'), { body: t('لو شفت هذا، الجوال يعرض تنبيهات Mikro.', 'If you see this, the phone shows Mikro alerts.'), tag: 'local-test', icon: '/icon-192.png' }).catch(() => { localOk = false; });
      put({ id: 'local', label: t('الجوال يقدر يعرض تنبيه', 'The phone can display an alert'), ok: localOk, fix: t('إعدادات الجوال ← التطبيقات ← Chrome ← الإشعارات ← فعّل «المواقع».', 'Phone settings → Apps → Chrome → Notifications → turn on "Sites".') });
      // Real push through Google and back: wait for the worker to report it arrived.
      put({ id: 'push', label: t('تنبيه من السيرفر يوصل الجوال', 'An alert from our server reaches the phone'), ok: null });
      const arrived = new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), 25_000);
        const onMsg = (e: MessageEvent) => { if (e.data?.type === 'mikro-push') { clearTimeout(timer); navigator.serviceWorker.removeEventListener('message', onMsg); resolve(true); } };
        navigator.serviceWorker.addEventListener('message', onMsg);
      });
      await test({ data: { ar } }).catch(() => null);
      put({ id: 'push', label: t('تنبيه من السيرفر يوصل الجوال', 'An alert from our server reaches the phone'), ok: await arrived, fix: t('الإنترنت أو خدمات Google Play في الجوال تمنع الوصول. جرّب «أصلح»، وتأكد أن خدمات Google Play محدّثة.', 'Internet or Google Play services are blocking delivery. Try "Repair" and make sure Google Play services is up to date.') });
    } finally { setBusy(false); }
  }

  async function repair() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      await (await reg?.pushManager.getSubscription())?.unsubscribe().catch(() => {});
      await reg?.unregister().catch(() => {});
      const { key } = await keyFn().catch(() => ({ key: null }));
      await enablePush(key, (s) => save({ data: s }));
    } finally { setBusy(false); }
    await run();
  }

  const order = ['perm', 'sw', 'sub', 'local', 'push'];
  const sorted = [...steps].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const failed = sorted.some((s) => s.ok === false);
  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <Button variant="outline" className="h-11 w-full" disabled={busy} onClick={run}>{busy ? <Loader2 className="animate-spin" /> : <Stethoscope />}{t('افحص التنبيهات على هذا الجوال', 'Check alerts on this phone')}</Button>
      {sorted.length > 0 && (
        <ol className="space-y-2" aria-live="polite">
          {sorted.map((s) => (
            <li key={s.id} className="rounded-xl bg-muted p-3 text-sm">
              <span className="flex items-center gap-2">
                {s.ok === null ? <Loader2 className="size-4 shrink-0 animate-spin text-primary" /> : s.ok ? <Check className="size-4 shrink-0 text-primary" /> : <X className="size-4 shrink-0 text-destructive" />}
                <span className="flex-1">{s.label}</span>
              </span>
              {s.ok === false && s.fix && <span className="mt-1 block ps-6 text-muted-foreground">{s.fix}</span>}
            </li>
          ))}
        </ol>
      )}
      {sorted.some((s) => s.id === 'local' && s.ok) && sawLocal === null && (
        <div className="rounded-xl border border-border p-3 text-sm">
          <p className="mb-2">{t('ظهر لك تنبيه «تجربة من الجوال نفسه» فوق الشاشة؟', 'Did an "on-phone test" alert appear at the top of the screen?')}</p>
          <div className="grid grid-cols-2 gap-2"><Button className="h-11" onClick={() => setSawLocal(true)}>{t('نعم ظهر', 'Yes')}</Button><Button variant="outline" className="h-11" onClick={() => setSawLocal(false)}>{t('لا', 'No')}</Button></div>
        </div>
      )}
      {sawLocal === false && <p className="rounded-xl bg-destructive/10 p-3 text-sm">{t('الجوال نفسه يخفي تنبيهات Chrome. افتح: الإعدادات ← التطبيقات ← Chrome ← الإشعارات، وفعّل كل الأقسام (خصوصاً «المواقع»). ووقف «عدم الإزعاج».', 'The phone hides Chrome alerts. Open Settings → Apps → Chrome → Notifications and turn on every category (especially "Sites"). Turn off Do Not Disturb.')}</p>}
      {sawLocal === true && !failed && <p className="rounded-xl bg-primary/10 p-3 text-sm">{t('كل شيء سليم. لو ما توصل والمتصفح مقفول: الإعدادات ← التطبيقات ← Chrome ← البطارية ← «غير مقيّد».', 'All good. If alerts miss while Chrome is closed: Settings → Apps → Chrome → Battery → "Unrestricted".')}</p>}
      {failed && <Button className="h-11 w-full" disabled={busy} onClick={repair}><RefreshCw />{t('أصلح التنبيهات على هذا الجوال', 'Repair alerts on this phone')}</Button>}
    </div>
  );
}
