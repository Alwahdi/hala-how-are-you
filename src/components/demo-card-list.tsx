import { ChevronLeft, ChevronRight, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { demoCards, formatNumber, remainingMB } from '@/lib/specimen-data';

export function DemoCardList({ ar, cards = demoCards }: { ar: boolean; cards?: typeof demoCards }) {
  const t = (a: string, b: string) => ar ? a : b;
  const Arrow = ar ? ChevronLeft : ChevronRight;
  return <div className="demo-card-list">
    {cards.map(card => <Dialog key={card.id}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="demo-card-row" aria-label={t(`تفاصيل الكرت ${card.id}`, `Card details ${card.id}`)}>
          <span className="demo-card-identity"><Ticket aria-hidden="true"/><span><bdi dir="ltr" className="numeral">{card.id}</bdi><span className="demo-card-status"><span className={`status-dot ${card.active ? '' : 'disabled-dot'}`}/>{card.active ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}</span></span></span>
          <span className="demo-card-usage"><span>{t('الاستهلاك', 'Usage')}</span><bdi dir="ltr" className="numeral">{formatNumber(card.usage)}%</bdi></span>
          <Arrow className="text-primary" aria-hidden="true"/>
          <span className="demo-card-summary"><span>{t('الباقة', 'Allowance')} <bdi dir="ltr">{formatNumber(card.limitMB)} MB</bdi></span><span>{t('المتبقي', 'Remaining')} <bdi dir="ltr">{formatNumber(remainingMB(card))} MB</bdi></span></span>
        </Button>
      </DialogTrigger>
      <DialogContent className="demo-card-dialog" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}>
        <DialogTitle className="text-start leading-relaxed">{t('تفاصيل الكرت', 'Card details')}</DialogTitle>
        <DialogDescription className="text-start leading-relaxed">{t('بيانات تجريبية فقط، وليست قراءة من شبكة فعلية.', 'Demonstration data only, not readings from a live network.')}</DialogDescription>
        <dl className="demo-card-details">
          <div><dt>{t('رقم الكرت', 'Card number')}</dt><dd><bdi dir="ltr">{card.id}</bdi></dd></div>
          <div><dt>{t('الحالة', 'Status')}</dt><dd>{card.active ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}</dd></div>
          <div><dt>{t('الاستهلاك', 'Usage')}</dt><dd><bdi dir="ltr" className="numeral">{formatNumber(card.usage)}%</bdi></dd></div>
          {[[t('حد البيانات', 'Data allowance'), `${formatNumber(card.limitMB)} MB`], [t('تحميل', 'Download'), `${formatNumber(card.downloadMB)} MB`], [t('رفع', 'Upload'), `${formatNumber(card.uploadMB)} MB`], [t('المتبقي', 'Remaining'), `${formatNumber(remainingMB(card))} MB`], [t('مدة الاستخدام / الحد', 'Time used / allowance'), `${formatNumber(card.usedMinutes)} / ${formatNumber(card.limitMinutes)} ${t('دقيقة', 'min')}`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd><bdi dir="ltr">{value}</bdi></dd></div>)}
        </dl>
        <p className="text-xs text-muted-foreground leading-relaxed">{t('الاستهلاك = التحميل + الرفع. هذه أمثلة مصطنعة؛ البيانات الفعلية تعتمد على نظام الشبكة.', 'Usage = download + upload. These are illustrative examples; actual data depends on the network system.')}</p>
        <DialogClose asChild><Button variant="outline">{t('إغلاق', 'Close')}</Button></DialogClose>
      </DialogContent>
    </Dialog>)}
  </div>;
}