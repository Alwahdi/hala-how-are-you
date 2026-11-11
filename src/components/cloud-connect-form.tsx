import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Copy, Loader2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { connectIpCloudRouter } from '@/lib/ip-cloud.functions';
import { HTTPS_SETUP_COMMAND } from '@/lib/ip-cloud';

type Props = { routerId: string; ar: boolean; defaultHost?: string | undefined; defaultPort?: string | undefined; httpsOff?: boolean | undefined; onConnected: () => void; onReconnect: () => void };

// Direct IP Cloud connection for a router that already reports through the paste command.
export function CloudConnectForm({ routerId, ar, defaultHost, defaultPort, httpsOff, onConnected, onReconnect }: Props) {
  const t = (a: string, b: string) => (ar ? a : b);
  const connect = useServerFn(connectIpCloudRouter);
  const [host, setHost] = useState(defaultHost ?? '');
  const [port, setPort] = useState(defaultPort && defaultPort !== '443' ? defaultPort : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showHttps, setShowHttps] = useState(!!httpsOff);
  const [needsUser, setNeedsUser] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null); setNeedsUser(false);
    const r = await connect({ data: { id: routerId, host, port } }).catch(() => ({ ok: false as const, error: 'unreachable' as const }));
    setBusy(false);
    if (r.ok) return onConnected();
    const p = host.match(/:(\d+)\s*$/)?.[1] || port || '443';
    const unreachable = t(`ما وصلنا للراوتر على المنفذ ${p}. تأكد من المنفذ، وأن خدمة HTTPS مفعّلة، وأن الإنترنت ليس خلف CGNAT. الراوتر يظل متصل بأمر اللصق.`, `We could not reach the router on port ${p}. Check the port, that HTTPS is on, and that the line is not behind CGNAT. The router stays connected through the paste command.`);
    const msgs: Record<string, string> = {
      invalid_host: t('اكتب اسم IP Cloud مثل xxxx.sn.mynetname.net، ومنفذ بين 1 و65535.', 'Enter an IP Cloud name like xxxx.sn.mynetname.net and a port between 1 and 65535.'),
      auth: t('الراوتر رفض مستخدم Mikro. اضغط «إعادة الربط» والصق الأمر الجديد مرة وحدة، ثم جرّب.', 'The router rejected the Mikro user. Tap Reconnect, paste the new command once, then retry.'),
      no_user: t('هذا الراوتر انربط بأمر قديم بدون مستخدم القراءة. اضغط «إعادة الربط» والصق الأمر الجديد مرة وحدة.', 'This router was linked with an older command without the read-only user. Tap Reconnect and paste the new command once.'),
      tls: t('خدمة HTTPS ما عندها شهادة صالحة. الصق أمر HTTPS تحت، انتظر دقيقة، ثم جرّب.', 'HTTPS has no valid certificate. Paste the HTTPS command below, wait a minute, then retry.'),
      timeout: unreachable, unreachable,
    };
    if (r.error === 'tls' || r.error === 'timeout' || r.error === 'unreachable') setShowHttps(true);
    if (r.error === 'auth' || r.error === 'no_user') setNeedsUser(true);
    setErr(msgs[r.error] ?? unreachable);
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="flex gap-2" dir="ltr">
        <div className="flex-1 space-y-1"><Label htmlFor="cc-host" className="text-xs text-muted-foreground">IP Cloud / DDNS</Label><Input id="cc-host" dir="ltr" required inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="h-12" placeholder="xxxx.sn.mynetname.net" value={host} onChange={(e) => setHost(e.target.value)} /></div>
        <div className="w-24 space-y-1"><Label htmlFor="cc-port" className="text-xs text-muted-foreground">{t('المنفذ', 'Port')}</Label><Input id="cc-port" dir="ltr" inputMode="numeric" maxLength={5} className="h-12 text-center" placeholder="443" value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ''))} /></div>
      </div>
      <p className="text-xs text-muted-foreground">{t('عبّيناها من الراوتر. غيّر المنفذ لو حوّلته في الجدار الناري لمنفذ ثاني.', 'Filled from the router. Change the port if you forward a different one in the firewall.')}</p>
      <Button type="submit" className="h-12 w-full text-base" disabled={busy || !host.trim()}>{busy && <Loader2 className="animate-spin" />}{t('اتصل واختبر', 'Connect and test')}</Button>
      {err && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
      {needsUser && <Button type="button" variant="secondary" className="h-11 w-full" onClick={onReconnect}>{t('إعادة الربط', 'Reconnect')}</Button>}
      {showHttps && (
        <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
          <p className="font-medium">{t('خدمة HTTPS مو مفعّلة أو بدون شهادة؟', 'HTTPS off or without a certificate?')}</p>
          <p className="text-xs text-muted-foreground">{t('هذا يصدر شهادة لاسم IP Cloud ويفعّل www-ssl على نفس منفذك:', 'This issues a certificate for the IP Cloud name and turns on www-ssl on your current port:')}</p>
          <pre dir="ltr" className="overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-all">{HTTPS_SETUP_COMMAND}</pre>
          <Button type="button" variant="outline" className="h-11 w-full" onClick={async () => { await navigator.clipboard.writeText(HTTPS_SETUP_COMMAND); setCopied(true); setTimeout(() => setCopied(false), 2000); }}><Copy />{copied ? t('تم النسخ ✓', 'Copied ✓') : t('نسخ الأمر', 'Copy command')}</Button>
        </div>
      )}
      <p className="flex gap-2 text-xs text-muted-foreground"><TriangleAlert className="size-4 shrink-0" />{t('الاتصال المباشر يحتاج منفذ HTTPS مفتوح للإنترنت. يفضل تقييده بعناوين موثوقة من الجدار الناري.', 'Direct access needs the HTTPS port open to the internet. Restrict it to trusted addresses when possible.')}</p>
    </form>
  );
}
