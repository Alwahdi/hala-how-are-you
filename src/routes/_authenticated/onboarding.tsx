import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Cloud, Copy, Globe2, Loader2, Router, Terminal, TriangleAlert } from 'lucide-react';
import { buildPasteCommand, hashToken, newToken } from '@/lib/router-script';
import { buildIpCloudSetup } from '@/lib/ip-cloud';
import { connectIpCloudRouter, createIpCloudRouter } from '@/lib/ip-cloud.functions';

export const Route = createFileRoute('/_authenticated/onboarding')({
  head: () => ({ meta: [
    { title: 'Mikro — أضف راوترك الأول' },
    { name: 'description', content: 'Connect your first MikroTik router to Mikro in three steps.' },
    { property: 'og:title', content: 'Mikro — Add your first router' },
    { property: 'og:description', content: 'Three-step router setup for Mikro.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Onboarding,
});

type Step = 'basics' | 'method' | 'push' | 'cloud' | 'done';
type Status = { identity?: string; board?: string; version?: string; cpu?: number };
const LATER_KEY = 'mikro-onboarding-later';

function Onboarding() {
  const { ar, toggleLanguage } = useLanguage();
  const t = (a: string, b: string) => (ar ? a : b);
  const navigate = useNavigate();
  const createCloud = useServerFn(createIpCloudRouter);
  const connectCloud = useServerFn(connectIpCloudRouter);
  const [step, setStep] = useState<Step>('basics');
  const [name, setName] = useState('');
  const [version, setVersion] = useState<'v7' | 'v6'>('v7');
  const [routerId, setRouterId] = useState<string | null>(null);
  const [command, setCommand] = useState('');
  const [copied, setCopied] = useState(false);
  const [host, setHost] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const Back = ar ? ArrowRight : ArrowLeft;

  // Wait for the first push report.
  useEffect(() => {
    if (step !== 'push' || !routerId) return;
    const id = setInterval(async () => {
      const { data } = await supabase.from('routers').select('last_seen_at, last_status').eq('id', routerId).maybeSingle();
      if (data?.last_seen_at) { setStatus(data.last_status as Status); setStep('done'); }
    }, 5000);
    return () => clearInterval(id);
  }, [step, routerId]);

  async function choosePush() {
    setBusy(true); setError(null);
    const { data: u } = await supabase.auth.getUser();
    const token = newToken();
    const { data, error: e } = await supabase.from('routers').insert({ owner_id: u.user!.id, name: name.trim(), ros_version: version, token_hash: await hashToken(token) }).select('id').single();
    setBusy(false);
    if (e || !data) return setError(t('ما قدرنا نحفظ الراوتر. حاول مرة ثانية.', 'Could not save the router. Try again.'));
    setRouterId(data.id); setCommand(buildPasteCommand(token)); setStep('push');
  }

  async function chooseCloud() {
    setBusy(true); setError(null);
    const r = await createCloud({ data: { name: name.trim() } }).catch(() => ({ ok: false as const }));
    setBusy(false);
    if (!r.ok) return setError(t('ما قدرنا نجهز الربط. حاول مرة ثانية.', 'Could not prepare the connection. Try again.'));
    setRouterId(r.id); setCommand(buildIpCloudSetup(r.password)); setStep('cloud');
  }

  async function testCloud(e: React.FormEvent) {
    e.preventDefault(); if (!routerId) return;
    setBusy(true); setError(null);
    const r = await connectCloud({ data: { id: routerId, host } }).catch(() => ({ ok: false as const, error: 'unreachable' as const }));
    setBusy(false);
    if (r.ok) { setStatus(r.status); return setStep('done'); }
    const msgs: Record<string, string> = {
      invalid_host: t('اكتب اسم IP Cloud كما يظهر في الراوتر، مثل xxxx.sn.mynetname.net', 'Enter the IP Cloud name as shown on the router, e.g. xxxx.sn.mynetname.net'),
      auth: t('الراوتر رفض الدخول. الصق الأمر مرة ثانية ثم أعد المحاولة.', 'The router rejected the login. Paste the command again, then retry.'),
      tls: t('الشهادة لم تجهز بعد. انتظر دقيقة ثم أعد المحاولة.', 'The certificate is not ready yet. Wait a minute and retry.'),
      timeout: t('ما وصلنا للراوتر. غالباً الإنترنت خلف CGNAT أو المنفذ 443 مغلق.', 'We could not reach the router. It is probably behind CGNAT or port 443 is closed.'),
      unreachable: t('ما وصلنا للراوتر. غالباً الإنترنت خلف CGNAT أو المنفذ 443 مغلق.', 'We could not reach the router. It is probably behind CGNAT or port 443 is closed.'),
    };
    setError(msgs[r.error] ?? msgs.unreachable);
  }

  async function switchToPush() {
    if (routerId) await supabase.from('routers').delete().eq('id', routerId);
    setRouterId(null); setError(null); setVersion('v7'); await choosePush();
  }

  async function copy() { await navigator.clipboard.writeText(command); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  function later() { sessionStorage.setItem(LATER_KEY, '1'); navigate({ to: '/routers' }); }

  const idx = { basics: 0, method: 1, push: 2, cloud: 2, done: 3 }[step];

  return (
    <main className="landing-width min-h-screen py-6" lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <span className="text-lg font-extrabold">Mikro</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label={ar ? 'English' : 'العربية'} onClick={toggleLanguage}><Globe2 /></Button>
          {step !== 'done' && <Button variant="ghost" onClick={later}>{t('سأكمل لاحقاً', 'Later')}</Button>}
        </div>
      </div>

      <div className="mx-auto mt-6 w-full max-w-lg">
        <ol className="mb-6 grid grid-cols-3 gap-2" aria-label={t('خطوات الإضافة', 'Setup steps')}>
          {[t('الراوتر', 'Router'), t('طريقة الربط', 'Connection'), t('الاتصال', 'Connect')].map((l, i) => (
            <li key={l} className="space-y-1.5" aria-current={i === idx ? 'step' : undefined}>
              <div className={`h-1.5 rounded-full ${i <= idx ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`text-xs ${i === idx ? 'font-bold' : 'text-muted-foreground'}`}>{i < idx && <Check className="inline size-3" />} {l}</p>
            </li>
          ))}
        </ol>

        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
          {step === 'basics' && (
            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep('method'); }}>
              <Head icon={<Router />} title={t('أهلاً بك! لنضف راوترك الأول', "Welcome! Let's add your first router")} sub={t('دقيقتان تقريباً. لا نطلب كلمة مرور المدير أبداً.', 'About two minutes. We never ask for the admin password.')} />
              <div className="space-y-2"><Label htmlFor="rname">{t('اسم تعرفه به', 'A name you recognise')}</Label><Input id="rname" autoFocus required maxLength={60} className="h-12" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('مثلاً: برج الحي', 'e.g. Main tower')} /></div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t('إصدار RouterOS', 'RouterOS version')}</legend>
                <div className="grid grid-cols-2 gap-3">
                  {(['v7', 'v6'] as const).map((v) => (
                    <button key={v} type="button" aria-pressed={version === v} onClick={() => setVersion(v)} className={`rounded-xl border p-4 text-start ${version === v ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-input'}`}>
                      <span className="block text-2xl font-extrabold" dir="ltr">{v}</span>
                      <span className="text-xs text-muted-foreground">{v === 'v7' ? t('الأحدث (7.x)', 'Newest (7.x)') : t('الأقدم (6.x)', 'Older (6.x)')}</span>
                    </button>
                  ))}
                </div>
                <details className="text-xs text-muted-foreground"><summary className="cursor-pointer text-primary">{t('كيف أعرف إصداري؟', 'How do I know my version?')}</summary><p className="mt-1">{t('في Winbox يظهر الإصدار أعلى النافذة، أو اكتب في Terminal:', 'Winbox shows it in the title bar, or run in Terminal:')} <code dir="ltr">/system resource print</code></p></details>
              </fieldset>
              <Button type="submit" className="h-12 w-full text-base" disabled={!name.trim()}>{t('التالي', 'Next')}</Button>
            </form>
          )}

          {step === 'method' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2"><BackBtn Back={Back} label={t('رجوع', 'Back')} onClick={() => setStep('basics')} /><Head icon={<Globe2 />} title={t('كيف نتصل بالراوتر؟', 'How should we connect?')} sub={t('اختر واحدة، وتقدر تغيرها لاحقاً.', 'Pick one; you can change it later.')} /></div>
              <MethodCard icon={<Terminal />} badge={t('موصى به', 'Recommended')} title={t('أمر لصق', 'Paste command')} body={t('يعمل حتى لو الإنترنت خلف CGNAT. الراوتر يرسل حالته كل 30 ثانية.', 'Works even behind CGNAT. The router sends its status every 30 seconds.')} onClick={choosePush} disabled={busy} />
              <MethodCard icon={<Cloud />} title="IP Cloud / DDNS" body={version === 'v6' ? t('متاح حالياً لـ v7 فقط. استخدم أمر اللصق لـ v6.', 'Currently v7 only. Use the paste command for v6.') : t('نتصل نحن بالراوتر عبر اسم IP Cloud. يحتاج عنواناً مفتوحاً (ليس CGNAT).', 'We connect to the router through its IP Cloud name. Needs a reachable address (not CGNAT).')} onClick={chooseCloud} disabled={busy || version === 'v6'} />
              {busy && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t('نجهز...', 'Preparing...')}</p>}
              <Err e={error} />
            </div>
          )}

          {step === 'push' && (
            <div className="space-y-4">
              <Head icon={<Terminal />} title={t('الصق هذا الأمر في الراوتر', 'Paste this into the router')} sub={t('Winbox ← New Terminal ← الصق ← Enter', 'Winbox → New Terminal → paste → Enter')} />
              <Cmd command={command} />
              <Button className="h-12 w-full text-base" onClick={copy}><Copy />{copied ? t('تم النسخ ✓', 'Copied ✓') : t('نسخ الأمر', 'Copy command')}</Button>
              <div role="status" className="flex items-center gap-3 rounded-xl bg-muted p-4 text-sm"><Loader2 className="size-5 shrink-0 animate-spin text-primary" />{t('ننتظر أول رسالة من راوترك... عادة أقل من دقيقة.', 'Waiting for the first message from your router... usually under a minute.')}</div>
              <p className="text-xs text-muted-foreground">{t('لن يظهر هذا الأمر مرة ثانية. لا تشاركه مع أحد.', 'This command will not be shown again. Do not share it.')}</p>
            </div>
          )}

          {step === 'cloud' && (
            <div className="space-y-4">
              <Head icon={<Cloud />} title={t('خطوتان للربط عبر IP Cloud', 'Two steps for IP Cloud')} sub={t('ننشئ مستخدماً للقراءة فقط ونفعل اتصالاً مشفراً.', 'We create a read-only user and enable an encrypted connection.')} />
              <p className="text-sm font-semibold">1. {t('الصق الأمر في Terminal وانتظر حتى يطبع اسم IP Cloud', 'Paste in Terminal and wait until it prints the IP Cloud name')}</p>
              <Cmd command={command} />
              <Button variant="outline" className="h-11 w-full" onClick={copy}><Copy />{copied ? t('تم النسخ ✓', 'Copied ✓') : t('نسخ الأمر', 'Copy command')}</Button>
              <form className="space-y-3" onSubmit={testCloud}>
                <Label htmlFor="host" className="text-sm font-semibold">2. {t('الصق اسم IP Cloud هنا', 'Paste the IP Cloud name here')}</Label>
                <Input id="host" dir="ltr" required className="h-12" placeholder="xxxx.sn.mynetname.net" value={host} onChange={(e) => setHost(e.target.value)} />
                <Button type="submit" className="h-12 w-full text-base" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{t('اختبر الاتصال', 'Test connection')}</Button>
              </form>
              <Err e={error} />
              {error && <Button variant="secondary" className="h-11 w-full" onClick={switchToPush}><Terminal />{t('استخدم أمر اللصق بدلاً من ذلك', 'Use the paste command instead')}</Button>}
              <p className="flex gap-2 text-xs text-muted-foreground"><TriangleAlert className="size-4 shrink-0" />{t('هذا يفتح المنفذ 443 للإنترنت. يفضل تقييده بعناوين موثوقة من الجدار الناري.', 'This exposes port 443. Restrict it to trusted addresses in the firewall when possible.')}</p>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-5 text-center">
              <CheckCircle2 className="mx-auto size-16 text-primary" />
              <div><h1 className="text-2xl font-bold">{t('تم الربط!', 'Connected!')}</h1><p className="mt-1 text-muted-foreground">{status?.identity ?? name} · <bdi dir="ltr">{status?.board} {status?.version}</bdi></p></div>
              {status?.cpu != null && <p className="text-sm">{t('المعالج الآن', 'CPU now')}: <b>{status.cpu}%</b></p>}
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
function BackBtn({ Back, label, onClick }: { Back: typeof ArrowLeft; label: string; onClick: () => void }) {
  return <button type="button" aria-label={label} onClick={onClick} className="mt-1 rounded-lg p-2 hover:bg-muted"><Back className="size-4" /></button>;
}
function MethodCard({ icon, title, body, badge, onClick, disabled }: { icon: React.ReactNode; title: string; body: string; badge?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex w-full items-start gap-4 rounded-xl border border-input p-4 text-start transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:hover:border-input disabled:hover:bg-transparent">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-primary [&>svg]:size-6">{icon}</span>
      <span className="space-y-1"><span className="flex flex-wrap items-center gap-2 font-bold">{title}{badge && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{badge}</span>}</span><span className="block text-sm text-muted-foreground">{body}</span></span>
    </button>
  );
}
function Cmd({ command }: { command: string }) {
  return <pre dir="ltr" className="max-h-44 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-all">{command}</pre>;
}
function Err({ e }: { e: string | null }) {
  return e ? <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{e}</p> : null;
}
