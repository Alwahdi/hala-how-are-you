import { useState } from 'react';
import { ArrowLeft, ArrowRight, MessageSquareWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DemoCard } from '@/lib/specimen-data';

export type ComplaintReason = 'fast' | 'slow' | 'connect';
export type Complaint = { id: number; cardId: string; reason: ComplaintReason; customer: string };
export const reasonLabel = (r: ComplaintReason, ar: boolean) => ({ fast: ar ? 'الكرت خلص بسرعة' : 'Finished fast', slow: ar ? 'الإنترنت بطيء' : 'Slow internet', connect: ar ? 'لا يستطيع الاتصال' : 'Cannot connect' })[r];

export function ComplaintForm({ card, ar, onBack, onSave }: { card: DemoCard; ar: boolean; onBack: () => void; onSave: (c: Complaint) => void }) {
  const t = (a: string, b: string) => ar ? a : b; const Back = ar ? ArrowRight : ArrowLeft;
  const [reason, setReason] = useState<ComplaintReason>('fast'); const [customer, setCustomer] = useState('');
  return <form className="reply-step" onSubmit={e => { e.preventDefault(); onSave({ id: Date.now(), cardId: card.id, reason, customer: customer.trim().slice(0, 40) }); }}>
    <Button type="button" variant="ghost" className="self-start" onClick={onBack}><Back/>{t('رجوع للتفاصيل', 'Back to details')}</Button>
    <fieldset className="flex flex-col gap-2"><legend className="mb-2 text-sm font-semibold">{t('سبب الشكوى', 'Reason')}</legend>
      {(['fast', 'slow', 'connect'] as const).map(r => <label key={r} className="reason-option"><input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)}/>{reasonLabel(r, ar)}</label>)}
    </fieldset>
    <label className="flex flex-col gap-2 text-sm">{t('اسم الزبون (اختياري)', 'Customer name (optional)')}<Input value={customer} maxLength={40} onChange={e => setCustomer(e.target.value)}/></label>
    <p className="text-xs text-muted-foreground">{t('في هذا العرض تبقى الشكوى في الصفحة فقط وتختفي عند إعادة التحميل؛ لا نحفظ أي بيانات.', 'In this demo the complaint stays on this page only and disappears on reload; nothing is saved.')}</p>
    <Button type="submit"><MessageSquareWarning/>{t('تسجيل الشكوى', 'Log complaint')}</Button>
  </form>;
}

export function ComplaintList({ items, ar }: { items: Complaint[]; ar: boolean }) {
  const t = (a: string, b: string) => ar ? a : b;
  if (!items.length) return null;
  return <div className="complaint-list" role="status" aria-live="polite"><p className="text-sm font-semibold">{t('شكاوى اليوم (تجريبي)', 'Complaints today (demo)')}</p>
    <ul>{items.map(c => <li key={c.id}><MessageSquareWarning size={14} aria-hidden="true"/><bdi dir="ltr">{c.cardId}</bdi> · {reasonLabel(c.reason, ar)}{c.customer && <> · <bdi>{c.customer}</bdi></>}</li>)}</ul></div>;
}
