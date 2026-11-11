import { ChevronLeft, ChevronRight, Download, Ticket, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CardStateChip, UsageBar } from '@/components/card-state-chip';
import { cardState, demoCards, formatDataSize, formatDuration, formatNumber, remainingMB, remainingRatio, type DemoCard } from '@/lib/specimen-data';

export function DemoCardList({ ar, cards = demoCards }: { ar: boolean; cards?: DemoCard[] }) {
  const t = (a: string, b: string) => ar ? a : b;
  const Arrow = ar ? ChevronLeft : ChevronRight;
  return <div className="demo-card-list">
    {cards.map(card => {
      const state = cardState(card); const left = remainingMB(card); const used = card.downloadMB + card.uploadMB;
      const downShare = used ? card.downloadMB / used : 0;
      return <Dialog key={card.id}>
      <DialogTrigger asChild>
        <Button variant="ghost" className={`demo-card-row demo-card-row--${state}`} aria-label={t(`تفاصيل الكرت ${card.id}`, `Card details ${card.id}`)}>
          <span className="demo-card-top">
            <span className="demo-card-identity"><Ticket aria-hidden="true"/><bdi dir="ltr" className="numeral">{card.id}</bdi></span>
            <CardStateChip state={state} ar={ar}/>
            <Arrow className="demo-card-arrow" aria-hidden="true"/>
          </span>
          <UsageBar ratio={remainingRatio(card)} state={state} label={t('المتبقي من الباقة', 'Remaining allowance')}/>
          <span className="demo-card-line">
            <span><strong><bdi dir="ltr">{formatDataSize(left)}</bdi></strong> {t('متبقي من', 'left of')} <bdi dir="ltr">{formatDataSize(card.limitMB)}</bdi></span>
            <span className="text-muted-foreground"><bdi>{formatDuration(card.usedMinutes, ar)}</bdi> {t('استخدام', 'used')}</span>
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="demo-card-dialog" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}>
        <DialogTitle className="text-start leading-relaxed">{t('تفاصيل الكرت', 'Card details')} <bdi dir="ltr">{card.id}</bdi></DialogTitle>
        <DialogDescription className="text-start leading-relaxed">{t('بيانات تجريبية فقط، وليست قراءة من شبكة فعلية.', 'Demonstration data only, not readings from a live network.')}</DialogDescription>
        <div className="dialog-hero">
          <CardStateChip state={state} ar={ar}/>
          <p className="dialog-big"><bdi dir="ltr">{formatDataSize(left)}</bdi></p>
          <p className="text-sm text-muted-foreground">{t('متبقي من', 'left of')} <bdi dir="ltr">{formatDataSize(card.limitMB)}</bdi> · {t('مستهلك', 'used')} <bdi dir="ltr" className="numeral">{formatNumber(card.usage)}%</bdi></p>
          <UsageBar ratio={remainingRatio(card)} state={state} label={t('المتبقي من الباقة', 'Remaining allowance')}/>
        </div>
        {used > 0 && <div className="split-block">
          <p className="text-sm font-semibold">{t('أين ذهب الاستهلاك؟', 'Where did the data go?')}</p>
          <div className="split-bar" aria-hidden="true"><span style={{ inlineSize: `${downShare * 100}%` }}/></div>
          <div className="split-legend"><span><Download size={14} aria-hidden="true"/>{t('تحميل', 'Download')} <bdi dir="ltr">{formatDataSize(card.downloadMB)}</bdi></span><span><Upload size={14} aria-hidden="true"/>{t('رفع', 'Upload')} <bdi dir="ltr">{formatDataSize(card.uploadMB)}</bdi></span></div>
          <p className="text-xs text-muted-foreground leading-relaxed">{downShare > 0.7 ? t('أغلب الاستهلاك تحميل، مثل مشاهدة الفيديو. هذا غالباً سبب انتهاء الكرت بسرعة.', 'Most usage was downloading, such as watching video. This is usually why a card runs out fast.') : t('الاستهلاك موزع بين التحميل والرفع.', 'Usage is spread between download and upload.')}</p>
        </div>}
        <dl className="demo-card-details">
          <div><dt>{t('مدة الاستخدام', 'Time used')}</dt><dd><bdi>{formatDuration(card.usedMinutes, ar)}</bdi> / <bdi>{formatDuration(card.limitMinutes, ar)}</bdi></dd></div>
        </dl>
        <p className="text-xs text-muted-foreground leading-relaxed">{t('أمثلة مصطنعة؛ البيانات الفعلية تعتمد على نظام الشبكة.', 'Illustrative examples; real data depends on the network system.')}</p>
        <DialogClose asChild><Button variant="outline">{t('إغلاق', 'Close')}</Button></DialogClose>
      </DialogContent>
    </Dialog>;})}
  </div>;
}
