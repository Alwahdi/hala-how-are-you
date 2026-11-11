import { ShieldCheck, Ticket } from 'lucide-react';
import { DemoCardList } from '@/components/demo-card-list';
import { demoCards, formatNumber } from '@/lib/specimen-data';

export function InterfaceConcept({ ar }: { ar: boolean }) {
  const t = (a: string, b: string) => ar ? a : b;
  return <div className="hero-preview mesh-surface">
    <div className="preview-caption"><span className="flex min-w-0 items-center gap-2"><span className="status-dot shrink-0"/>{t('تصور الواجهة · بيانات تجريبية فقط', 'Interface concept · Demonstration data only')}</span><span className="hidden sm:inline" dir="ltr">MIKRO / WORKSPACE</span></div>
    <div className="concept-workspace">
      <div className="concept-heading"><div><p className="text-secondary text-xs">{t('شبكة تجريبية', 'Demonstration network')}</p><h3>{t('حالة الكرت واستهلاكه', 'Card status and usage')}</h3></div><Ticket className="text-primary shrink-0" size={26}/></div>
      <div className="concept-stats"><div><span>{t('كروت تجريبية', 'Demo cards')}</span><strong className="numeral">{formatNumber(demoCards.length)}</strong></div><div><span>{t('نشط', 'Active')}</span><strong className="numeral">{formatNumber(demoCards.filter(c => c.active).length)}</strong></div><div><span>{t('غير نشط', 'Inactive')}</span><strong className="numeral">{formatNumber(demoCards.filter(c => !c.active).length)}</strong></div></div>
      <DemoCardList ar={ar}/>
    </div>
    <div className="preview-bottom"><ShieldCheck size={16} className="shrink-0"/>{t('لا اتصال بشبكات فعلية في هذا العرض', 'No live network connection in this preview')}</div>
  </div>;
}