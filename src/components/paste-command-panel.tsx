import { useEffect, useState } from 'react';
import { ChevronDown, Copy, Monitor, Smartphone, TerminalSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Shared paste step: a short one-line command (the router downloads its own setup), plus the full command as a fallback.
export function PasteCommandPanel({ command, full, ar }: { command: string; full?: string; ar: boolean }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const [copied, setCopied] = useState<'short' | 'full' | null>(null);
  useEffect(() => { if (!copied) return; const id = setTimeout(() => setCopied(null), 2000); return () => clearTimeout(id); }, [copied]);
  const copy = async (text: string, which: 'short' | 'full') => { await navigator.clipboard.writeText(text + '\n'); setCopied(which); };

  return (
    <div className="space-y-3">
      <pre dir="ltr" className="overflow-auto rounded-lg bg-muted p-3 text-sm leading-relaxed whitespace-pre-wrap break-all">{command}</pre>
      <Button className="h-12 w-full text-base" onClick={() => copy(command, 'short')}><Copy />{copied === 'short' ? t('تم النسخ ✓', 'Copied ✓') : t('نسخ الأمر', 'Copy command')}</Button>
      <p className="text-xs text-muted-foreground">{full
        ? t('أمر قصير يشتغل على v6 وv7: الراوتر ينزّل إعداده من Mikro ويثبّته بنفسه خلال ثوانٍ. صالح لمدة ساعة. الصقه في أي مكان من هذه:', 'A short command for v6 and v7: the router downloads its setup from Mikro and installs it in seconds. Valid for one hour. Paste it in any of these:')
        : t('سطر واحد يشتغل على v6 وv7، ويتنفذ لحاله أول ما تلصقه. لو ما بدأ، اضغط Enter مرة. الصقه في أي مكان من هذه:', 'One line for v6 and v7 that runs as soon as you paste it. If it does not start, press Enter once. Paste it in any of these:')}</p>
      <ul className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
        <li className="rounded-lg border border-border p-2"><Monitor className="mx-auto mb-1 size-4 text-primary" />Winbox<br />New Terminal</li>
        <li className="rounded-lg border border-border p-2"><Smartphone className="mx-auto mb-1 size-4 text-primary" />{t('تطبيق MikroTik', 'MikroTik app')}<br />Terminal</li>
        <li className="rounded-lg border border-border p-2"><TerminalSquare className="mx-auto mb-1 size-4 text-primary" />SSH</li>
      </ul>
      {full && (
        <details className="group rounded-lg border border-border p-3 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />{t('الراوتر ما عنده إنترنت أو ظهر خطأ في التنزيل؟', 'Router has no internet or the download failed?')}
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">{t('استخدم الأمر الكامل بدلاً منه. طويل، لكنه ما يحتاج تنزيل.', 'Use the full command instead. It is long but needs no download.')}</p>
          <Button variant="outline" className="mt-2 h-11 w-full" onClick={() => copy(full, 'full')}><Copy />{copied === 'full' ? t('تم النسخ ✓', 'Copied ✓') : t('نسخ الأمر الكامل', 'Copy the full command')}</Button>
        </details>
      )}
    </div>
  );
}
