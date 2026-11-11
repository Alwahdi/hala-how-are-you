import { useEffect, useState } from 'react';
import { Copy, Monitor, Smartphone, TerminalSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Shared paste step: one-line command that works on every RouterOS version, plus where to paste it.
export function PasteCommandPanel({ command, ar }: { command: string; ar: boolean }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return; const id = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(id); }, [copied]);

  return (
    <div className="space-y-3">
      <pre dir="ltr" className="max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-all">{command}</pre>
      <Button className="h-12 w-full text-base" onClick={async () => { await navigator.clipboard.writeText(command); setCopied(true); }}><Copy />{copied ? t('تم النسخ ✓', 'Copied ✓') : t('نسخ الأمر', 'Copy command')}</Button>
      <p className="text-xs text-muted-foreground">{t('سطر واحد يشتغل على v6 وv7. الصقه كما هو واضغط Enter في أي مكان من هذه:', 'One line for v6 and v7. Paste it as is and press Enter in any of these:')}</p>
      <ul className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
        <li className="rounded-lg border border-border p-2"><Monitor className="mx-auto mb-1 size-4 text-primary" />Winbox<br />New Terminal</li>
        <li className="rounded-lg border border-border p-2"><Smartphone className="mx-auto mb-1 size-4 text-primary" />{t('تطبيق MikroTik', 'MikroTik app')}<br />Terminal</li>
        <li className="rounded-lg border border-border p-2"><TerminalSquare className="mx-auto mb-1 size-4 text-primary" />SSH</li>
      </ul>
    </div>
  );
}
