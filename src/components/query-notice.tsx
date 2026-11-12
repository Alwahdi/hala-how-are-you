import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QueryNotice({ ar, retry, stale = false }: { ar: boolean; retry: () => void; stale?: boolean }) {
  return <div role="alert" className="my-3 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
    <AlertTriangle className="size-4 shrink-0 text-destructive" />
    <span className="min-w-0 flex-1">{ar ? 'تعذر تحديث البيانات. تأكد من اتصالك وحاول مرة أخرى.' : 'Could not update data. Check your connection and retry.'}{stale && <span className="block text-muted-foreground">{ar ? 'المعروض آخر بيانات محفوظة، وليس قراءة حية.' : 'Showing the last saved data, not a live reading.'}</span>}</span>
    <Button variant="outline" className="h-11" onClick={retry}><RefreshCw />{ar ? 'إعادة المحاولة' : 'Retry'}</Button>
  </div>;
}