import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { refreshIpCloudRouters } from '@/lib/ip-cloud.functions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { buildPasteCommand, buildRemoveCommand, hashToken, isOnline, newToken } from '@/lib/router-script';
import { Globe2, Plus, Copy, Trash2, LogOut } from 'lucide-react';

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

type Status = { identity?: string; board?: string; version?: string; uptime?: string; cpu?: number; freeMemory?: number; totalMemory?: number; freeHdd?: number; totalHdd?: number; hotspotActive?: number; temperature?: string };

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
      const { data, error } = await supabase.from('routers').select('id, name, ros_version, last_seen_at, last_status, created_at').order('created_at');
      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });
  const navigate = useNavigate();
  const refreshCloud = useServerFn(refreshIpCloudRouters);
  // First visit with no routers: open the guided setup (unless the owner chose "later").
  useEffect(() => {
    if (!isLoading && routers.length === 0 && !sessionStorage.getItem('mikro-onboarding-later')) navigate({ to: '/onboarding', replace: true });
  }, [isLoading, routers.length, navigate]);
  // IP Cloud routers are pulled by us, only while this page is open.
  useEffect(() => {
    const run = () => refreshCloud().then(() => qc.invalidateQueries({ queryKey: ['routers'] })).catch(() => null);
    run(); const id = setInterval(run, 30_000); return () => clearInterval(id);
  }, [refreshCloud, qc]);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [version, setVersion] = useState<'v7' | 'v6'>('v7');
  const [command, setCommand] = useState<string | null>(null);
  const [removeCmd, setRemoveCmd] = useState<{ id: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addRouter(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const token = newToken();
    const { error } = await supabase.from('routers').insert({ owner_id: u.user.id, name: name.trim(), ros_version: version, token_hash: await hashToken(token) });
    if (error) return setError(error.message);
    setCommand(buildPasteCommand(token));
    qc.invalidateQueries({ queryKey: ['routers'] });
  }

  async function copy(text: string) { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  async function deleteRouter(id: string) {
    await supabase.from('routers').delete().eq('id', id);
    setRemoveCmd(null);
    qc.invalidateQueries({ queryKey: ['routers'] });
  }

  function closeAdd() { setAddOpen(false); setCommand(null); setName(''); setCopied(false); setError(null); }

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
                    <p className="text-xs text-muted-foreground" dir="ltr">{[s.board, s.version && `RouterOS ${s.version}`].filter(Boolean).join(' · ') || r.ros_version}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${online ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}`}>
                    {online ? t('● متصل', '● Online') : r.last_seen_at ? t('○ منقطع', '○ Offline') : t('○ بانتظار أول إرسال', '○ Waiting')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{ago(r.last_seen_at, ar)}</p>
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
                <Button variant="ghost" size="sm" className="mt-3 text-destructive" onClick={() => setRemoveCmd({ id: r.id, name: r.name })}><Trash2 />{t('إزالة', 'Remove')}</Button>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={(o) => (o ? setAddOpen(true) : closeAdd())}>
        <DialogContent dir={ar ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{command ? t('الصق هذا الأمر في الراوتر', 'Paste this into the router') : t('أضف راوتر', 'Add router')}</DialogTitle>
            <DialogDescription>{command ? t('افتح Winbox ← New Terminal والصق الأمر. لن يظهر هذا الأمر مرة ثانية.', 'Open Winbox → New Terminal and paste. This command will not be shown again.') : t('الراوتر يرسل حالته فقط، ولا نطلب كلمة مروره.', 'The router only sends its status; we never ask for its password.')}</DialogDescription>
          </DialogHeader>
          {command ? (
            <div className="space-y-3">
              <pre dir="ltr" className="max-h-56 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-all">{command}</pre>
              <Button className="w-full" onClick={() => copy(command)}><Copy />{copied ? t('تم النسخ', 'Copied') : t('نسخ الأمر', 'Copy command')}</Button>
              <p className="text-xs text-muted-foreground">{t('بعد اللصق تظهر حالة الراوتر هنا خلال دقيقة تقريباً.', 'The router should appear online here within about a minute.')}</p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={addRouter}>
              <div className="space-y-2"><Label htmlFor="rname">{t('اسم الراوتر', 'Router name')}</Label><Input id="rname" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('مثلاً: برج الحي', 'e.g. Main tower')} /></div>
              <div className="space-y-2">
                <Label>{t('إصدار RouterOS', 'RouterOS version')}</Label>
                <div className="flex gap-2">{(['v7', 'v6'] as const).map((v) => <Button key={v} type="button" variant={version === v ? 'default' : 'outline'} onClick={() => setVersion(v)}>{v}</Button>)}</div>
                {version === 'v6' && <p className="text-xs text-muted-foreground">{t('يحتاج v6.43 أو أحدث.', 'Requires v6.43 or newer.')}</p>}
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">{t('أنشئ أمر الربط', 'Create connect command')}</Button>
            </form>
          )}
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

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-bold" dir="ltr">{value}</dd></div>;
}
