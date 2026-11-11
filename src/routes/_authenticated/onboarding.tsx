import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { Building2, Check, CheckCircle2, Cloud, Globe2, Loader2, MapPin, Network, Router, Terminal, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildPasteCommand } from '@/lib/router-script';
import { createPushRouter } from '@/lib/ip-cloud.functions';
import { saveAccountProfile } from '@/lib/profile.functions';
import { PasteCommandPanel } from '@/components/paste-command-panel';
import { CITIES, COUNTRY_NAMES, cleanText } from '@/lib/cities';

export const Route = createFileRoute('/_authenticated/onboarding')({
  head: () => ({ meta: [
    { title: 'Mikro — أضف شبكتك' },
    { name: 'description', content: 'Set up your network on Mikro: who you are, your network and city, then connect your MikroTik router with one line.' },
    { property: 'og:title', content: 'Mikro — Add your network' },
    { property: 'og:description', content: 'Network setup and one-line router connection for Mikro.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Onboarding,
});

type Step = 'type' | 'network' | 'router' | 'push' | 'done';
type Status = { identity?: string; board?: string; version?: string; cpu?: number; cloudName?: string; behindNat?: string };

function Onboarding() {
  const { ar, toggleLanguage } = useLanguage();
  const t = (a: string, b: string) => (ar ? a : b);
  const navigate = useNavigate();
  const createRouter = useServerFn(createPushRouter);
  const saveProfile = useServerFn(saveAccountProfile);
  const [ready, setReady] = useState(false);
  const [firstTime, setFirstTime] = useState(true);
  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<'owner' | 'engineer' | null>(null);
  const [networkName, setNetworkName] = useState('');
  const [city, setCity] = useState('');
  const [name, setName] = useState('');
  const [waited, setWaited] = useState(0);
  const [routerId, setRouterId] = useState<string | null>(null);
  const [command, setCommand] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  // Returning owners (adding another router) skip the account steps.
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('account_type, network_name, city').eq('id', u.user?.id ?? '').maybeSingle();
      if (data?.account_type) {
        setFirstTime(false); setType(data.account_type as 'owner' | 'engineer'); setNetworkName(data.network_name ?? ''); setCity(data.city ?? '');
        const { count } = await supabase.from('routers').select('id', { count: 'exact', head: true });
        setFirstTime(!count); setStep('router');
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (step !== 'push' || !routerId) return;
    const id = setInterval(async () => {
      const { data } = await supabase.from('routers').select('last_seen_at, last_status').eq('id', routerId).maybeSingle();
      setWaited((w) => w + 5);
      if (data?.last_seen_at) { setStatus(data.last_status as Status); setStep('done'); }
    }, 5000);
    return () => clearInterval(id);
  }, [step, routerId]);

  const suggestions = useMemo(() => {
    const q = cleanText(city); if (!q) return [];
    return CITIES.filter((c) => c.ar.includes(q) || c.en.toLowerCase().includes(q.toLowerCase())).slice(0, 5);
  }, [city]);
  const exactCity = CITIES.some((c) => c.ar === cleanText(city) || c.en === cleanText(city));
  const networkValid = cleanText(city).length >= 2 && (type === 'engineer' || cleanText(networkName).length >= 2);

  async function submitNetwork(e: React.FormEvent) {
    e.preventDefault(); if (!type || !networkValid) return;
    setBusy(true); setError(null);
    const r = await saveProfile({ data: { accountType: type, networkName, city, language: ar ? 'ar' : 'en' } }).catch(() => ({ ok: false as const }));
    setBusy(false);
    if (!r.ok) return setError(t('ما قدرنا نحفظ بيانات الشبكة. حاول مرة ثانية.', 'Could not save your network. Try again.'));
    if (!name) setName(type === 'owner' ? t('الراوتر الرئيسي', 'Main router') : '');
    setStep('router');
  }

  async function startRouter(e: React.FormEvent) {
    e.preventDefault(); if (!cleanText(name)) return;
    setBusy(true); setError(null);
    const r = await createRouter({ data: { name: cleanText(name) } }).catch(() => ({ ok: false as const }));
    setBusy(false);
    if (!r.ok) return setError(t('ما قدرنا نحفظ الراوتر. حاول مرة ثانية.', 'Could not save the router. Try again.'));
    setRouterId(r.id); setCommand(buildPasteCommand(r.token, r.password)); setWaited(0); setStep('push');
  }

  const steps = firstTime
    ? [{ id: 'type', l: t('أنت', 'You') }, { id: 'network', l: t('الشبكة', 'Network') }, { id: 'router', l: t('الراوتر', 'Router') }, { id: 'done', l: t('تم', 'Done') }]
    : [{ id: 'router', l: t('الراوتر', 'Router') }, { id: 'done', l: t('تم', 'Done') }];
  const idx = Math.max(0, steps.findIndex((s) => s.id === (step === 'push' ? 'router' : step)));
  const canLeave = !firstTime;

  const options = [
    { id: 'owner' as const, icon: <Network />, title: t('صاحب شبكة', 'Network owner'), sub: t('أدير شبكتي وكروتي ورواتري', 'I run my own network and cards') },
    { id: 'engineer' as const, icon: <Wrench />, title: t('مهندس شبكات', 'Network engineer'), sub: t('أركّب وأدير شبكات لعملاء', 'I install and manage networks for clients') },
  ];

  return (
    <main className="app-shell min-h-screen py-6" lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <div aria-hidden className="landing-pattern" />
      <div className="flex items-center justify-between">
        <span className="text-lg font-extrabold">Mikro</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label={ar ? 'English' : 'العربية'} onClick={toggleLanguage}><Globe2 /></Button>
          {canLeave && step !== 'done' && <Button variant="ghost" onClick={() => navigate({ to: '/dashboard' })}>{t('رجوع للوحة', 'Back to dashboard')}</Button>}
        </div>
      </div>

      <div className="mx-auto mt-6 w-full max-w-lg">
        <ol className="mb-6 grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }} aria-label={t('خطوات الإعداد', 'Setup steps')}>
          {steps.map((s, i) => (
            <li key={s.id} className="space-y-1.5" aria-current={i === idx ? 'step' : undefined}>
              <div className={`h-1.5 rounded-full ${i <= idx ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`text-xs ${i === idx ? 'font-bold' : 'text-muted-foreground'}`}>{i < idx && <Check className="inline size-3" />} {s.l}</p>
            </li>
          ))}
        </ol>

        <section className="app-panel space-y-5 p-5 sm:p-6">
          {!ready && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t('لحظة...', 'One moment...')}</p>}

          {ready && step === 'type' && (
            <div className="space-y-5">
              <Head icon={<Network />} title={t('أهلاً بك في Mikro', 'Welcome to Mikro')} sub={t('نجهز كل شي على حسب شغلك.', 'We set things up around your work.')} />
              <div className="grid gap-3">
                {options.map((o) => (
                  <button key={o.id} type="button" onClick={() => { setType(o.id); setStep('network'); }}
                    className={`flex min-h-20 items-center gap-3 rounded-xl border p-4 text-start transition-colors ${type === o.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary [&>svg]:size-5">{o.icon}</span>
                    <span><b className="block">{o.title}</b><span className="text-xs text-muted-foreground">{o.sub}</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {ready && step === 'network' && (
            <form className="space-y-5" onSubmit={submitNetwork}>
              <Head icon={<Building2 />} title={type === 'owner' ? t('شبكتك', 'Your network') : t('نشاطك', 'Your business')} sub={t('يظهر الاسم في لوحتك وعلى الكروت لاحقاً.', 'The name shows on your dashboard and later on cards.')} />
              <div className="space-y-2">
                <Label htmlFor="network">{type === 'owner' ? t('اسم الشبكة', 'Network name') : t('اسم نشاطك (اختياري)', 'Business name (optional)')}</Label>
                <Input id="network" autoFocus className="h-12" maxLength={80} value={networkName} onChange={(e) => setNetworkName(e.target.value)} placeholder={type === 'owner' ? t('مثلاً: شبكة تواصل', 'e.g. Tawasul Net') : t('مثلاً: الوحدي للشبكات', 'e.g. Alwahdi Networks')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city"><MapPin className="inline size-4" /> {t('المدينة', 'City')}</Label>
                <Input id="city" className="h-12" maxLength={60} autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('اكتب أول حروف مدينتك', 'Start typing your city')} />
                {!exactCity && suggestions.length > 0 && (
                  <ul className="flex flex-wrap gap-2">{suggestions.map((c) => <li key={c.en}><button type="button" onClick={() => setCity(ar ? c.ar : c.en)} className="chip">{ar ? c.ar : c.en} <span className="text-xs text-muted-foreground">· {COUNTRY_NAMES[c.country][ar ? 'ar' : 'en']}</span></button></li>)}</ul>
                )}
              </div>
              <Err e={error} />
              <div className="flex gap-2">
                <Button type="button" variant="ghost" className="h-12" onClick={() => setStep('type')}>{t('رجوع', 'Back')}</Button>
                <Button type="submit" className="h-12 flex-1 text-base" disabled={!networkValid || busy}>{busy && <Loader2 className="animate-spin" />}{t('التالي: اربط الراوتر', 'Next: connect the router')}</Button>
              </div>
            </form>
          )}

          {ready && step === 'router' && (
            <form className="space-y-5" onSubmit={startRouter}>
              <Head icon={<Router />} title={firstTime ? t('اربط راوتر الشبكة', 'Connect your network router') : t('أضف راوتر للشبكة', 'Add a router to your network')} sub={t('دقيقة تقريباً. لا نطلب كلمة مرور المدير أبداً.', 'About a minute. We never ask for the admin password.')} />
              <div className="space-y-2"><Label htmlFor="rname">{t('اسم تعرفه به', 'A name you recognise')}</Label><Input id="rname" autoFocus required maxLength={60} className="h-12" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('مثلاً: راوتر الدمج، راوتر التوزيع', 'e.g. Load balancer, Distribution')} /></div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-primary" />{t('أمر واحد يشتغل على v6 وv7، ونعرف الإصدار تلقائياً.', 'One command for v6 and v7; we detect the version.')}</li>
                <li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-primary" />{t('يشتغل حتى لو الإنترنت خلف CGNAT، ويرسل الكروت كل 5 دقائق.', 'Works behind CGNAT and sends cards every 5 minutes.')}</li>
                <li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-primary" />{t('لو عليه IP عام وIP Cloud، نتصل مباشرة تلقائياً.', 'With a public IP and IP Cloud, we connect directly on our own.')}</li>
              </ul>
              <Err e={error} />
              <Button type="submit" className="h-12 w-full text-base" disabled={!cleanText(name) || busy}>{busy && <Loader2 className="animate-spin" />}{t('اعرض أمر الربط', 'Show the command')}</Button>
            </form>
          )}

          {step === 'push' && (
            <div className="space-y-4">
              <Head icon={<Terminal />} title={t('الصق هذا الأمر في الراوتر', 'Paste this into the router')} sub={t('انسخ ← الصق في Terminal، ويتنفذ لحاله', 'Copy → paste in Terminal; it runs by itself')} />
              <PasteCommandPanel command={command} ar={ar} />
              <div role="status" className="flex items-center gap-3 rounded-xl bg-muted p-4 text-sm"><Loader2 className="size-5 shrink-0 animate-spin text-primary" /><span className="flex-1">{t('ننتظر أول إشارة من راوترك... عادة أقل من دقيقة.', 'Waiting for the first signal... usually under a minute.')}</span><bdi dir="ltr" className="tabular-nums text-muted-foreground">{waited}s</bdi></div>
              {waited >= 60 && (
                <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
                  <p className="font-semibold">{t('ما وصلت إشارة بعد؟ تأكد من هذه:', 'No signal yet? Check these:')}</p>
                  <ul className="list-disc space-y-1 ps-5 text-muted-foreground">
                    <li>{t('الراوتر متصل بالإنترنت: جرّب', 'The router has internet: try')} <code dir="ltr">/ping 8.8.8.8</code></li>
                    <li>{t('DNS شغال: جرّب', 'DNS works: try')} <code dir="ltr">/ping mikro.alwahdi.com</code></li>
                    <li>{t('ساعة الراوتر صحيحة:', 'Router clock is correct:')} <code dir="ltr">/system clock print</code></li>
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
                <h1 className="text-2xl font-bold">{t('شبكتك متصلة!', 'Your network is connected!')}</h1>
                <p className="text-muted-foreground">{status?.identity ?? name} · <bdi dir="ltr">{status?.board} {status?.version}</bdi></p>
              </div>
              <p role="status" className="flex items-start gap-2 rounded-xl bg-primary/10 p-3 text-sm"><Cloud className="mt-0.5 size-4 shrink-0 text-primary" />{status?.cloudName && status.behindNat === 'no' ? t('راوترك عليه IP عام وIP Cloud. نتصل فيه مباشرة تلقائياً.', 'Your router has a public IP and IP Cloud. We connect directly on our own.') : t('الحالة تتحدث كل 30 ثانية، وقائمة الكروت تصل خلال 5 دقائق.', 'Status updates every 30 seconds; the card list arrives within 5 minutes.')}</p>
              <Button className="h-12 w-full text-base" onClick={() => navigate({ to: '/dashboard' })}>{t('افتح لوحة الشبكة', 'Open the network dashboard')}</Button>
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
