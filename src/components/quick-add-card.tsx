import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Layers, Minus, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CustomerReply } from '@/components/customer-reply';
import { buildNewCardMessage, createDemoCards, formatDataSize, MAX_QUICK_ADD, PACKAGE_OPTIONS_MB, validateManualId, validityLabel, type DemoCard, type Validity } from '@/lib/specimen-data';

const VALIDITIES: Validity[] = ['day', 'week', 'month', 'none'];
type Kind = 'single' | 'batch';
/** Demo-only quick add: cards live in page memory, never on a router or in storage. */
export function QuickAddCard({ ar, existing, onAdd }: { ar: boolean; existing: DemoCard[]; onAdd: (cards: DemoCard[]) => void }) {
  const t = (a: string, b: string) => ar ? a : b;
  const [open, setOpen] = useState(false); const [kind, setKind] = useState<Kind | null>(null);
  const [pkg, setPkg] = useState<number>(PACKAGE_OPTIONS_MB[0]); const [validity, setValidity] = useState<Validity>('day');
  const [count, setCount] = useState(10); const [manual, setManual] = useState(false); const [typed, setTyped] = useState(''); const [touched, setTouched] = useState(false);
  const [created, setCreated] = useState<DemoCard[]>([]);
  const Back = ar ? ArrowRight : ArrowLeft;
  const reset = () => { setCreated([]); setKind(null); setManual(false); setTyped(''); setTouched(false); };
  const idError = kind === 'single' && manual ? validateManualId(existing, typed) : null;
  const idMsg = idError === 'taken' ? t('هذا الرقم موجود مسبقاً، اختر رقماً آخر.', 'This number already exists. Choose another.') : idError === 'format' ? t('استخدم حروفاً إنجليزية وأرقاماً و - فقط (3 إلى 16).', 'Use English letters, digits and - only (3 to 16).') : idError === 'empty' ? t('اكتب رقم الكرت.', 'Type the card number.') : '';
  const create = () => { setTouched(true); if (idError) { document.getElementById('manual-card-id')?.focus(); return; } const c = createDemoCards(existing, kind === 'batch' ? count : 1, pkg, validity, Math.random, manual ? typed : undefined); if (!c.length) return; onAdd(c); setCreated(c); };
  const first = created[0];
  const title = first ? (created.length > 1 ? t(`أُضيفت ${created.length} كروت`, `${created.length} cards added`) : t('أُضيف الكرت', 'Card added')) : kind ? (kind === 'single' ? t('كرت لزبون', 'Card for a customer') : t('عدة كروت', 'Several cards')) : t('إضافة كروت', 'Add cards');
  return <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
    <DialogTrigger asChild><Button className="quick-add-trigger"><Plus aria-hidden="true"/><span>{t('إضافة', 'Add')}</span></Button></DialogTrigger>
    <DialogContent className="demo-card-dialog" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}>
      <DialogTitle className="text-start leading-relaxed">{title}</DialogTitle>
      <DialogDescription className="text-start leading-relaxed">{t('مثال تجريبي: الكروت تُضاف لهذه الصفحة فقط ولا تُنشأ على أي راوتر.', 'Demo only: cards are added to this page and are not created on any router.')}</DialogDescription>
      {first ? (created.length === 1 ? <>
        <div className="added-summary" role="status"><CheckCircle2 aria-hidden="true"/><div>
          <p className="font-semibold"><bdi dir="ltr" className="numeral">{first.id}</bdi> · {t('الرمز', 'Code')} <bdi dir="ltr" className="numeral">{first.code}</bdi></p>
          <p className="text-sm text-muted-foreground"><bdi dir="ltr">{formatDataSize(first.limitMB)}</bdi> · {validityLabel(validity, ar)}</p>
        </div></div>
        <p className="text-base font-bold">{t('أرسله لزبونك الآن', 'Send it to your customer now')}</p>
        <CustomerReply card={first} ar={ar} buildMessage={lang => buildNewCardMessage(created, lang)}/>
        <div className="sheet-actions"><Button variant="outline" onClick={reset}><Plus/>{t('إضافة آخر', 'Add another')}</Button><Button onClick={() => setOpen(false)}>{t('تم', 'Done')}</Button></div>
      </> : <>
        <div className="added-summary" role="status"><CheckCircle2 aria-hidden="true"/><div><p className="font-semibold">{t(`${created.length} كروت جاهزة`, `${created.length} cards ready`)}</p><p className="text-sm text-muted-foreground"><bdi dir="ltr">{formatDataSize(first.limitMB)}</bdi> · {validityLabel(validity, ar)} · {t('تظهر أعلى القائمة', 'shown at the top of the list')}</p></div></div>
        <ul className="batch-list" dir="ltr">{created.map(c => <li key={c.id}><span>{c.id}</span><strong>{c.code}</strong></li>)}</ul>
        <p className="text-xs text-muted-foreground">{t('الطباعة على قوالب الكروت ستأتي لاحقاً.', 'Printing on card templates comes later.')}</p>
        <CustomerReply card={first} ar={ar} buildMessage={lang => buildNewCardMessage(created, lang)}/>
        <div className="sheet-actions"><Button variant="outline" onClick={reset}><Plus/>{t('إضافة المزيد', 'Add more')}</Button><Button onClick={() => setOpen(false)}>{t('تم', 'Done')}</Button></div>
      </>) : !kind ? <>
        <p className="text-sm font-semibold">{t('ماذا تريد أن تضيف؟', 'What do you want to add?')}</p>
        <div className="kind-grid">
          <button type="button" className="kind-option" onClick={() => { setKind('single'); }}><User aria-hidden="true"/><strong>{t('كرت واحد لزبون', 'One card for a customer')}</strong><span>{t('تضيفه وترسله له مباشرة بـ WhatsApp أو SMS', 'Add it and send it right away by WhatsApp or SMS')}</span></button>
          <button type="button" className="kind-option" onClick={() => { setKind('batch'); }}><Layers aria-hidden="true"/><strong>{t('عدة كروت', 'Several cards')}</strong><span>{t('للبيع أو للتوزيع؛ الأرقام تُولَّد تلقائياً', 'For selling or distributing; numbers are generated')}</span></button>
        </div>
      </> : <>
        <Button variant="ghost" className="self-start" onClick={() => setKind(null)}><Back/>{t('تغيير النوع', 'Change type')}</Button>
        {kind === 'single' ? <fieldset className="choice-group"><legend>{t('رقم الكرت', 'Card number')}</legend>
          <div className="choice-grid choice-grid--2"><Button type="button" variant={!manual ? 'default' : 'outline'} aria-pressed={!manual} onClick={() => setManual(false)}>{t('تلقائي', 'Automatic')}</Button><Button type="button" variant={manual ? 'default' : 'outline'} aria-pressed={manual} onClick={() => setManual(true)}>{t('أكتبه بنفسي', 'I’ll type it')}</Button></div>
          {manual && <div className="field-block"><Input id="manual-card-id" autoFocus dir="ltr" inputMode="text" autoCapitalize="characters" autoComplete="off" enterKeyHint="done" maxLength={16} placeholder="SHOP-101" value={typed} aria-invalid={touched && !!idError} aria-describedby="manual-id-msg" onChange={e => setTyped(e.target.value)} onBlur={() => setTouched(true)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); create(); } }}/>
            <p id="manual-id-msg" className={touched && idError ? 'field-error' : 'text-xs text-muted-foreground'}>{touched && idError ? idMsg : t('مثل الرقم المطبوع على الكرت. الرمز السري يُولَّد تلقائياً.', 'Like the number printed on the card. The secret code is generated.')}</p></div>}
        </fieldset> : <fieldset className="choice-group"><legend>{t('كم كرت؟', 'How many?')}</legend>
          <div className="stepper" dir="ltr">
            <Button type="button" variant="outline" size="icon" aria-label={t('إنقاص', 'Fewer')} disabled={count <= 2} onClick={() => setCount(c => c - 1)}><Minus/></Button>
            <output aria-live="polite" className="numeral">{count}</output>
            <Button type="button" variant="outline" size="icon" aria-label={t('زيادة', 'More')} disabled={count >= MAX_QUICK_ADD} onClick={() => setCount(c => c + 1)}><Plus/></Button>
          </div>
          <div className="quick-counts">{[5, 10, 20].map(n => <Button key={n} type="button" size="sm" variant={count === n ? 'default' : 'outline'} onClick={() => setCount(n)}><bdi dir="ltr">{n}</bdi></Button>)}</div>
          <p className="text-xs text-muted-foreground">{t(`حتى ${MAX_QUICK_ADD} كرت في المرة في هذا المثال.`, `Up to ${MAX_QUICK_ADD} cards at a time in this demo.`)}</p>
        </fieldset>}
        <fieldset className="choice-group"><legend>{t('الباقة', 'Package')}</legend><div className="choice-grid">
          {PACKAGE_OPTIONS_MB.map(mb => <Button key={mb} type="button" variant={pkg === mb ? 'default' : 'outline'} aria-pressed={pkg === mb} onClick={() => setPkg(mb)}><bdi dir="ltr">{formatDataSize(mb)}</bdi></Button>)}
        </div></fieldset>
        <fieldset className="choice-group"><legend>{t('المدة', 'Validity')}</legend><div className="choice-grid">
          {VALIDITIES.map(v => <Button key={v} type="button" variant={validity === v ? 'default' : 'outline'} aria-pressed={validity === v} onClick={() => setValidity(v)}>{validityLabel(v, ar)}</Button>)}
        </div></fieldset>
        <div className="sheet-actions"><Button variant="outline" onClick={() => setOpen(false)}>{t('إلغاء', 'Cancel')}</Button><Button onClick={create}><Plus/>{kind === 'batch' ? t(`إضافة ${count} كروت`, `Add ${count} cards`) : t('إضافة وإرسال', 'Add & send')}</Button></div>
      </>}
    </DialogContent>
  </Dialog>;
}
