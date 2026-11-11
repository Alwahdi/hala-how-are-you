import { useState } from 'react';
import { Download, Send, Trash2, MessageSquareReply, MessageSquareWarning, Monitor, Ticket, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CardStateChip, UsageBar } from '@/components/card-state-chip';
import { CustomerReply } from '@/components/customer-reply';
import { ComplaintForm, type Complaint } from '@/components/complaint-log';
import { biggestSession, cardState, demoCards, formatDataSize, formatDuration, formatNumber, remainingMB, remainingRatio, sessionsOf, type DemoCard } from '@/lib/specimen-data';

type Props = { ar: boolean; cards?: DemoCard[]; onComplaint?: ((c: Complaint) => void) | undefined; onRemove?: ((id: string) => void) | undefined };
export function DemoCardList({ ar, cards = demoCards, onComplaint, onRemove }: Props) {
  return <div className="demo-card-list">{cards.map(card => <DemoCardItem key={card.id} card={card} ar={ar} onComplaint={onComplaint} onRemove={onRemove}/>)}</div>;
}

function DemoCardItem({ card, ar, onComplaint, onRemove }: { card: DemoCard; ar: boolean; onComplaint?: ((c: Complaint) => void) | undefined; onRemove?: ((id: string) => void) | undefined }) {
  const t = (a: string, b: string) => ar ? a : b;
  const [step, setStep] = useState<'details' | 'reply' | 'complaint'>('details');
  const state = cardState(card); const left = remainingMB(card); const used = card.downloadMB + card.uploadMB;
  const downShare = used ? card.downloadMB / used : 0; const sessions = sessionsOf(card); const big = biggestSession(sessions);
  const maxS = Math.max(1, ...sessions.map(s => s.downloadMB + s.uploadMB));
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setStep('details'); }}>
    <div className="demo-card-item">
    <DialogTrigger asChild>
      <Button variant="ghost" className={`demo-card-row demo-card-row--${state}`} aria-label={t(`تفاصيل الكرت ${card.id}`, `Card details ${card.id}`)}>
        <span className="demo-card-top">
          <span className="demo-card-identity"><Ticket aria-hidden="true"/><bdi dir="ltr" className="numeral">{card.id}</bdi></span>
          <CardStateChip state={state} ar={ar}/>
        </span>
        <UsageBar ratio={remainingRatio(card)} state={state} label={t('المتبقي من الباقة', 'Remaining allowance')}/>
        <span className="demo-card-line">
          <span><strong><bdi dir="ltr">{formatDataSize(left)}</bdi></strong> {t('متبقي من', 'left of')} <bdi dir="ltr">{formatDataSize(card.limitMB)}</bdi></span>
          <span className="text-muted-foreground"><bdi>{formatDuration(card.usedMinutes, ar)}</bdi> {t('استخدام', 'used')}</span>
        </span>
      </Button>
    </DialogTrigger>
    <Button type="button" size="sm" variant="secondary" className="demo-card-send" onClick={() => { setStep('reply'); setOpen(true); }} aria-label={t(`إرسال الكرت ${card.id} للزبون`, `Send card ${card.id} to customer`)}><Send aria-hidden="true"/>{t('إرسال', 'Send')}</Button>
    </div>
    <DialogContent className="demo-card-dialog" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}>
      <DialogTitle className="text-start leading-relaxed">{step === 'reply' ? t('رد على الزبون', 'Reply to customer') : step === 'complaint' ? t('تسجيل شكوى', 'Log a complaint') : t('تفاصيل الكرت', 'Card details')} <bdi dir="ltr">{card.id}</bdi></DialogTitle>
      <DialogDescription className="text-start leading-relaxed">{t('بيانات تجريبية فقط، وليست قراءة من شبكة فعلية.', 'Demonstration data only, not readings from a live network.')}</DialogDescription>
      {step === 'reply' ? <CustomerReply card={card} ar={ar} onBack={() => setStep('details')}/> :
       step === 'complaint' ? <ComplaintForm card={card} ar={ar} onBack={() => setStep('details')} onSave={c => { onComplaint?.(c); setStep('details'); }}/> : <>
      <div className="dialog-hero">
        <CardStateChip state={state} ar={ar}/>
        <p className="dialog-big"><bdi dir="ltr">{formatDataSize(left)}</bdi></p>
        {card.code && <p className="text-sm">{t('الرمز', 'Code')}: <bdi dir="ltr" className="numeral font-semibold">{card.code}</bdi></p>}
        <p className="text-sm text-muted-foreground">{t('متبقي من', 'left of')} <bdi dir="ltr">{formatDataSize(card.limitMB)}</bdi> · {t('مستهلك', 'used')} <bdi dir="ltr" className="numeral">{formatNumber(card.usage)}%</bdi></p>
        <UsageBar ratio={remainingRatio(card)} state={state} label={t('المتبقي من الباقة', 'Remaining allowance')}/>
      </div>
      {used === 0 && <div className="reply-cta"><Button onClick={() => setStep('reply')}><Send/>{t('أرسل للزبون', 'Send to customer')}</Button>{card.isNew && onRemove && <Button variant="outline" onClick={() => { setOpen(false); onRemove(card.id); }}><Trash2/>{t('حذف هذا الكرت التجريبي', 'Delete this demo card')}</Button>}</div>}
      {used > 0 && <div className="reply-cta"><Button onClick={() => setStep('reply')}><MessageSquareReply/>{t('رد على الزبون', 'Reply to customer')}</Button>{onComplaint && <Button variant="outline" onClick={() => setStep('complaint')}><MessageSquareWarning/>{t('تسجيل شكوى', 'Log complaint')}</Button>}</div>}
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
      <p className="text-xs text-muted-foreground leading-relaxed">{t('أمثلة مصطنعة؛ البيانات الفعلية تعتمد على نظام الشبكة.', 'Illustrative examples; real data depends on the network system.')}</p>
      <DialogClose asChild><Button variant="outline">{t('إغلاق', 'Close')}</Button></DialogClose>
      </>}
    </DialogContent>
  </Dialog>;
}
