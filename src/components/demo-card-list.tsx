import { useState } from 'react';
import { Ban, Download, Eye, MessageSquareReply, MessageSquareWarning, Monitor, MoreVertical, Power, RefreshCw, Send, Ticket, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CardStateChip, UsageBar } from '@/components/card-state-chip';
import { CustomerReply } from '@/components/customer-reply';
import { ComplaintForm, type Complaint } from '@/components/complaint-log';
import { biggestSession, buildRenewMessage, cardState, demoCards, formatDataSize, formatDuration, formatNumber, PACKAGE_OPTIONS_MB, remainingMB, remainingRatio, renewCard, sessionsOf, type DemoCard } from '@/lib/specimen-data';

export type Notice = { text: string; undo?: () => void };
type Handlers = { onComplaint?: ((c: Complaint) => void) | undefined; onChange?: ((c: DemoCard, notice?: Notice) => void) | undefined; onRemove?: ((id: string) => void) | undefined };
type Props = Handlers & { ar: boolean; cards?: DemoCard[] };
export function DemoCardList({ ar, cards = demoCards, ...h }: Props) {
  return <div className="demo-card-list">{cards.map(card => <DemoCardItem key={card.id} card={card} ar={ar} {...h}/>)}</div>;
}

type Step = 'details' | 'reply' | 'complaint' | 'renew' | 'renewed' | 'disable' | 'delete';
function DemoCardItem({ card, ar, onComplaint, onChange, onRemove }: Handlers & { card: DemoCard; ar: boolean }) {
  const t = (a: string, b: string) => ar ? a : b;
  const [open, setOpen] = useState(false); const [step, setStep] = useState<Step>('details');
  const [addMB, setAddMB] = useState<number>(PACKAGE_OPTIONS_MB[0]);
  const go = (s: Step) => { setStep(s); setOpen(true); };
  const state = cardState(card); const left = remainingMB(card); const used = card.downloadMB + card.uploadMB;
  const downShare = used ? card.downloadMB / used : 0; const sessions = sessionsOf(card); const big = biggestSession(sessions);
  const maxS = Math.max(1, ...sessions.map(s => s.downloadMB + s.uploadMB));
  const toggleDisabled = () => { const prev = card; const next = { ...card, disabled: !card.disabled }; onChange?.(next, { text: next.disabled ? t(`تم تعطيل الكرت ${card.id}`, `Card ${card.id} disabled`) : t(`تم تفعيل الكرت ${card.id}`, `Card ${card.id} enabled`), undo: () => onChange?.(prev) }); setOpen(false); };
  const doRenew = () => { onChange?.(renewCard(card, addMB), { text: t(`تم تجديد ${card.id} بإضافة ${formatDataSize(addMB)}`, `${card.id} renewed with ${formatDataSize(addMB)}`), undo: () => onChange?.(card) }); setStep('renewed'); };
  const title = { details: t('تفاصيل الكرت', 'Card details'), reply: t('إرسال للزبون', 'Send to customer'), complaint: t('تسجيل شكوى', 'Log a complaint'), renew: t('تجديد الكرت', 'Renew card'), renewed: t('تم التجديد', 'Renewed'), disable: card.disabled ? t('تفعيل الكرت', 'Enable card') : t('تعطيل الكرت', 'Disable card'), delete: t('حذف الكرت التجريبي', 'Delete demo card') }[step];
  const back = () => setStep('details');
  return <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setStep('details'); }}>
    <div className={`demo-card-item${state === 'disabled' ? ' is-disabled' : ''}`}>
      <DialogTrigger asChild>
        <Button variant="ghost" className={`demo-card-row demo-card-row--${state}`} aria-label={t(`تفاصيل الكرت ${card.id}`, `Card details ${card.id}`)}>
          <span className="demo-card-top">
            <span className="demo-card-identity"><Ticket aria-hidden="true"/><bdi dir="ltr" className="numeral">{card.id}</bdi>{card.isNew && <span className="new-tag">{t('جديد', 'New')}</span>}</span>
            <CardStateChip state={state} ar={ar}/>
          </span>
          <UsageBar ratio={remainingRatio(card)} state={state} label={t('المتبقي من الباقة', 'Remaining allowance')}/>
          <span className="demo-card-line">
            <span><strong><bdi dir="ltr">{formatDataSize(left)}</bdi></strong> {t('متبقي من', 'left of')} <bdi dir="ltr">{formatDataSize(card.limitMB)}</bdi></span>
            <span className="text-muted-foreground"><bdi>{formatDuration(card.usedMinutes, ar)}</bdi> {t('استخدام', 'used')}</span>
          </span>
        </Button>
      </DialogTrigger>
      <div className="demo-card-actions">
        {state === 'almostFinished'
          ? <Button type="button" size="sm" className="demo-card-quick demo-card-quick--renew" onClick={() => go('renew')}><RefreshCw aria-hidden="true"/>{t('تجديد', 'Renew')}</Button>
          : <Button type="button" size="sm" variant="secondary" className="demo-card-quick" disabled={state === 'disabled'} onClick={() => go('reply')} aria-label={t(`إرسال الكرت ${card.id} للزبون`, `Send card ${card.id} to customer`)}><Send aria-hidden="true"/>{t('إرسال', 'Send')}</Button>}
        <DropdownMenu dir={ar ? 'rtl' : 'ltr'}>
          <DropdownMenuTrigger asChild><Button type="button" size="icon" variant="outline" className="demo-card-more" aria-label={t(`خيارات الكرت ${card.id}`, `Options for ${card.id}`)}><MoreVertical/></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="card-menu">
            <DropdownMenuItem disabled={state === 'disabled'} onSelect={() => go('reply')}><Send/>{t('إرسال للزبون', 'Send to customer')}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => go('renew')}><RefreshCw/>{t('تجديد (إضافة باقة)', 'Renew (add data)')}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => go('details')}><Eye/>{t('التفاصيل والجلسات', 'Details & sessions')}</DropdownMenuItem>
            <DropdownMenuSeparator/>
            <DropdownMenuItem onSelect={() => go('disable')}>{card.disabled ? <Power/> : <Ban/>}{card.disabled ? t('تفعيل الكرت', 'Enable card') : t('تعطيل الكرت', 'Disable card')}</DropdownMenuItem>
            {card.isNew && onRemove && <DropdownMenuItem className="text-destructive" onSelect={() => go('delete')}><Trash2/>{t('حذف', 'Delete')}</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    <DialogContent className="demo-card-dialog" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}>
      <DialogTitle className="text-start leading-relaxed">{title} <bdi dir="ltr">{card.id}</bdi></DialogTitle>
      <DialogDescription className="text-start leading-relaxed">{t('بيانات تجريبية فقط، وليست قراءة من شبكة فعلية.', 'Demonstration data only, not readings from a live network.')}</DialogDescription>
      {step === 'reply' ? <CustomerReply card={card} ar={ar} onBack={back}/> :
       step === 'complaint' ? <ComplaintForm card={card} ar={ar} onBack={back} onSave={c => { onComplaint?.(c); back(); }}/> :
       step === 'renew' ? <>
        <p className="text-sm text-muted-foreground">{t('اختر الباقة التي تضيفها لنفس الكرت. الزبون يكمل بنفس الرقم.', 'Pick the data to add to the same card. The customer keeps the same number.')}</p>
        <div className="choice-grid" role="group" aria-label={t('الباقة المضافة', 'Data to add')}>{PACKAGE_OPTIONS_MB.map(mb => <Button key={mb} type="button" variant={addMB === mb ? 'default' : 'outline'} aria-pressed={addMB === mb} onClick={() => setAddMB(mb)}>+ <bdi dir="ltr">{formatDataSize(mb)}</bdi></Button>)}</div>
        <p className="renew-preview">{t('بعد التجديد سيصبح المتبقي', 'After renewing, remaining will be')} <strong><bdi dir="ltr">{formatDataSize(left + addMB)}</bdi></strong></p>
        <div className="sheet-actions"><Button variant="outline" onClick={back}>{t('إلغاء', 'Cancel')}</Button><Button onClick={doRenew}><RefreshCw/>{t('تجديد الكرت', 'Renew card')}</Button></div>
       </> :
       step === 'renewed' ? <>
        <div className="added-summary" role="status"><RefreshCw aria-hidden="true"/><div><p className="font-semibold">{t('المتبقي الآن', 'Remaining now')} <bdi dir="ltr">{formatDataSize(left)}</bdi></p><p className="text-sm text-muted-foreground">{t('أبلغ زبونك بالتجديد:', 'Let your customer know:')}</p></div></div>
        <CustomerReply card={card} ar={ar} buildMessage={lang => buildRenewMessage(card, addMB, lang)}/>
        <div className="sheet-actions"><Button variant="outline" onClick={back}>{t('التفاصيل', 'Details')}</Button><DialogClose asChild><Button>{t('تم', 'Done')}</Button></DialogClose></div>
       </> :
       step === 'disable' ? <>
        <p className="text-sm leading-relaxed">{card.disabled ? t('سيعود الكرت للعمل، ويستطيع الزبون الاتصال من جديد.', 'The card will work again and the customer can connect.') : t('لن يستطيع الزبون الاتصال بهذا الكرت حتى تعيد تفعيله. المتبقي يبقى محفوظاً.', 'The customer won’t be able to connect with this card until you enable it again. The remaining data is kept.')}</p>
        <div className="sheet-actions"><Button variant="outline" onClick={back}>{t('إلغاء', 'Cancel')}</Button><Button variant={card.disabled ? 'default' : 'destructive'} onClick={toggleDisabled}>{card.disabled ? <Power/> : <Ban/>}{card.disabled ? t('تفعيل', 'Enable') : t('تعطيل', 'Disable')}</Button></div>
       </> :
       step === 'delete' ? <>
        <p className="text-sm leading-relaxed">{t('سيُحذف هذا الكرت التجريبي من القائمة.', 'This demo card will be removed from the list.')}</p>
        <div className="sheet-actions"><Button variant="outline" onClick={back}>{t('إلغاء', 'Cancel')}</Button><Button variant="destructive" onClick={() => { setOpen(false); onRemove?.(card.id); }}><Trash2/>{t('حذف', 'Delete')}</Button></div>
       </> : <>
      <div className="dialog-hero">
        <CardStateChip state={state} ar={ar}/>
        <p className="dialog-big"><bdi dir="ltr">{formatDataSize(left)}</bdi></p>
        {card.code && <p className="text-sm">{t('الرمز', 'Code')}: <bdi dir="ltr" className="numeral font-semibold">{card.code}</bdi></p>}
        <p className="text-sm text-muted-foreground">{t('متبقي من', 'left of')} <bdi dir="ltr">{formatDataSize(card.limitMB)}</bdi> · {t('مستهلك', 'used')} <bdi dir="ltr" className="numeral">{formatNumber(card.usage)}%</bdi></p>
        <UsageBar ratio={remainingRatio(card)} state={state} label={t('المتبقي من الباقة', 'Remaining allowance')}/>
      </div>
      <div className="reply-cta">
        <Button disabled={state === 'disabled'} onClick={() => setStep('reply')}>{used ? <MessageSquareReply/> : <Send/>}{used ? t('رد على الزبون', 'Reply to customer') : t('أرسل للزبون', 'Send to customer')}</Button>
        <Button variant="outline" onClick={() => setStep('renew')}><RefreshCw/>{t('تجديد', 'Renew')}</Button>
        {used > 0 && onComplaint && <Button variant="outline" onClick={() => setStep('complaint')}><MessageSquareWarning/>{t('تسجيل شكوى', 'Log complaint')}</Button>}
      </div>
      {used > 0 && <div className="split-block">
        <p className="text-sm font-semibold">{t('أين ذهب الاستهلاك؟', 'Where did the data go?')}</p>
        <div className="split-bar" aria-hidden="true"><span style={{ inlineSize: `${downShare * 100}%` }}/></div>
        <div className="split-legend"><span><Download size={14} aria-hidden="true"/>{t('تحميل', 'Download')} <bdi dir="ltr">{formatDataSize(card.downloadMB)}</bdi></span><span><Upload size={14} aria-hidden="true"/>{t('رفع', 'Upload')} <bdi dir="ltr">{formatDataSize(card.uploadMB)}</bdi></span></div>
        <p className="text-xs text-muted-foreground leading-relaxed">{downShare > 0.7 ? t('أغلب الاستهلاك تحميل، مثل مشاهدة الفيديو. هذا غالباً سبب انتهاء الكرت بسرعة.', 'Most usage was downloading, such as watching video. This is usually why a card runs out fast.') : t('الاستهلاك موزع بين التحميل والرفع.', 'Usage is spread between download and upload.')}</p>
      </div>}
      <div className="sessions-block">
        <p className="text-sm font-semibold">{t('الجلسات', 'Sessions')} <span className="text-muted-foreground font-normal">(<bdi dir="ltr">{sessions.length}</bdi>)</span></p>
        {sessions.length === 0 ? <p className="text-sm text-muted-foreground">{t('لا توجد جلسات بعد.', 'No sessions yet.')}</p> :
        <ol className="session-list">{sessions.map(s => { const mb = s.downloadMB + s.uploadMB; const isBig = s === big && sessions.length > 1; return <li key={s.start} className={isBig ? 'session--big' : ''}>
          <div className="session-head"><span className="inline-flex items-center gap-1.5"><Monitor size={14} aria-hidden="true"/><bdi dir="ltr">{s.device}</bdi>{isBig && <span className="session-tag">{t('الأكبر', 'Biggest')}</span>}</span><bdi dir="ltr" className="font-semibold">{formatDataSize(mb)}</bdi></div>
          <div className="session-bar" aria-hidden="true"><span style={{ inlineSize: `${mb / maxS * 100}%` }}/></div>
          <div className="session-meta"><bdi dir="ltr">{s.start}</bdi><bdi>{formatDuration(s.minutes, ar)}</bdi></div>
        </li>; })}</ol>}
        <p className="text-xs text-muted-foreground">{t('مدة الاستخدام', 'Time used')}: <bdi>{formatDuration(card.usedMinutes, ar)}</bdi> / <bdi>{card.limitMinutes ? formatDuration(card.limitMinutes, ar) : t('بدون حد', 'No limit')}</bdi></p>
      </div>
      <DialogClose asChild><Button variant="outline">{t('إغلاق', 'Close')}</Button></DialogClose>
      </>}
    </DialogContent>
  </Dialog>;
}
