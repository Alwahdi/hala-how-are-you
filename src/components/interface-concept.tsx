import { ShieldCheck } from 'lucide-react';
import { DemoCardList } from '@/components/demo-card-list';
import { StateIcon, stateLabel } from '@/components/card-state-chip';
import { byAttention, cardState, demoCards, formatNumber, type CardState } from '@/lib/specimen-data';

export function InterfaceConcept({ ar }: { ar: boolean }) {
  const t = (a: string, b: string) => ar ? a : b;
  const count = (s: CardState) => demoCards.filter(c => cardState(c) === s).length;
  const low = count('almostFinished');
  const tiles: { s: CardState; label: string }[] = [{ s: 'unused', label: t('لم تُستخدم بعد', 'Not used yet') }, { s: 'inUse', label: stateLabel('inUse', ar) }, { s: 'almostFinished', label: stateLabel('almostFinished', ar) }];
  return <div className="hero-preview mesh-surface">
    <div className="preview-caption"><span className="flex min-w-0 items-center gap-2"><span className="status-dot shrink-0"/>{t('تصور الواجهة · بيانات تجريبية فقط', 'Interface concept · Demonstration data only')}</span><span className="hidden sm:inline" dir="ltr">MIKRO / WORKSPACE</span></div>
    <div className="concept-workspace">
      <div className="concept-heading"><p className="text-secondary text-xs">{t('كروت شبكتك اليوم', 'Your network’s cards today')}</p>
        <h3>{low ? t(`${low} كرت قارب على الانتهاء`, `${low} card almost finished`) : t('كل الكروت بحالة جيدة', 'All cards look fine')}</h3></div>
      <div className="summary-tiles">{tiles.map(x => <div key={x.s} className={`summary-tile summary-tile--${x.s}`}><StateIcon state={x.s} size={20}/><strong className="numeral">{formatNumber(count(x.s))}</strong><span>{x.label}</span></div>)}</div>
      <p className="concept-hint">{t('اضغط على أي كرت لمعرفة أين ذهب استهلاكه', 'Tap any card to see where its data went')}</p>
      <DemoCardList ar={ar} cards={byAttention(demoCards)}/>
    </div>
    <div className="preview-bottom"><ShieldCheck size={16} className="shrink-0"/>{t('لا اتصال بشبكات فعلية في هذا العرض', 'No live network connection in this preview')}</div>
  </div>;
}
