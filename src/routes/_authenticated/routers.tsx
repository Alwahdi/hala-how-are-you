import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { refreshIpCloudRouters, rotatePushRouter } from '@/lib/ip-cloud.functions';
import { CloudConnectForm } from '@/components/cloud-connect-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PasteCommandPanel } from '@/components/paste-command-panel';
import { buildPasteCommand, buildRemoveCommand, isOnline } from '@/lib/router-script';
import { Globe2, Plus, Copy, Trash2, LogOut, RefreshCw, Loader2, Cloud } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/routers')({
  head: () => ({ meta: [
    { title: 'Mikro — راوتراتي' },
    { name: 'description', content: 'Live status of your connected MikroTik routers.' },
    { property: 'og:title', content: 'Mikro — My routers' },
    { property: 'og:description', content: 'Live status of connected MikroTik routers.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: RoutersPage,
});

type Status = { identity?: string; board?: string; version?: string; uptime?: string; cpu?: number; freeMemory?: number; totalMemory?: number; freeHdd?: number; totalHdd?: number; hotspotActive?: number; temperature?: string; cloudName?: string; sslPort?: string; sslDisabled?: string };

const pct = (free?: number, total?: number) => (total ? Math.round(((total - (free ?? 0)) / total) * 100) : null);

function ago(iso: string | null, ar: boolean) {
  if (!iso) return ar ? 'لم يتصل بعد' : 'Never connected';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  const v = s < 60 ? `${s}${ar ? ' ث' : 's'}` : s < 3600 ? `${Math.round(s / 60)}${ar ? ' د' : 'm'}` : `${Math.round(s / 3600)}${ar ? ' س' : 'h'}`;
  return ar ? `آخر تحديث قبل ${v}` : `Updated ${v} ago`;
}

function RoutersPage() {
  const { ar, toggleLanguage } = useLanguage();
  const t = (a: string, b: string) => (ar ? a : b);
  const qc = useQueryClient();
  const { data: routers = [], isLoading } = useQuery({
    queryKey: ['routers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('routers').select('id, name, ros_version, connection_method, cloud_host, last_seen_at, last_status, last_check_error, created_at').order('created_at');
      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });
  const navigate = useNavigate();
  const refreshCloud = useServerFn(refreshIpCloudRouters);
  const rotate = useServerFn(rotatePushRouter);
  // First visit with no routers: open the guided setup (unless the owner chose "later").
  useEffect(() => {
    if (!isLoading && routers.length === 0 && !sessionStorage.getItem('mikro-onboarding-later')) navigate({ to: '/onboarding', replace: true });
  }, [isLoading, routers.length, navigate]);
  // IP Cloud routers are pulled by us, only while this page is open.
  useEffect(() => {
    const run = () => refreshCloud().then(() => qc.invalidateQueries({ queryKey: ['routers'] })).catch(() => null);
    run(); const id = setInterval(run, 30_000); return () => clearInterval(id);
  }, [refreshCloud, qc]);
  const [reconnect, setReconnect] = useState<{ id: string; name: string; main: string } | null>(null);
  const [cloudFor, setCloudFor] = useState<{ id: string; name: string; status: Status } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removeCmd, setRemoveCmd] = useState<{ id: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Issue a fresh token so the owner gets a new paste command; the old one stops working.
  async function startReconnect(id: string, routerName: string) {
    setBusyId(id); setError(null);
    const r = await rotate({ data: { id } }).catch(() => ({ ok: false as const }));
    setBusyId(null);
    if (!r.ok) return setError(t('ما قدرنا نجهز أمر الربط. حاول مرة ثانية.', 'Could not prepare the command. Try again.'));
    setCloudFor(null);
    setReconnect({ id, name: routerName, main: buildPasteCommand(r.token, r.password) });
  }

  async function checkCloudNow(id: string) {
    setBusyId(id);
    await refreshCloud().catch(() => null);
    await qc.invalidateQueries({ queryKey: ['routers'] });
    setBusyId(null);
  }

  async function copy(text: string) { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  async function deleteRouter(id: string) {
    await supabase.from('routers').delete().eq('id', id);
    setRemoveCmd(null);
    qc.invalidateQueries({ queryKey: ['routers'] });
  }


  return (
    <main className="landing-width min-h-screen py-8" lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('راوتراتي', 'My routers')}</h1>
          <p className="text-sm text-muted-foreground">{t('كل راوتر يرسل حالته كل 30 ثانية. تجربة داخلية.', 'Each router reports every 30 seconds. Internal test.')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" aria-label={ar ? 'English' : 'العربية'} onClick={toggleLanguage}><Globe2 /></Button>
          <Button variant="ghost" size="icon" aria-label={t('خروج', 'Sign out')} onClick={() => supabase.auth.signOut().then(() => location.assign('/auth'))}><LogOut /></Button>
          <Button onClick={() => navigate({ to: '/onboarding' })}><Plus />{t('أضف راوتر', 'Add router')}</Button>
        </div>
      </header>

      {isLoading ? <p className="mt-10 text-muted-foreground">{t('جارٍ التحميل...', 'Loading...')}</p> : routers.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-semibold">{t('ما أضفت أي راوتر بعد', 'No routers yet')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('أضف راوتر، انسخ الأمر، والصقه في Terminal داخل Winbox.', 'Add a router, copy the command, paste it in the Winbox Terminal.')}</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {routers.map((r) => {
            const s = (r.last_status ?? {}) as Status;
            const online = isOnline(r.last_seen_at);
            const mem = pct(s.freeMemory, s.totalMemory); const hdd = pct(s.freeHdd, s.totalHdd);
            return (
              <article key={r.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold">{r.name}</h2>
                    <p className="text-xs text-muted-foreground" dir="ltr">{[s.board, s.version && `RouterOS ${s.version}`].filter(Boolean).join(' · ') || t('الإصدار يظهر بعد أول إشارة', 'Version shows after the first signal')}</p>
                  </div>
                  <StatusChip state={online ? 'online' : r.last_seen_at ? 'offline' : 'waiting'} ar={ar} />
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{ago(r.last_seen_at, ar)}{r.cloud_host && !r.last_check_error && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary"><Cloud className="size-3" />{t('مباشر عبر IP Cloud', 'Direct via IP Cloud')}</span>}</p>
                {!r.cloud_host && s.cloudName && s.version?.startsWith('7') && (
                  <button type="button" onClick={() => setCloudFor({ id: r.id, name: r.name, status: s })} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3 text-start text-sm hover:bg-primary/10">
                    <Cloud className="size-5 shrink-0 text-primary" />
                    <span className="flex-1"><b className="block">{t('IP Cloud مفعّل في هذا الراوتر', 'IP Cloud is on for this router')}</b><span className="text-xs text-muted-foreground">{t('اضغط للاتصال المباشر وتحديث أسرع', 'Tap for direct, faster updates')}</span></span>
                  </button>
                )}
                {r.last_status && (
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Stat label={t('المعالج', 'CPU')} value={`${s.cpu ?? '-'}%`} />
                    <Stat label={t('الذاكرة', 'Memory')} value={mem == null ? '-' : `${mem}%`} />
                    <Stat label={t('المساحة', 'Storage')} value={hdd == null ? '-' : `${hdd}%`} />
                    <Stat label={t('متصلون بالهوتسبوت', 'Hotspot users')} value={String(s.hotspotActive ?? 0)} />
                    <Stat label={t('مدة التشغيل', 'Uptime')} value={s.uptime ?? '-'} />
                    <Stat label={t('الحرارة', 'Temperature')} value={s.temperature ? `${s.temperature}°C` : '-'} />
                  </dl>
                )}
                {!online && (
                  <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                    {r.connection_method === 'ip_cloud'
                      ? (r.last_check_error ? t('ما قدرنا نوصل للراوتر عبر IP Cloud. تأكد أنه شغال ومتصل بالإنترنت.', 'We could not reach the router via IP Cloud. Check it is on and online.') : t('نتحقق من الراوتر كل 30 ثانية وهذه الصفحة مفتوحة.', 'We check the router every 30 seconds while this page is open.'))
                      : r.last_seen_at ? t('الراوتر توقف عن الإرسال. لو انطفى أو انمسح منه السكربت، اضغط «إعادة الربط» والصق الأمر من جديد.', 'The router stopped reporting. If it was reset or the script was removed, tap Reconnect and paste the command again.')
                      : t('ما وصلت أول إشارة بعد. اضغط «إعادة الربط» لعرض أمر اللصق.', 'No first signal yet. Tap Reconnect to show the paste command.')}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.cloud_host && (
                    <Button variant="outline" className="h-11" disabled={busyId === r.id} onClick={() => checkCloudNow(r.id)}>{busyId === r.id ? <Loader2 className="animate-spin" /> : <Cloud />}{t('تحقق الآن', 'Check now')}</Button>
                  )}
                  {r.connection_method === 'ip_cloud' ? null : (
                    <Button variant={online ? 'outline' : 'default'} className="h-11" disabled={busyId === r.id} onClick={() => startReconnect(r.id, r.name)}>{busyId === r.id ? <Loader2 className="animate-spin" /> : <RefreshCw />}{t('إعادة الربط', 'Reconnect')}</Button>
                  )}
                  <Button variant="ghost" className="h-11 text-destructive" onClick={() => setRemoveCmd({ id: r.id, name: r.name })}><Trash2 />{t('إزالة', 'Remove')}</Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Dialog open={!!reconnect} onOpenChange={(o) => !o && setReconnect(null)}>
        <DialogContent dir={ar ? 'rtl' : 'ltr'} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('إعادة ربط', 'Reconnect')} {reconnect?.name}</DialogTitle>
            <DialogDescription>{t('الصق هذا الأمر في Terminal. الأمر القديم توقف عن العمل، وهذا يستبدله.', 'Paste this into Terminal. The old command no longer works; this replaces it.')}</DialogDescription>
          </DialogHeader>
          {reconnect && <PasteCommandPanel command={reconnect.main} ar={ar} />}
          {reconnect && (() => {
            const r = routers.find((x) => x.id === reconnect.id);
            const on = r ? isOnline(r.last_seen_at) && Date.now() - new Date(r.last_seen_at!).getTime() < 60_000 : false;
            return <div role="status" className="flex items-center gap-3 rounded-xl bg-muted p-3 text-sm">{on ? <><StatusChip state="online" ar={ar} />{t('وصلت إشارة من الراوتر.', 'Signal received from the router.')}</> : <><Loader2 className="size-4 animate-spin text-primary" />{t('ننتظر إشارة من الراوتر...', 'Waiting for a signal from the router...')}</>}</div>;
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!cloudFor} onOpenChange={(o) => !o && setCloudFor(null)}>
        <DialogContent dir={ar ? 'rtl' : 'ltr'} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('اتصال مباشر عبر IP Cloud', 'Direct IP Cloud connection')} · {cloudFor?.name}</DialogTitle>
            <DialogDescription>{t('نستخدم مستخدم القراءة فقط اللي أنشأه أمر اللصق. الراوتر يظل متصل بأمر اللصق كاحتياط.', 'We use the read-only user created by the paste command. The paste command stays on as a backup.')}</DialogDescription>
          </DialogHeader>
          {cloudFor && <CloudConnectForm routerId={cloudFor.id} ar={ar} defaultHost={cloudFor.status.cloudName} defaultPort={cloudFor.status.sslPort} httpsOff={cloudFor.status.sslDisabled === 'true'} onConnected={() => { setCloudFor(null); qc.invalidateQueries({ queryKey: ['routers'] }); }} onReconnect={() => cloudFor && startReconnect(cloudFor.id, cloudFor.name)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeCmd} onOpenChange={(o) => !o && setRemoveCmd(null)}>
        <DialogContent dir={ar ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('إزالة', 'Remove')} {removeCmd?.name}</DialogTitle>
            <DialogDescription>{t('الصق هذا في الراوتر لإيقاف الإرسال، ثم احذفه من Mikro.', 'Paste this into the router to stop reporting, then remove it from Mikro.')}</DialogDescription>
          </DialogHeader>
          <pre dir="ltr" className="rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">{buildRemoveCommand()}</pre>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => copy(buildRemoveCommand())}><Copy />{copied ? t('تم النسخ', 'Copied') : t('نسخ', 'Copy')}</Button>
            <Button variant="destructive" onClick={() => removeCmd && deleteRouter(removeCmd.id)}><Trash2 />{t('احذف من Mikro', 'Remove from Mikro')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function StatusChip({ state, ar }: { state: 'online' | 'offline' | 'waiting'; ar: boolean }) {
  const label = { online: ar ? 'متصل' : 'Online', offline: ar ? 'غير متصل' : 'Offline', waiting: ar ? 'بانتظار أول إشارة' : 'Waiting' }[state];
  const tone = { online: 'bg-primary/15 text-primary', offline: 'bg-destructive/15 text-destructive', waiting: 'bg-muted text-muted-foreground' }[state];
  const dot = { online: 'bg-primary animate-pulse', offline: 'bg-destructive', waiting: 'bg-muted-foreground' }[state];
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tone}`}><span aria-hidden className={`size-2 rounded-full ${dot}`} />{label}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-bold" dir="ltr">{value}</dd></div>;
}
