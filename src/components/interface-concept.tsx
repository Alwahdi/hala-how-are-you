import { useState } from 'react';
import { Search, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DemoCardList } from '@/components/demo-card-list';
import { StateIcon, stateLabel } from '@/components/card-state-chip';
import { QuickAddCard } from '@/components/quick-add-card';
import { ComplaintList, type Complaint } from '@/components/complaint-log';
import { byAttention, cardState, demoCards, filterCards, formatNumber, type CardState, type DemoCard } from '@/lib/specimen-data';

export function InterfaceConcept({ ar }: { ar: boolean }) {
  const t = (a: string, b: string) => ar ? a : b;
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState<CardState | 'all'>('all');
  const [cards, setCards] = useState<DemoCard[]>(demoCards);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const count = (s: CardState) => cards.filter(c => cardState(c) === s).length;
  const low = count('almostFinished');
  const tiles: { s: CardState; label: string }[] = [{ s: 'unused', label: stateLabel('unused', ar) }, { s: 'inUse', label: stateLabel('inUse', ar) }, { s: 'almostFinished', label: stateLabel('almostFinished', ar) }];
  const results = [...filterCards(cards, query, filter).filter(c => c.isNew), ...byAttention(filterCards(cards, query, filter).filter(c => !c.isNew))];
  const reset = () => { setQuery(''); setFilter('all'); };
  return <div className="hero-preview mesh-surface">
    <div className="preview-caption"><span className="flex min-w-0 items-center gap-2"><span className="status-dot shrink-0"/>{t('تصور الواجهة · بيانات تجريبية فقط', 'Interface concept · Demonstration data only')}</span><span className="hidden sm:inline" dir="ltr">MIKRO / WORKSPACE</span></div>
    <div className="concept-workspace">
      <div className="concept-heading"><p className="text-secondary text-xs">{t('كروت شبكتك اليوم', 'Your network’s cards today')}</p>
        <h3>{low ? t(`${low} كرت قارب على الانتهاء`, `${low} card almost finished`) : t('كل الكروت بحالة جيدة', 'All cards look fine')}</h3></div>
      <div className="summary-tiles">{tiles.map(x => <button type="button" key={x.s} aria-pressed={filter === x.s} onClick={() => setFilter(filter === x.s ? 'all' : x.s)} className={`summary-tile summary-tile--${x.s}`}><StateIcon state={x.s} size={20}/><strong className="numeral">{formatNumber(count(x.s))}</strong><span>{x.label}</span></button>)}</div>
      <div className="concept-toolbar">
      <div className="toolbar-row"><div className="card-search">
        <Search size={18} aria-hidden="true"/>
        <Input value={query} onChange={e => setQuery(e.target.value)} inputMode="search" dir="ltr" aria-label={t('ابحث برقم الكرت', 'Search by card number')} placeholder={t('اكتب رقم الكرت، مثل 004', 'Type a card number, e.g. 004')}/>
        {query && <Button size="icon" variant="ghost" aria-label={t('مسح البحث', 'Clear search')} onClick={() => setQuery('')}><X/></Button>}
      </div><QuickAddCard ar={ar} existing={cards} onAdd={c => { setCards(p => [...c, ...p]); setQuery(''); setFilter('all'); }}/></div>
      <div className="filter-chips" role="group" aria-label={t('تصفية حسب الحالة', 'Filter by status')}>
        {(['all', 'almostFinished', 'inUse', 'unused'] as const).map(f => <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? t('الكل', 'All') : stateLabel(f, ar)}</Button>)}
      </div>
      </div>
      <p className="concept-hint" aria-live="polite">{results.length ? t(`${results.length} كرت · اضغط على أي كرت لرؤية جلساته والرد على الزبون`, `${results.length} cards · Tap a card to see its sessions and reply to the customer`) : ''}</p>
      {results.length ? <DemoCardList ar={ar} cards={results} onComplaint={c => setComplaints(p => [c, ...p])} onRemove={id => setCards(p => p.filter(c => c.id !== id))}/> :
        <div className="empty-results"><Search aria-hidden="true"/><p>{t('لم نجد كرتاً مطابقاً', 'No matching card')}</p><Button variant="outline" onClick={reset}>{t('عرض كل الكروت', 'Show all cards')}</Button></div>}
      <ComplaintList items={complaints} ar={ar}/>
    </div>
    <div className="preview-bottom"><ShieldCheck size={16} className="shrink-0"/>{t('لا اتصال بشبكات فعلية في هذا العرض', 'No live network connection in this preview')}</div>
  </div>;
}
