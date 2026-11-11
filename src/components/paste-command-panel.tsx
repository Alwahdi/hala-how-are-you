import { useEffect, useState } from 'react';
import { Copy, Monitor, Smartphone, TerminalSquare, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = { command: string; fallback: string; ar: boolean };

// Shared paste step: short one-line command, where-to-paste hints, and a one-line fallback.
export function PasteCommandPanel({ command, fallback, ar }: Props) {
  const t = (a: string, b: string) => (ar ? a : b);
  const [showFallback, setShowFallback] = useState(false);
  const [copied, setCopied] = useState<'main' | 'fallback' | null>(null);
  useEffect(() => { if (!copied) return; const id = setTimeout(() => setCopied(null), 2000); return () => clearTimeout(id); }, [copied]);
  async function copy(which: 'main' | 'fallback') { await navigator.clipboard.writeText(which === 'main' ? command : fallback); setCopied(which); }

  return (
    <div className="space-y-3">
      <pre dir="ltr" className="overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-all">{command}</pre>
      <Button className="h-12 w-full text-base" onClick={() => copy('main')}><Copy />{copied === 'main' ? t('تم النسخ ✓', 'Copied ✓') : t('نسخ الأمر', 'Copy command')}</Button>
      <ul className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
        <li className="rounded-lg border border-border p-2"><Monitor className="mx-auto mb-1 size-4 text-primary" />Winbox<br />New Terminal</li>
        <li className="rounded-lg border border-border p-2"><Smartphone className="mx-auto mb-1 size-4 text-primary" />{t('تطبيق MikroTik', 'MikroTik app')}<br />Terminal</li>
        <li className="rounded-lg border border-border p-2"><TerminalSquare className="mx-auto mb-1 size-4 text-primary" />SSH</li>
      </ul>
      <details className="rounded-lg border border-border p-3 text-sm" open={showFallback} onToggle={(e) => setShowFallback((e.target as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer font-medium text-primary">{t('ظهر خطأ أو ما اشتغل؟ استخدم الطريقة البديلة', 'Got an error? Use the alternative command')}</summary>
        <p className="mt-2 flex gap-2 text-xs text-muted-foreground"><TriangleAlert className="size-4 shrink-0" />{t('استخدمها لو ظهر expected end of command أو failure في fetch (مثلاً الراوتر ما يوصل لموقعنا). الأمر أطول لكنه في سطر واحد.', 'Use it if you see "expected end of command" or a fetch failure. It is longer but still one line.')}</p>
        <pre dir="ltr" className="mt-2 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-all">{fallback}</pre>
        <Button variant="outline" className="mt-2 h-11 w-full" onClick={() => copy('fallback')}><Copy />{copied === 'fallback' ? t('تم النسخ ✓', 'Copied ✓') : t('نسخ الأمر البديل', 'Copy alternative')}</Button>
      </details>
    </div>
  );
}
