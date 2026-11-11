import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, CheckCircle2, Cloud, Globe2, Loader2, Router, Terminal } from 'lucide-react';
import { buildPasteCommand } from '@/lib/router-script';
import { createPushRouter } from '@/lib/ip-cloud.functions';
import { PasteCommandPanel } from '@/components/paste-command-panel';

export const Route = createFileRoute('/_authenticated/onboarding')({
  head: () => ({ meta: [
    { title: 'Mikro — أضف راوترك الأول' },
    { name: 'description', content: 'Connect your first MikroTik router to Mikro with one pasted line.' },
    { property: 'og:title', content: 'Mikro — Add your first router' },
    { property: 'og:description', content: 'One-line router setup for Mikro.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Onboarding,
});

type Step = 'basics' | 'push' | 'done';
type Status = { identity?: string; board?: string; version?: string; cpu?: number; cloudName?: string; sslPort?: string; sslDisabled?: string; behindNat?: string };
const LATER_KEY = 'mikro-onboarding-later';

function Onboarding() {
  const { ar, toggleLanguage } = useLanguage();
  const t = (a: string, b: string) => (ar ? a : b);
  const navigate = useNavigate();
  const createRouter = useServerFn(createPushRouter);
  const [step, setStep] = useState<Step>('basics');
  const [name, setName] = useState('');
  const [waited, setWaited] = useState(0);
  const [routerId, setRouterId] = useState<string | null>(null);
  const [command, setCommand] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  // Wait for the first report.
  useEffect(() => {
    if (step !== 'push' || !routerId) return;
    const id = setInterval(async () => {
      const { data } = await supabase.from('routers').select('last_seen_at, last_status').eq('id', routerId).maybeSingle();
      setWaited((w) => w + 5);
      if (data?.last_seen_at) { setStatus(data.last_status as Status); setStep('done'); }
    }, 5000);
    return () => clearInterval(id);
  }, [step, routerId]);

  async function start(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim()) return;
    setBusy(true); setError(null);
    const r = await createRouter({ data: { name: name.trim() } }).catch(() => ({ ok: false as const }));
    setBusy(false);
    if (!r.ok) return setError(t('ما قدرنا نحفظ الراوتر. حاول مرة ثانية.', 'Could not save the router. Try again.'));
    setRouterId(r.id); setCommand(buildPasteCommand(r.token, r.password)); setWaited(0); setStep('push');
  }

  function later() { sessionStorage.setItem(LATER_KEY, '1'); navigate({ to: '/routers' }); }

  const idx = { basics: 0, push: 1, done: 2 }[step];
  const cloudReady = !!status?.cloudName && status.version?.startsWith('7');

  return (
    <main className="app-shell min-h-screen py-6" lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <div aria-hidden className="landing-pattern" />
      <div className="flex items-center justify-between">
        <span className="text-lg font-extrabold">Mikro</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label={ar ? 'English' : 'العربية'} onClick={toggleLanguage}><Globe2 /></Button>
          {step !== 'done' && <Button variant="ghost" onClick={later}>{t('سأكمل لاحقاً', 'Later')}</Button>}
        </div>
      </div>

      <div className="mx-auto mt-6 w-full max-w-lg">
        <ol className="mb-6 grid grid-cols-3 gap-2" aria-label={t('خطوات الإضافة', 'Setup steps')}>
          {[t('الراوتر', 'Router'), t('الصق الأمر', 'Paste'), t('تم', 'Done')].map((l, i) => (
            <li key={l} className="space-y-1.5" aria-current={i === idx ? 'step' : undefined}>
              <div className={`h-1.5 rounded-full ${i <= idx ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`text-xs ${i === idx ? 'font-bold' : 'text-muted-foreground'}`}>{i < idx && <Check className="inline size-3" />} {l}</p>
            </li>
          ))}
        </ol>

        <section className="space-y-5 app-panel p-5 sm:p-6">
          {step === 'basics' && (
            <form className="space-y-5" onSubmit={start}>
              <Head icon={<Router />} title={t('أهلاً بك! لنضف راوترك الأول', "Welcome! Let's add your first router")} sub={t('دقيقة تقريباً. لا نطلب كلمة مرور المدير أبداً.', 'About a minute. We never ask for the admin password.')} />
              <div className="space-y-2"><Label htmlFor="rname">{t('اسم تعرفه به', 'A name you recognise')}</Label><Input id="rname" autoFocus required maxLength={60} className="h-12" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('مثلاً: برج الحي', 'e.g. Main tower')} /></div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-primary" />{t('أمر واحد يشتغل على v6 وv7، ونعرف الإصدار تلقائياً.', 'One command for v6 and v7; we detect the version.')}</li>
                <li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-primary" />{t('يشتغل حتى لو الإنترنت خلف CGNAT.', 'Works even behind CGNAT.')}</li>
                <li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-primary" />{t('لو راوترك عليه IP عام وIP Cloud مفعّل، نتصل فيه مباشرة تلقائياً.', 'If the router has a public IP and IP Cloud, we connect directly on our own.')}</li>
              </ul>
              <Button type="submit" className="h-12 w-full text-base" disabled={!name.trim() || busy}>{busy && <Loader2 className="animate-spin" />}{t('التالي', 'Next')}</Button>
              <Err e={error} />
            </form>
          )}

          {step === 'push' && (
            <div className="space-y-4">
              <Head icon={<Terminal />} title={t('الصق هذا الأمر في الراوتر', 'Paste this into the router')} sub={t('انسخ ← الصق في Terminal، ويتنفذ لحاله', 'Copy → paste in Terminal; it runs by itself')} />
              <PasteCommandPanel command={command} ar={ar} />
              <div role="status" className="flex items-center gap-3 rounded-xl bg-muted p-4 text-sm"><Loader2 className="size-5 shrink-0 animate-spin text-primary" /><span className="flex-1">{t('ننتظر أول إشارة من راوترك... عادة أقل من دقيقة.', 'Waiting for the first signal from your router... usually under a minute.')}</span><bdi dir="ltr" className="tabular-nums text-muted-foreground">{waited}s</bdi></div>
              {waited >= 60 && (
                <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
                  <p className="font-semibold">{t('ما وصلت إشارة بعد؟ تأكد من هذه:', 'No signal yet? Check these:')}</p>
                  <ul className="list-disc space-y-1 ps-5 text-muted-foreground">
                    <li>{t('الراوتر متصل بالإنترنت: جرّب', 'The router has internet: try')} <code dir="ltr">/ping 8.8.8.8</code></li>
                    <li>{t('DNS شغال: جرّب', 'DNS works: try')} <code dir="ltr">/ping mikro.alwahdi.com</code></li>
                    <li>{t('ساعة الراوتر صحيحة (الساعة الخاطئة تفشل اتصال HTTPS):', 'Router clock is correct (a wrong clock breaks HTTPS):')} <code dir="ltr">/system clock print</code></li>
                    <li>{t('لو ظهر خطأ في Terminal، صوّره وأرسله لنا.', 'If Terminal showed an error, send us a screenshot.')}</li>
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t('لن يظهر هذا الأمر مرة ثانية. لا تشاركه مع أحد.', 'This command will not be shown again. Do not share it.')}</p>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-5">
              <div className="space-y-2 text-center">
                <CheckCircle2 className="mx-auto size-16 text-primary" />
                <h1 className="text-2xl font-bold">{t('تم الربط!', 'Connected!')}</h1>
                <p className="text-muted-foreground">{status?.identity ?? name} · <bdi dir="ltr">{status?.board} {status?.version}</bdi></p>
                {status?.cpu != null && <p className="text-sm">{t('المعالج الآن', 'CPU now')}: <b>{status.cpu}%</b></p>}
              </div>
              {cloudReady && <p role="status" className="flex items-start gap-2 rounded-xl bg-primary/10 p-3 text-sm"><Cloud className="mt-0.5 size-4 shrink-0 text-primary" />{status?.behindNat === 'no' ? t('راوترك عليه IP عام وIP Cloud مفعّل. نجرب الاتصال المباشر تلقائياً وتشوف النتيجة في راوتراتي.', 'Your router has a public IP and IP Cloud. We try a direct connection automatically; see it in My routers.') : t('راوترك خلف NAT، فالاتصال يكون عبر الإشارات كل 30 ثانية، وهذا كافٍ.', 'Your router is behind NAT, so it reports every 30 seconds. That is enough.')}</p>}
                            <Button className="h-12 w-full text-base" onClick={() => navigate({ to: '/routers' })}>{t('اذهب إلى راوتراتي', 'Go to my routers')}</Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Head({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return <div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary [&>svg]:size-5">{icon}</span><div><h1 className="text-xl font-bold">{title}</h1><p className="mt-0.5 text-sm text-muted-foreground">{sub}</p></div></div>;
}
function Err({ e }: { e: string | null }) {
  return e ? <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{e}</p> : null;
}
