import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { refreshIpCloudRouters, rotatePushRouter, setRouterRole } from '@/lib/ip-cloud.functions';
import { requestReboot } from '@/lib/alerts.functions';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PasteCommandPanel } from '@/components/paste-command-panel';
import { buildShortCommand } from '@/lib/setup-code';
import { API_ENABLE_COMMAND, buildPasteCommand, buildRemoveCommand, directAccessState, isOnline } from '@/lib/router-script';
import { Globe2, Plus, Copy, Trash2, LogOut, RefreshCw, Loader2, Cloud, AlertTriangle, Power, HeartPulse } from 'lucide-react';

type Status = { apiUser?: number; identity?: string; board?: string; version?: string; uptime?: string; cpu?: number; freeMemory?: number; totalMemory?: number; freeHdd?: number; totalHdd?: number; hotspotActive?: number; temperature?: string; cloudName?: string; sslPort?: string; sslDisabled?: string; behindNat?: string; publicAddress?: string; apiPort?: string; apiDisabled?: string; apiSslPort?: string; apiSslDisabled?: string };
export type { Status as RouterStatus };
type Row = { id: string; name: string; role: string; direct_port: number | null; direct_tls: boolean | null; direct_checked_at?: string | null; ros_version: string; connection_method: string; cloud_host: string | null; last_seen_at: string | null; last_status: unknown; last_check_error: string | null };

const pct = (free?: number, total?: number) => (total ? Math.round(((total - (free ?? 0)) / total) * 100) : null);

function ago(iso: string | null, ar: boolean) {
  if (!iso) return ar ? 'لم يتصل بعد' : 'Never connected';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  const v = s < 60 ? `${s}${ar ? ' ث' : 's'}` : s < 3600 ? `${Math.round(s / 60)}${ar ? ' د' : 'm'}` : `${Math.round(s / 3600)}${ar ? ' س' : 'h'}`;
  return ar ? `آخر تحديث قبل ${v}` : `Updated ${v} ago`;
}

