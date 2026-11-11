import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Bell, BellRing, Check, ExternalLink, Loader2, Share, SquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { enablePush, pushState, type PushStatus } from '@/lib/push-client';
import { PhoneCheck } from './phone-check';
import { getPushKey, savePushSubscription, sendTestAlert } from '@/lib/alerts.functions';

/** Turns phone alerts on, with clear help for iPhone (home screen), the editor preview and blocked permission. */
export function EnableAlerts({ ar, compact = false }: { ar: boolean; compact?: boolean }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const keyFn = useServerFn(getPushKey); const save = useServerFn(savePushSubscription); const test = useServerFn(sendTestAlert);
  const [state, setState] = useState<Awaited<ReturnType<typeof pushState>> | null>(null);
  const [result, setResult] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [tested, setTested] = useState<number | null>(null);
  useEffect(() => { pushState().then(setState).catch(() => setState('unsupported')); }, []);

  async function turnOn() {
    setBusy(true);
    const { key } = await keyFn().catch(() => ({ key: null }));
    const r = await enablePush(key, (s) => save({ data: s }));
    setResult(r); setBusy(false);
    if (r === 'registered') { setState('on'); const x = await test({ data: { ar } }).catch(() => ({ sent: 0 })); setTested(x.sent); }
  }

  if (state === null) return null;
  if (compact && state === 'on') return null;
  const status = result ?? (state === 'ios-install' ? 'ios-install' : state === 'denied' ? 'denied' : state === 'unsupported' ? 'unsupported' : null);
  const step = (n: number) => <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{n}</span>;

  return (
    <section className={`app-panel p-5 ${compact ? 'border-primary/50' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">{state === 'on' ? <BellRing className="size-5" /> : <Bell className="size-5" />}</span>
        <div className="min-w-0 flex-1">
          <b className="block">{state === 'on' ? t('التنبيهات شغالة على هذا الجهاز', 'Alerts are on for this device') : t('فعّل تنبيهات الجوال', 'Turn on phone alerts')}</b>
          <p className="text-sm text-muted-foreground">{t('نخبرك فوراً لو انقطع راوتر أو رجع، أو ضغط عليه، أو قربت الكروت تخلص — حتى والتطبيق مقفل.', 'We tell you right away when a router goes down or comes back, is under strain, or cards run low — even with the app closed.')}</p>
        </div>
      </div>

      {status === 'ios-install' && (
        <ol className="mt-4 space-y-2 rounded-xl bg-muted p-3 text-sm">
          <li className="font-semibold">{t('في iPhone، أضف Mikro للشاشة الرئيسية أولاً (شرط من Apple):', 'On iPhone, add Mikro to your Home Screen first (Apple requires it):')}</li>
          <li className="flex items-center gap-2">{step(1)}{t('افتح الموقع في Safari واضغط زر المشاركة', 'Open the site in Safari and tap Share')}<Share className="size-4" /></li>
          <li className="flex items-center gap-2">{step(2)}{t('اختر «إضافة إلى الشاشة الرئيسية»', 'Choose "Add to Home Screen"')}<SquarePlus className="size-4" /></li>
          <li className="flex items-center gap-2">{step(3)}{t('افتح Mikro من أيقونته وارجع لهذا الزر', 'Open Mikro from its icon and come back to this button')}</li>
        </ol>
      )}
      {status === 'open-in-new-tab' && <p className="mt-3 flex items-center gap-2 rounded-xl bg-muted p-3 text-sm"><ExternalLink className="size-4 shrink-0" />{t('افتح الموقع في نافذة مستقلة (أو من الجوال) لتفعيل التنبيهات — المعاينة هنا لا تسمح بها.', 'Open the site in its own tab (or on your phone) to turn alerts on — this preview cannot.')}</p>}
      {status === 'denied' && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{t('التنبيهات محظورة لهذا الموقع. من إعدادات المتصفح ← إعدادات الموقع ← الإشعارات، اسمح لـ Mikro ثم ارجع هنا.', 'Notifications are blocked for this site. In browser settings → Site settings → Notifications, allow Mikro, then come back.')}</p>}
      {status === 'unsupported' && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">{t('هذا المتصفح لا يدعم التنبيهات. استخدم Chrome على أندرويد أو Safari على iPhone بعد الإضافة للشاشة الرئيسية.', 'This browser does not support alerts. Use Chrome on Android, or Safari on iPhone after adding to Home Screen.')}</p>}
      {(status === 'error' || status === 'not-configured') && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{t('ما قدرنا نفعّل التنبيهات. حاول مرة ثانية بعد قليل.', 'Could not turn alerts on. Try again shortly.')}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {state !== 'on' && state !== 'ios-install' && state !== 'unsupported' && <Button className="h-11 flex-1" disabled={busy} onClick={turnOn}>{busy ? <Loader2 className="animate-spin" /> : <Bell />}{t('فعّل التنبيهات', 'Turn on alerts')}</Button>}
        {state === 'on' && <Button variant="outline" className="h-11 flex-1" disabled={busy} onClick={async () => { setBusy(true); const x = await test({ data: { ar } }).catch(() => ({ sent: 0 })); setTested(x.sent); setBusy(false); }}>{busy ? <Loader2 className="animate-spin" /> : <BellRing />}{t('أرسل تنبيه تجريبي', 'Send a test alert')}</Button>}
      </div>
      {state === 'on' && !compact && <PhoneCheck ar={ar} />}
      {tested != null && <p role="status" className="mt-2 flex items-center gap-1.5 text-sm text-primary">{tested > 0 ? <><Check className="size-4" />{t('أرسلنا تنبيه تجريبي — لازم يظهر خلال ثوانٍ.', 'Test alert sent — it should appear in seconds.')}</> : t('ما وصل التنبيه لأي جهاز. فعّله من جديد.', 'No device received it. Turn alerts on again.')}</p>}
    </section>
  );
}
