import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Cloud, Copy, Globe2, Loader2, Router, Terminal, TriangleAlert } from 'lucide-react';
import { buildFallbackCommand, buildPasteCommand, hashToken, newToken } from '@/lib/router-script';
import { PasteCommandPanel } from '@/components/paste-command-panel';
import { buildReadOnlyUserCommand, CLOUD_NAME_COMMAND, HTTPS_SETUP_COMMAND } from '@/lib/ip-cloud';
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
type Status = { identity?: string | undefined; board?: string | undefined; version?: string | undefined; cpu?: number | undefined };
const LATER_KEY = 'mikro-onboarding-later';

function Onboarding() {
  const { ar, toggleLanguage } = useLanguage();
  const t = (a: string, b: string) => (ar ? a : b);
  const navigate = useNavigate();
  const createCloud = useServerFn(createIpCloudRouter);
  const connectCloud = useServerFn(connectIpCloudRouter);
  const [step, setStep] = useState<Step>('basics');
  const [name, setName] = useState('');
  const [fallback, setFallback] = useState('');
  const [waited, setWaited] = useState(0);
  const [routerId, setRouterId] = useState<string | null>(null);
  const [command, setCommand] = useState('');
  const [copied, setCopied] = useState(false);
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const Back = ar ? ArrowRight : ArrowLeft;

  // Wait for the first push report.
  useEffect(() => {
    if (step !== 'push' || !routerId) return;
    const id = setInterval(async () => {
      const { data } = await supabase.from('routers').select('last_seen_at, last_status').eq('id', routerId).maybeSingle();
      setWaited((w) => w + 5);
      if (data?.last_seen_at) { setStatus(data.last_status as Status); setStep('done'); }
    }, 5000);
    return () => clearInterval(id);
  }, [step, routerId]);

  async function choosePush() {
    setBusy(true); setError(null);
    const { data: u } = await supabase.auth.getUser();
    const token = newToken();
    const { data, error: e } = await supabase.from('routers').insert({ owner_id: u.user!.id, name: name.trim(), token_hash: await hashToken(token) }).select('id').single();
    setBusy(false);
    if (e || !data) return setError(t('ما قدرنا نحفظ الراوتر. حاول مرة ثانية.', 'Could not save the router. Try again.'));
    setRouterId(data.id); setCommand(buildPasteCommand(token)); setFallback(buildFallbackCommand(token)); setWaited(0); setStep('push');
  }

  async function chooseCloud() {
    setBusy(true); setError(null);
    const r = await createCloud({ data: { name: name.trim() } }).catch(() => ({ ok: false as const }));
    setBusy(false);
    if (!r.ok) return setError(t('ما قدرنا نجهز الربط. حاول مرة ثانية.', 'Could not prepare the connection. Try again.'));
    setRouterId(r.id); setCommand(buildReadOnlyUserCommand(r.password)); setStep('cloud');
  }

  async function testCloud(e: React.FormEvent) {
    e.preventDefault(); if (!routerId) return;
    setBusy(true); setError(null);
    setCloudError(null);
    const r = await connectCloud({ data: { id: routerId, host, port } }).catch(() => ({ ok: false as const, error: 'unreachable' as const }));
    setBusy(false);
    if (r.ok) { setStatus(r.status); return setStep('done'); }
    const portLabel = (host.match(/:(\d+)\s*$/)?.[1]) || port || '443';
    const unreachable = t(`ما وصلنا للراوتر على المنفذ ${portLabel}. تأكد من رقم المنفذ، وأن الإنترنت ليس خلف CGNAT، وأن الراوتر v7 (v6 لا يدعم هذه الطريقة). أمر اللصق يشتغل في كل الحالات.`, `We could not reach the router on port ${portLabel}. Check the port, that the line is not behind CGNAT, and that the router runs v7 (v6 is not supported here). The paste command works in all cases.`);
    const msgs = {
      invalid_host: t('اكتب اسم IP Cloud كما يظهر في الراوتر، مثل xxxx.sn.mynetname.net، ورقم منفذ بين 1 و65535.', 'Enter the IP Cloud name as shown on the router, e.g. xxxx.sn.mynetname.net, and a port between 1 and 65535.'),
      auth: t('الراوتر رفض الدخول. تأكد أنك لصقت أمر المستخدم في الخطوة 2، ثم أعد المحاولة.', 'The router rejected the login. Make sure you pasted the user command in step 2, then retry.'),
      tls: t('خدمة HTTPS في الراوتر ما عندها شهادة صالحة. الصق أمر تفعيل HTTPS تحت، انتظر دقيقة، ثم أعد المحاولة.', 'The router HTTPS service has no valid certificate. Paste the HTTPS command below, wait a minute, then retry.'),
      timeout: unreachable,
      unreachable,
    };
    if (r.error === 'tls') setCloudError('tls');
    setError(msgs[r.error]);
  }

  async function switchToPush() {
    if (routerId) await supabase.from('routers').delete().eq('id', routerId);
    setRouterId(null); setError(null); await choosePush();
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
              <p className="flex gap-2 text-xs text-muted-foreground"><CheckCircle2 className="size-4 shrink-0 text-primary" />{t('ما تحتاج تعرف الإصدار (v6 أو v7). نعرفه تلقائياً من الراوتر.', 'No need to know your version (v6 or v7). We detect it from the router.')}</p>
              <Button type="submit" className="h-12 w-full text-base" disabled={!name.trim()}>{t('التالي', 'Next')}</Button>
            </form>
          )}

          {step === 'method' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2"><BackBtn Back={Back} label={t('رجوع', 'Back')} onClick={() => setStep('basics')} /><Head icon={<Globe2 />} title={t('كيف نتصل بالراوتر؟', 'How should we connect?')} sub={t('اختر واحدة، وتقدر تغيرها لاحقاً.', 'Pick one; you can change it later.')} /></div>
              <MethodCard icon={<Terminal />} badge={t('موصى به', 'Recommended')} title={t('أمر لصق', 'Paste command')} body={t('يعمل حتى لو الإنترنت خلف CGNAT. الراوتر يرسل حالته كل 30 ثانية.', 'Works even behind CGNAT. The router sends its status every 30 seconds.')} onClick={choosePush} disabled={busy} />
              <MethodCard icon={<Cloud />} title="IP Cloud / DDNS" body={t('نتصل بالراوتر عبر اسم IP Cloud ونعرف إصداره تلقائياً. يحتاج RouterOS v7 وعنواناً مفتوحاً (ليس CGNAT).', 'We connect through its IP Cloud name and detect the version. Needs RouterOS v7 and a reachable address (not CGNAT).')} onClick={chooseCloud} disabled={busy} />
              {busy && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t('نجهز...', 'Preparing...')}</p>}
              <Err e={error} />
            </div>
          )}

          {step === 'push' && (
            <div className="space-y-4">
              <Head icon={<Terminal />} title={t('الصق هذا الأمر في الراوتر', 'Paste this into the router')} sub={t('أمر قصير في سطر واحد: انسخ ← الصق في Terminal ← Enter', 'One short line: copy → paste in Terminal → Enter')} />
              <PasteCommandPanel command={command} fallback={fallback} ar={ar} />
              <div role="status" className="flex items-center gap-3 rounded-xl bg-muted p-4 text-sm"><Loader2 className="size-5 shrink-0 animate-spin text-primary" /><span className="flex-1">{t('ننتظر أول إشارة من راوترك... عادة أقل من دقيقة.', 'Waiting for the first signal from your router... usually under a minute.')}</span><bdi dir="ltr" className="tabular-nums text-muted-foreground">{waited}s</bdi></div>
              {waited >= 60 && (
                <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
                  <p className="font-semibold">{t('ما وصلت إشارة بعد؟ تأكد من هذه:', 'No signal yet? Check these:')}</p>
                  <ul className="list-disc space-y-1 ps-5 text-muted-foreground">
                    <li>{t('الراوتر متصل بالإنترنت: جرّب', 'The router has internet: try')} <code dir="ltr">/ping 8.8.8.8</code></li>
                    <li>{t('DNS شغال: جرّب', 'DNS works: try')} <code dir="ltr">/ping mikro.alwahdi.com</code></li>
                    <li>{t('ساعة الراوتر صحيحة (الساعة الخاطئة تفشل اتصال HTTPS):', 'Router clock is correct (a wrong clock breaks HTTPS):')} <code dir="ltr">/system clock print</code></li>
                    <li>{t('لو ظهر خطأ في Terminal استخدم الطريقة البديلة فوق.', 'If Terminal showed an error, use the alternative command above.')}</li>
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t('لن يظهر هذا الأمر مرة ثانية. لا تشاركه مع أحد.', 'This command will not be shown again. Do not share it.')}</p>
            </div>
          )}

          {step === 'cloud' && (
            <div className="space-y-5">
              <Head icon={<Cloud />} title={t('اربط عبر IP Cloud', 'Connect with IP Cloud')} sub={t('اكتب اسم IP Cloud والمنفذ، وننشئ مستخدماً للقراءة فقط. لا نطلب كلمة مرور المدير.', 'Enter the IP Cloud name and port; we use a read-only user. We never ask for the admin password.')} />
              <form className="space-y-5" onSubmit={testCloud}>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">1. {t('عنوان الراوتر', 'Router address')}</p>
                  <div className="flex gap-2" dir="ltr">
                    <div className="flex-1 space-y-1"><Label htmlFor="host" className="text-xs text-muted-foreground">IP Cloud / DDNS</Label><Input id="host" dir="ltr" required autoFocus inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="h-12" placeholder="xxxx.sn.mynetname.net" value={host} onChange={(e) => setHost(e.target.value)} /></div>
                    <div className="w-24 space-y-1"><Label htmlFor="port" className="text-xs text-muted-foreground">{t('المنفذ', 'Port')}</Label><Input id="port" dir="ltr" inputMode="numeric" maxLength={5} className="h-12 text-center" placeholder="443" value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ''))} /></div>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('اترك المنفذ فاضي إذا ما غيّرت منفذ خدمة www-ssl (الافتراضي 443).', 'Leave the port empty if you did not change the www-ssl port (default 443).')}</p>
                  <Hint summary={t('ما تعرف اسم IP Cloud؟', "Don't know your IP Cloud name?")} body={t('الصق هذا في Terminal، وبيطبع الاسم (ويفعّل IP Cloud لو كان مطفي):', 'Paste this in Terminal; it prints the name (and turns IP Cloud on if it was off):')} command={CLOUD_NAME_COMMAND} ar={ar} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">2. {t('أنشئ مستخدم قراءة فقط لـ Mikro', 'Create a read-only user for Mikro')}</p>
                  <p className="text-xs text-muted-foreground">{t('الصقه مرة وحدة في Terminal. يقدر يقرأ الحالة فقط، وما يقدر يغيّر أي إعداد.', 'Paste it once in Terminal. It can only read status and cannot change any setting.')}</p>
                  <Cmd command={command} />
                  <CopyBtn text={command} ar={ar} />
                </div>
                <Button type="submit" className="h-12 w-full text-base" disabled={busy || !host.trim()}>{busy && <Loader2 className="animate-spin" />}{t('اتصل واختبر', 'Connect and test')}</Button>
              </form>
              <Err e={error} />
              <Hint open={cloudError === 'tls'} summary={t('خدمة HTTPS مو مفعّلة أو بدون شهادة؟', 'HTTPS service off or without a certificate?')} body={t('هذا يصدر شهادة لاسم IP Cloud ويفعّل خدمة www-ssl على نفس منفذك:', 'This issues a certificate for the IP Cloud name and turns on www-ssl on your current port:')} command={HTTPS_SETUP_COMMAND} ar={ar} />
              {error && <Button variant="secondary" className="h-11 w-full" onClick={switchToPush}><Terminal />{t('استخدم أمر اللصق بدلاً من ذلك', 'Use the paste command instead')}</Button>}
              <p className="flex gap-2 text-xs text-muted-foreground"><TriangleAlert className="size-4 shrink-0" />{t('هذه الطريقة تفتح منفذ HTTPS للإنترنت. يفضل تقييده بعناوين موثوقة من الجدار الناري.', 'This method exposes the HTTPS port. Restrict it to trusted addresses in the firewall when possible.')}</p>
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
function CopyBtn({ text, ar }: { text: string; ar: boolean }) {
  const [done, setDone] = useState(false);
  return <Button type="button" variant="outline" className="h-11 w-full" onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); }}><Copy />{done ? (ar ? 'تم النسخ ✓' : 'Copied ✓') : (ar ? 'نسخ الأمر' : 'Copy command')}</Button>;
}
function Hint({ summary, body, command, ar, open }: { summary: string; body: string; command: string; ar: boolean; open?: boolean }) {
  return (
    <details className="rounded-lg border border-border p-3 text-sm" open={open || undefined}>
      <summary className="cursor-pointer font-medium text-primary">{summary}</summary>
      <p className="mt-2 text-xs text-muted-foreground">{body}</p>
      <div className="mt-2 space-y-2"><Cmd command={command} /><CopyBtn text={command} ar={ar} /></div>
    </details>
  );
}
function Err({ e }: { e: string | null }) {
  return e ? <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{e}</p> : null;
}
