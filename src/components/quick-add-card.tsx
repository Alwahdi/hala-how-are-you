import { useState } from 'react';
import { CheckCircle2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CustomerReply } from '@/components/customer-reply';
import { buildNewCardMessage, createDemoCards, formatDataSize, MAX_QUICK_ADD, PACKAGE_OPTIONS_MB, validityLabel, type DemoCard, type Validity } from '@/lib/specimen-data';

const VALIDITIES: Validity[] = ['day', 'week', 'month', 'none'];
/** Demo-only quick add: cards live in page memory, never on a router or in storage. */
export function QuickAddCard({ ar, existing, onAdd }: { ar: boolean; existing: DemoCard[]; onAdd: (cards: DemoCard[]) => void }) {
  const t = (a: string, b: string) => ar ? a : b;
  const [open, setOpen] = useState(false); const [pkg, setPkg] = useState<number>(PACKAGE_OPTIONS_MB[0]);
  const [validity, setValidity] = useState<Validity>('day'); const [count, setCount] = useState(1);
  const [created, setCreated] = useState<DemoCard[]>([]);
  const reset = () => { setCreated([]); setCount(1); };
  const create = () => { const c = createDemoCards(existing, count, pkg, validity); onAdd(c); setCreated(c); };
  const first = created[0];
  return <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
    <DialogTrigger asChild><Button className="quick-add-trigger" aria-label={t('إضافة كرت', 'Add card')}><Plus aria-hidden="true"/><span>{t('إضافة', 'Add')}</span></Button></DialogTrigger>
    <DialogContent className="demo-card-dialog" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}>
      <DialogTitle className="text-start leading-relaxed">{first ? t('تمت الإضافة', 'Card added') : t('إضافة كرت', 'Add a card')}</DialogTitle>
      <DialogDescription className="text-start leading-relaxed">{t('مثال تجريبي: الكرت يُضاف لهذه الصفحة فقط ولا يُنشأ على أي راوتر.', 'Demo only: the card is added to this page and is not created on any router.')}</DialogDescription>
      {first ? <>
        <div className="added-summary" role="status"><CheckCircle2 aria-hidden="true"/><div>
          <p className="font-semibold">{created.length > 1 ? t(`أُضيف ${created.length} كروت`, `${created.length} cards added`) : <bdi dir="ltr" className="numeral">{first.id}</bdi>}</p>
          <p className="text-sm text-muted-foreground"><bdi dir="ltr">{formatDataSize(first.limitMB)}</bdi> · {validityLabel(validity, ar)}{created.length === 1 && <> · {t('الرمز', 'Code')} <bdi dir="ltr" className="numeral">{first.code}</bdi></>}</p>
        </div></div>
        <p className="text-sm font-semibold">{t('أرسله للزبون الآن', 'Send it to the customer now')}</p>
        <CustomerReply card={first} ar={ar} buildMessage={lang => buildNewCardMessage(created, lang)}/>
        <div className="sheet-actions"><Button variant="outline" onClick={reset}><Plus/>{t('إضافة آخر', 'Add another')}</Button><Button onClick={() => setOpen(false)}>{t('تم', 'Done')}</Button></div>
      </> : <>
        <fieldset className="choice-group"><legend>{t('الباقة', 'Package')}</legend><div className="choice-grid">
          {PACKAGE_OPTIONS_MB.map(mb => <Button key={mb} type="button" variant={pkg === mb ? 'default' : 'outline'} aria-pressed={pkg === mb} onClick={() => setPkg(mb)}><bdi dir="ltr">{formatDataSize(mb)}</bdi></Button>)}
        </div></fieldset>
        <fieldset className="choice-group"><legend>{t('المدة', 'Validity')}</legend><div className="choice-grid">
          {VALIDITIES.map(v => <Button key={v} type="button" variant={validity === v ? 'default' : 'outline'} aria-pressed={validity === v} onClick={() => setValidity(v)}>{validityLabel(v, ar)}</Button>)}
        </div></fieldset>
        <fieldset className="choice-group"><legend>{t('العدد', 'How many')}</legend>
          <div className="stepper" dir="ltr">
            <Button type="button" variant="outline" size="icon" aria-label={t('إنقاص', 'Fewer')} disabled={count <= 1} onClick={() => setCount(c => c - 1)}><Minus/></Button>
            <output aria-live="polite" className="numeral">{count}</output>
            <Button type="button" variant="outline" size="icon" aria-label={t('زيادة', 'More')} disabled={count >= MAX_QUICK_ADD} onClick={() => setCount(c => c + 1)}><Plus/></Button>
          </div>
          <p className="text-xs text-muted-foreground">{t(`حتى ${MAX_QUICK_ADD} كرت في المرة في هذا المثال. الرقم والرمز يُولَّدان تلقائياً.`, `Up to ${MAX_QUICK_ADD} cards at a time in this demo. Number and code are generated for you.`)}</p>
        </fieldset>
        <div className="sheet-actions"><Button variant="outline" onClick={() => setOpen(false)}>{t('إلغاء', 'Cancel')}</Button><Button onClick={create}><Plus/>{count > 1 ? t(`إضافة ${count} كروت`, `Add ${count} cards`) : t('إضافة الكرت', 'Add card')}</Button></div>
      </>}
    </DialogContent>
  </Dialog>;
}
