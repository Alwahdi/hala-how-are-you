import { ChevronLeft, ChevronRight, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { demoCards, formatNumber } from '@/lib/specimen-data';

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
        </Button>
      </DialogTrigger>
      <DialogContent className="demo-card-dialog" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}>
        <DialogTitle className="text-start leading-relaxed">{t('تفاصيل الكرت', 'Card details')}</DialogTitle>
        <DialogDescription className="text-start leading-relaxed">{t('بيانات تجريبية فقط، وليست قراءة من شبكة فعلية.', 'Demonstration data only, not readings from a live network.')}</DialogDescription>
        <dl className="demo-card-details">
          <div><dt>{t('رقم الكرت', 'Card number')}</dt><dd><bdi dir="ltr">{card.id}</bdi></dd></div>
          <div><dt>{t('الحالة', 'Status')}</dt><dd>{card.active ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}</dd></div>
          <div><dt>{t('الاستهلاك', 'Usage')}</dt><dd><bdi dir="ltr" className="numeral">{formatNumber(card.usage)}%</bdi></dd></div>
        </dl>
        <DialogClose asChild><Button variant="outline">{t('إغلاق', 'Close')}</Button></DialogClose>
      </DialogContent>
    </Dialog>)}
  </div>;
}