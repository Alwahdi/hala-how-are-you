import { Ban, CheckCircle2, Copy, Loader2, MessageCircle, MoreVertical, Play, RotateCcw, Ticket, Trash2, Unplug, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cardState, remaining, shortLeft, usedShare, type CardRow, type CardState } from '@/lib/card-status';
import { humanData } from '@/lib/packages';
import { SAFE_VALUE } from '@/lib/card-actions';
import { jobPhase, useRouterJob } from '@/hooks/use-router-job';

export const STATE_LABEL: Record<CardState, [string, string]> = { unused: ['جديد', 'Unused'], active: ['قيد الاستخدام', 'In use'], almost: ['قارب على الانتهاء', 'Almost used'], finished: ['خلص رصيده', 'Used up'], expired: ['انتهت صلاحيته', 'Expired'], disabled: ['موقوف', 'Turned off'] };
export const STATE_TONE: Record<CardState, string> = { unused: 'bg-primary/15 text-primary', active: 'bg-secondary/20 text-foreground', almost: 'bg-destructive/10 text-destructive', finished: 'bg-muted text-muted-foreground', expired: 'bg-muted text-muted-foreground', disabled: 'bg-muted text-muted-foreground' };

export type QuickAction = 'renew' | 'off' | 'on' | 'del' | 'kick' | 'copy' | 'send';
export type RowJob = { id: string; action: string };

/** What is left (or why it ended), in one short line. */
export function leftLine(c: CardRow, ar: boolean): string {
  const t = (a: string, b: string) => (ar ? a : b);
  const st = cardState(c);
  if (st === 'unused') return t('جاهز للبيع', 'Ready to sell');
  if (st === 'expired') return t(`انتهت ${c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-GB') : ''}`, `Expired ${c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-GB') : ''}`);
  if (st === 'finished') return t('خلص رصيده', 'Used up');
  const r = remaining(c);
  const parts = [r.bytes != null ? humanData(r.bytes, ar) ?? t('0 ميجا', '0 MB') : null, r.seconds != null ? shortLeft(r.seconds * 1000, ar) : null, r.untilMs != null ? t(`${shortLeft(r.untilMs, true)}${c.expires_est ? ' تقريباً' : ''}`, `${shortLeft(r.untilMs, false)}${c.expires_est ? ' approx.' : ''}`) : null].filter(Boolean);
  return parts.length ? t(`باقي ${parts.join(' · ')}`, `Left ${parts.join(' · ')}`) : t('بلا حد', 'No limit');
}

/** One card in the list: number, package, what is left, state, and a ⋯ menu with the everyday actions. */
export function CardListRow({ c, ar, live, ready, selecting, selected, job, onOpen, onSelect, onAction, onJobOver }: {
  c: CardRow; ar: boolean; live: boolean; ready: boolean; selecting: boolean; selected: boolean; job?: RowJob | undefined;
  onOpen: () => void; onSelect: (v: boolean) => void; onAction: (a: QuickAction) => void; onJobOver: () => void;
}) {
  const t = (a: string, b: string) => (ar ? a : b);
  const st = cardState(c); const share = usedShare(c);
  const { data: jr } = useRouterJob(job?.id, onJobOver);
  const phase = job ? jobPhase(jr, ar) : null;
  const canAct = ready && SAFE_VALUE.test(c.name);
  const item = (a: QuickAction, icon: React.ReactNode, label: string, danger = false) => <DropdownMenuItem key={a} className={`min-h-11 gap-2 ${danger ? 'text-destructive focus:text-destructive' : ''}`} onSelect={() => onAction(a)}>{icon}{label}</DropdownMenuItem>;
  return (
    <li className={`app-panel flex items-center gap-2 p-2 ps-3 ${selected ? 'border-primary' : ''}`}>
      {selecting ? (
        <label className="flex size-11 shrink-0 items-center justify-center"><Checkbox checked={selected} onCheckedChange={(v) => onSelect(v === true)} aria-label={t(`تحديد ${c.name}`, `Select ${c.name}`)} disabled={!canAct} /></label>
      ) : (
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Ticket className="size-5" />{live && <span className="absolute -end-0.5 -top-0.5 size-3 rounded-full border-2 border-background bg-primary" aria-label={t('متصل الآن', 'Online now')} />}</span>
      )}
      <Button variant="ghost" type="button" onClick={selecting ? () => canAct && onSelect(!selected) : onOpen} className="tap-card block h-auto min-h-14 min-w-0 flex-1 rounded-md px-1 py-2 text-start whitespace-normal">
        <span className="flex flex-wrap items-center gap-2"><b className="break-all font-mono" dir="ltr">{c.name}</b><span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATE_TONE[st]}`}>{t(...STATE_LABEL[st])}</span></span>
        <span className="block truncate text-xs text-muted-foreground">{live && <b className="text-primary">{t('متصل · ', 'Online · ')}</b>}<span dir="auto">{c.profile || '-'}</span> · {leftLine(c, ar)}</span>
        {share != null && st !== 'unused' && <span className="meter mt-1.5 block" data-tone={share >= 0.8 ? 'warn' : undefined}><span style={{ width: `${Math.min(100, share * 100)}%` }} /></span>}
        {phase && (
          <span role="status" className={`mt-1 flex items-center gap-1 text-xs ${phase.tone === 'bad' ? 'text-destructive' : phase.tone === 'ok' ? 'text-primary' : 'text-muted-foreground'}`}>
            {phase.tone === 'wait' ? <Loader2 className="size-3 animate-spin" /> : phase.tone === 'ok' ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}{phase.text}
          </span>
        )}
      </Button>
      {!selecting && (
        <DropdownMenu dir={ar ? 'rtl' : 'ltr'}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" type="button" className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted" aria-label={t(`إجراءات ${c.name}`, `Actions for ${c.name}`)}><MoreVertical className="size-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {item('copy', <Copy className="size-4" />, t('نسخ الرقم', 'Copy number'))}
            {item('send', <MessageCircle className="size-4" />, t('أرسل للزبون', 'Send to customer'))}
            {canAct && <DropdownMenuSeparator />}
            {canAct && st !== 'unused' && item('renew', <RotateCcw className="size-4" />, t('تجديد الكرت', 'Renew card'))}
            {canAct && (c.disabled ? item('on', <Play className="size-4" />, t('تشغيل', 'Turn on')) : item('off', <Ban className="size-4" />, t('إيقاف', 'Turn off')))}
            {canAct && live && item('kick', <Unplug className="size-4" />, t('افصله الآن', 'Disconnect now'))}
            {canAct && item('del', <Trash2 className="size-4" />, t('حذف', 'Remove'), true)}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