export function NetworkPanel() {
  const { ar } = useLanguage();
  const t = (a: string, b: string) => (ar ? a : b);
  const qc = useQueryClient();
  const { data: routers = [], isLoading } = useQuery({
    queryKey: ['routers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('routers').select('id, name, role, ros_version, connection_method, cloud_host, direct_port, direct_tls, direct_checked_at, last_seen_at, last_status, last_check_error, created_at').order('created_at');
      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });
  const navigate = useNavigate();
  const reboot = useServerFn(requestReboot);
  const [confirmReboot, setConfirmReboot] = useState<{ id: string; name: string } | null>(null);
  const { data: reboots = [] } = useQuery({
    queryKey: ['reboot-jobs'],
    queryFn: async () => { const { data } = await supabase.from('router_jobs').select('router_id, status, requested_at, sent_at, done_at').eq('kind', 'reboot').gte('requested_at', new Date(Date.now() - 20 * 60_000).toISOString()).order('requested_at', { ascending: false }); return data ?? []; },
    refetchInterval: 5_000,
  });
  const saveRole = useServerFn(setRouterRole);
  const refreshCloud = useServerFn(refreshIpCloudRouters);
  const rotate = useServerFn(rotatePushRouter);
  // IP Cloud routers are pulled by us, only while this page is open.
  useEffect(() => {
    const run = () => refreshCloud().then(() => qc.invalidateQueries({ queryKey: ['routers'] })).catch(() => null);
    run(); const id = setInterval(run, 30_000); return () => clearInterval(id);
  }, [refreshCloud, qc]);
  const [reconnect, setReconnect] = useState<{ id: string; name: string; main: string; full?: string | undefined } | null>(null);
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
    { const full = buildPasteCommand(r.token, r.password); setReconnect({ id, name: routerName, main: r.code ? buildShortCommand(r.code) : full, full: r.code ? full : undefined }); }
  }

  async function checkCloudNow(id: string) {
    setBusyId(id);
    await refreshCloud({ data: { id } }).catch(() => null);
    await qc.invalidateQueries({ queryKey: ['routers'] });
    setBusyId(null);
  }

  async function copy(text: string) { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  async function deleteRouter(id: string) {
    await supabase.from('routers').delete().eq('id', id);
    setRemoveCmd(null);
    qc.invalidateQueries({ queryKey: ['routers'] });
  }


  async function changeRole(id: string, role: 'general' | 'balancer' | 'distribution') {
    await saveRole({ data: { id, role } }).catch(() => null);
    qc.invalidateQueries({ queryKey: ['routers'] });
  }

  const list = routers as Row[];
  const onlineCount = list.filter((r) => isOnline(r.last_seen_at)).length;
  const alerts = list.flatMap((r) => routerAlerts(r, ar));

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{t('الراوترات', 'Routers')}</h2>
        <Button variant="outline" className="h-11" onClick={() => navigate({ to: '/onboarding' })}><Plus />{t('أضف راوتر', 'Add router')}</Button>
      </div>
      {isLoading ? <p className="mt-10 text-muted-foreground">{t('جارٍ التحميل...', 'Loading...')}</p> : list.length === 0 ? (
        <div className="app-panel mt-8 p-8 text-center">
          <p className="font-semibold">{t('ما أضفت أي راوتر بعد', 'No routers yet')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('أضف راوتر، انسخ الأمر، والصقه في Terminal.', 'Add a router, copy the command, paste it in Terminal.')}</p>
          <Button className="mt-4 h-11" onClick={() => navigate({ to: '/onboarding' })}><Plus />{t('أضف راوترك الأول', 'Add your first router')}</Button>
        </div>
      ) : (
        <>
          {alerts.length > 0 && (
            <ul className="mt-3 space-y-2">{alerts.map((a) => <li key={a} role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{a}</li>)}</ul>
          )}

          <div className={`mt-4 grid gap-4 ${list.length > 1 ? 'lg:grid-cols-2' : ''}`}>
            {list.map((r) => {
              const s = (r.last_status ?? {}) as Status;
              const online = isOnline(r.last_seen_at);
              const mem = pct(s.freeMemory, s.totalMemory); const hdd = pct(s.freeHdd, s.totalHdd);
              const direct = !!r.cloud_host && !r.last_check_error && !!r.direct_port;
              const access = directAccessState(s);
              return (
                <article key={r.id} className="app-panel p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold">{r.name}</h2>
                      <p className="text-xs text-muted-foreground" dir="ltr">{[s.board, s.version && `RouterOS ${s.version}`].filter(Boolean).join(' · ') || t('الإصدار يظهر بعد أول إشارة', 'Version shows after the first signal')}</p>
                    </div>
                    <StatusChip state={online ? 'online' : r.last_seen_at ? 'offline' : 'waiting'} ar={ar} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{ago(r.last_seen_at, ar)}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">{direct ? <><Cloud className="size-3 text-primary" />{t(`مباشر عبر IP Cloud (${r.direct_port}${r.direct_tls ? ' مشفّر' : ''})`, `Direct via IP Cloud (${r.direct_port}${r.direct_tls ? ' encrypted' : ''})`)}</> : t('عبر الإشارات كل 30 ثانية', 'Via reports every 30s')}</span>
                    <label className="inline-flex items-center gap-1">
                      <span className="sr-only">{t('دور الراوتر', 'Router role')}</span>
                      <select value={r.role} onChange={(e) => changeRole(r.id, e.target.value as 'general')} className="h-8 rounded-full border border-border bg-background px-2 text-xs">
                        <option value="general">{t('عام', 'General')}</option>
                        <option value="balancer">{t('دمج خطوط', 'Load balancing')}</option>
                        <option value="distribution">{t('توزيع', 'Distribution')}</option>
                      </select>
                    </label>
                  </div>

                  {(() => {
                    const j = reboots.find((x) => x.router_id === r.id);
                    if (!j) return null;
                    const secs = j.done_at && j.sent_at ? Math.round((new Date(j.done_at).getTime() - new Date(j.sent_at).getTime()) / 1000) : null;
                    return <p role="status" className="mt-3 flex items-center gap-2 rounded-lg bg-primary/5 p-3 text-sm">{j.status === 'pending' ? <><Loader2 className="size-4 animate-spin text-primary" />{t('ننتظر الراوتر يستلم أمر إعادة التشغيل (خلال 30 ثانية)...', 'Waiting for the router to pick up the restart (within 30 seconds)...')}</> : j.status === 'sent' ? <><Loader2 className="size-4 animate-spin text-primary" />{t('الراوتر يعيد التشغيل... يرجع عادة خلال دقيقة.', 'Restarting... usually back within a minute.')}</> : j.status === 'done' ? <><Power className="size-4 text-primary" />{secs != null ? t(`رجع يشتغل بعد ${secs} ثانية ✓`, `Back up after ${secs} seconds ✓`) : t('تمت إعادة التشغيل ✓', 'Restarted ✓')}</> : <><AlertTriangle className="size-4 text-destructive" />{t('ما استلم الراوتر الأمر (غير متصل).', 'The router did not pick it up (offline).')}</>}</p>;
                  })()}
                  {!!r.last_status && (
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                      <Stat label={t('المعالج', 'CPU')} value={s.cpu == null ? '-' : `${s.cpu}%`} meter={s.cpu} />
                      <Stat label={t('الذاكرة', 'Memory')} value={mem == null ? '-' : `${mem}%`} meter={mem} />
                      <Stat label={t('المساحة', 'Storage')} value={hdd == null ? '-' : `${hdd}%`} meter={hdd} />
                      <Stat label={t('متصلون بالهوتسبوت', 'Hotspot users')} value={String(s.hotspotActive ?? 0)} />
                      <Stat label={t('مدة التشغيل', 'Uptime')} value={s.uptime ?? '-'} />
                      <Stat label={t('الحرارة', 'Temperature')} value={s.temperature ? `${s.temperature}°C` : '-'} />
                    </dl>
                  )}

                  {!direct && access === 'needs_api' && (
                    <div className="mt-4 space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
                      <p className="flex items-center gap-2 font-semibold"><Cloud className="size-4 text-primary" />{t('راوترك عليه IP عام وIP Cloud — باقي خطوة للاتصال المباشر', 'Public IP and IP Cloud found — one step to direct access')}</p>
                      <p className="text-xs text-muted-foreground">{t('خدمة API مطفية في الراوتر. الصق هذا السطر مرة واحدة ونتصل تلقائياً خلال دقيقة.', 'The API service is off on the router. Paste this once and we connect automatically within a minute.')}</p>
                      <Button variant="outline" className="h-11 w-full" onClick={() => copy(API_ENABLE_COMMAND + '\n')}><Copy />{copied ? t('تم النسخ ✓', 'Copied ✓') : t('نسخ أمر تشغيل API', 'Copy API command')}</Button>
                    </div>
                  )}
                  {!direct && access === 'ready' && !r.last_check_error && (
                    <p role="status" className="mt-3 flex items-center gap-2 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground"><Loader2 className="size-4 shrink-0 animate-spin text-primary" />{t('راوترك عليه IP عام وIP Cloud شغال — نتصل به مباشرة تلقائياً، بدون أي إدخال منك.', 'Public IP and IP Cloud found — connecting directly on our own, nothing to type.')}</p>
                  )}
                  {!direct && access === 'ready' && r.last_check_error && (
                    <div role="alert" className="mt-3 space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                      <p className="flex items-start gap-2 font-semibold"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />{t('الاتصال المباشر عبر IP Cloud ما اشتغل بعد', 'Direct IP Cloud link is not working yet')}</p>
                      <p className="text-xs text-muted-foreground">{cloudError(r.last_check_error, ar)}</p>
                      <p className="text-xs text-muted-foreground">{t('نعيد المحاولة تلقائياً كل 3 دقائق. الإشارات شغالة كاحتياط.', 'We retry on our own every 3 minutes. Reports keep working as backup.')}</p>
                      {(r.last_check_error === 'auth' || r.last_check_error === 'no_user')
                        ? <Button className="h-11 w-full" disabled={busyId === r.id} onClick={() => startReconnect(r.id, r.name)}>{busyId === r.id ? <Loader2 className="animate-spin" /> : <RefreshCw />}{t('إعادة الربط (مرة واحدة)', 'Reconnect (once)')}</Button>
                        : <Button variant="outline" className="h-11 w-full" disabled={busyId === r.id} onClick={() => checkCloudNow(r.id)}>{busyId === r.id ? <Loader2 className="animate-spin" /> : <RefreshCw />}{t('جرّب الآن', 'Try now')}</Button>}
                    </div>
                  )}
                  {!online && (
                    <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                      {r.last_seen_at ? t('الراوتر توقف عن الإرسال. لو انطفى أو انمسح منه السكربت، اضغط «إعادة الربط» والصق الأمر من جديد.', 'The router stopped reporting. If it was reset or the script was removed, tap Reconnect and paste the command again.')
                        : t('ما وصلت أول إشارة بعد. اضغط «إعادة الربط» لعرض أمر اللصق.', 'No first signal yet. Tap Reconnect to show the paste command.')}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {direct && <Button variant="outline" className="h-11" disabled={busyId === r.id} onClick={() => checkCloudNow(r.id)}>{busyId === r.id ? <Loader2 className="animate-spin" /> : <RefreshCw />}{t('تحديث الآن', 'Refresh now')}</Button>}
                    <Button variant="outline" className="h-11" disabled={!online} onClick={() => setConfirmReboot({ id: r.id, name: r.name })}><Power />{t('إعادة تشغيل', 'Restart')}</Button>
                    <Button variant="ghost" className="h-11" asChild><Link to="/health"><HeartPulse />{t('الصحة', 'Health')}</Link></Button>
                    <Button variant={online ? 'outline' : 'default'} className="h-11" disabled={busyId === r.id} onClick={() => startReconnect(r.id, r.name)}>{busyId === r.id ? <Loader2 className="animate-spin" /> : <RefreshCw />}{t('إعادة الربط', 'Reconnect')}</Button>
                    <Button variant="ghost" className="h-11 text-destructive" onClick={() => setRemoveCmd({ id: r.id, name: r.name })}><Trash2 />{t('إزالة', 'Remove')}</Button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Dialog open={!!reconnect} onOpenChange={(o) => !o && setReconnect(null)}>
        <DialogContent dir={ar ? 'rtl' : 'ltr'} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('إعادة ربط', 'Reconnect')} {reconnect?.name}</DialogTitle>
            <DialogDescription>{t('الصق هذا الأمر في Terminal. الأمر القديم توقف عن العمل، وهذا يستبدله.', 'Paste this into Terminal. The old command no longer works; this replaces it.')}</DialogDescription>
          </DialogHeader>
          {reconnect && <PasteCommandPanel command={reconnect.main} full={reconnect.full} ar={ar} />}
          {reconnect && (() => {
            const r = routers.find((x) => x.id === reconnect.id);
            const on = r ? isOnline(r.last_seen_at) && Date.now() - new Date(r.last_seen_at!).getTime() < 60_000 : false;
            const rs = (r?.last_status ?? {}) as Status;
            const linked = !!r?.direct_port && !r?.last_check_error;
            return (
              <div role="status" className="space-y-2 rounded-xl bg-muted p-3 text-sm">
                <p className="flex items-center gap-3">{on ? <><StatusChip state="online" ar={ar} />{t('وصلت إشارة من الراوتر.', 'Signal received from the router.')}</> : <><Loader2 className="size-4 animate-spin text-primary" />{t('ننتظر إشارة من الراوتر...', 'Waiting for a signal from the router...')}</>}</p>
                {on && directAccessState(rs) === 'ready' && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">{linked ? <><Cloud className="size-4 text-primary" />{t(`اتصال مباشر عبر IP Cloud شغال (${r?.direct_port}).`, `Direct IP Cloud link working (${r?.direct_port}).`)}</> : r?.last_check_error ? <><AlertTriangle className="size-4 text-destructive" />{cloudError(r.last_check_error, ar)}</> : <><Loader2 className="size-4 animate-spin text-primary" />{t('نتصل مباشرة عبر IP Cloud...', 'Connecting directly via IP Cloud...')}</>}</p>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmReboot} onOpenChange={(o) => !o && setConfirmReboot(null)}>
        <DialogContent dir={ar ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('إعادة تشغيل', 'Restart')} {confirmReboot?.name}؟</DialogTitle>
            <DialogDescription>{t('كل المتصلين ينقطعون حوالي دقيقة ثم يرجعون تلقائياً. يصلك تنبيه لما يرجع الراوتر.', 'Everyone is disconnected for about a minute, then reconnects. You get an alert when the router is back.')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11" onClick={() => setConfirmReboot(null)}>{t('إلغاء', 'Cancel')}</Button>
            <Button variant="destructive" className="h-11" onClick={async () => { const id = confirmReboot!.id; setConfirmReboot(null); await reboot({ data: { id } }).catch(() => null); qc.invalidateQueries({ queryKey: ['reboot-jobs'] }); }}><Power />{t('أعد التشغيل', 'Restart now')}</Button>
          </div>
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
    </div>
  );
}

export function routerAlerts(r: Row, ar: boolean): string[] {
  const s = (r.last_status ?? {}) as Status; const out: string[] = [];
  if (r.last_seen_at && !isOnline(r.last_seen_at)) out.push(ar ? `${r.name}: ما أرسل إشارة من ${Math.round((Date.now() - new Date(r.last_seen_at).getTime()) / 60000)} دقيقة` : `${r.name}: no signal for ${Math.round((Date.now() - new Date(r.last_seen_at).getTime()) / 60000)} min`);
  const mem = pct(s.freeMemory, s.totalMemory);
  if (mem != null && mem >= 90) out.push(ar ? `${r.name}: الذاكرة شبه ممتلئة (${mem}%)` : `${r.name}: memory almost full (${mem}%)`);
  if ((s.cpu ?? 0) >= 90) out.push(ar ? `${r.name}: المعالج مضغوط (${s.cpu}%)` : `${r.name}: CPU under load (${s.cpu}%)`);
  return out;
}

function cloudError(code: string, ar: boolean) {
  const m: Record<string, [string, string]> = {
    tls: ['المنفذ المشفّر 8729 رفض الاتصال، وما قدرنا نكمل على 8728.', 'Encrypted 8729 refused and 8728 did not work either.'],
    old_login: ['إصدار الراوتر قديم جداً (قبل 6.43). حدّث RouterOS للاتصال المباشر.', 'RouterOS is too old (before 6.43). Update it for direct access.'],
    auth: ['الراوتر رفض دخول مستخدم القراءة mikro-read — كلمة سره قديمة من أمر سابق. اضغط «إعادة الربط» والصق الأمر الجديد مرة واحدة.', 'The router rejected the read-only user mikro-read — its password is from an older command. Tap Reconnect and paste the new command once.'],
    no_user: ['مستخدم القراءة mikro-read غير موجود في الراوتر. اضغط «إعادة الربط» والصق الأمر الجديد مرة واحدة.', 'The read-only user mikro-read is not on the router. Tap Reconnect and paste the new command once.'],
    timeout: ['الراوتر ما رد على منفذ API عبر IP Cloud. تأكد أن الجدار الناري ما يحجب 8728/8729 من الإنترنت. الإشارات شغالة كاحتياط.', 'No reply on the API port via IP Cloud. Check the firewall does not block 8728/8729. Reports keep working as backup.'],
    unreachable: ['ما قدرنا نوصل لمنفذ API عبر IP Cloud. تأكد أن خدمة api شغالة وغير مقيدة بعناوين محددة. الإشارات شغالة كاحتياط.', 'Could not reach the API via IP Cloud. Check the api service is on and not limited to certain addresses. Reports keep working as backup.'],
  };
  const v = m[code] ?? m['unreachable']!;
  return ar ? v[0] : v[1];
}

function StatusChip({ state, ar }: { state: 'online' | 'offline' | 'waiting'; ar: boolean }) {
  const label = { online: ar ? 'متصل' : 'Online', offline: ar ? 'غير متصل' : 'Offline', waiting: ar ? 'بانتظار أول إشارة' : 'Waiting' }[state];
  const tone = { online: 'bg-primary/15 text-primary', offline: 'bg-destructive/15 text-destructive', waiting: 'bg-muted text-muted-foreground' }[state];
  const dot = { online: 'bg-primary animate-pulse', offline: 'bg-destructive', waiting: 'bg-muted-foreground' }[state];
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tone}`}><span aria-hidden className={`size-2 rounded-full ${dot}`} />{label}</span>;
}

function Stat({ label, value, meter }: { label: string; value: string; meter?: number | null | undefined }) {
  return <div className="stat-tile"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-bold" dir="ltr">{value}</dd>{meter != null && <div className="meter mt-2" data-tone={meter >= 85 ? 'warn' : undefined} aria-hidden><span style={{ width: `${Math.min(100, meter)}%` }} /></div>}</div>;
}
