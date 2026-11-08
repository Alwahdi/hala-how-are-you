import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { ArrowUpLeft, ArrowUpRight, CheckCircle2, Loader2, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { earlyAccessSchema } from '@/lib/early-access';
import { requestEarlyAccess } from '@/lib/early-access.functions';

export function EarlyAccessForm({ ar }: { ar: boolean }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dial, setDial] = useState('+967');
  const [method, setMethod] = useState<'whatsapp' | 'email'>('whatsapp');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [invalid, setInvalid] = useState(false);
  const submit = useServerFn(requestEarlyAccess);
  const t = (a: string, b: string) => ar ? a : b;
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  if (state === 'success') return <div role="status" className="request-success"><CheckCircle2 className="text-primary size-8"/><h3>{t('وصل طلبك. شكراً لاهتمامك!','Your request is saved. Thank you!')}</h3><p>{t('حفظنا وسيلة التواصل التي اخترتها. لا توجد رسالة تلقائية أو موعد تجربة مؤكد الآن.','We saved your chosen contact details. No automatic message or confirmed trial date yet.')}</p></div>;
  return <form noValidate onSubmit={async e => {
    e.preventDefault();
    if (state === 'loading') return;
    const sourceValue = new URLSearchParams(window.location.search).get('utm_medium');
    const source = sourceValue === 'referral' ? 'referral' : sourceValue ? 'campaign' : 'direct';
    const parsed = earlyAccessSchema.safeParse({ contactMethod: method, contactValue: method === 'email' ? email : dial + phone.replace(/[\s()-]/g, ''), language: ar ? 'ar' : 'en', source, website: new FormData(e.currentTarget).get('website') || '' });
    setInvalid(!parsed.success);
    if (!parsed.success) return;
    setState('loading');
    try { const result = await submit({ data: parsed.data }); setState(result.ok ? 'success' : 'error'); }
    catch { setState('error'); }
  }} className="request-form">
    <fieldset className="mb-6" disabled={state === 'loading'}><legend className="text-sm font-semibold mb-3">{t('كيف نقدر نتواصل معك؟','How can we reach you?')}</legend><div className="flex gap-2"><Button type="button" variant={method === 'whatsapp' ? 'default' : 'outline'} aria-pressed={method === 'whatsapp'} onClick={() => {setMethod('whatsapp');setInvalid(false);}}><MessageCircle/>WhatsApp</Button><Button type="button" variant={method === 'email' ? 'default' : 'outline'} aria-pressed={method === 'email'} onClick={() => {setMethod('email');setInvalid(false);}}><Mail/>{t('البريد','Email')}</Button></div></fieldset>
    <label htmlFor="early-contact" className="block mb-3 text-sm font-semibold">{method === 'email' ? t('بريدك الإلكتروني','Your email address') : t('رقمك على WhatsApp','Your WhatsApp number')}</label>
    <div className="request-fields">{method === 'email' ? <Input id="early-contact" type="email" dir="ltr" autoComplete="email" maxLength={254} value={email} onChange={e => {setEmail(e.target.value);setInvalid(false);}} placeholder="you@example.com" aria-invalid={invalid} aria-describedby="request-note request-error" disabled={state === 'loading'}/> : <div className="phone-fields" dir="ltr"><label className="sr-only" htmlFor="early-dial">{t('مفتاح الدولة','Country calling code')}</label><Input id="early-dial" type="tel" autoComplete="tel-country-code" value={dial} maxLength={5} onChange={e=>{setDial(e.target.value);setInvalid(false);}} aria-describedby="phone-note" disabled={state === 'loading'}/><Input id="early-contact" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={20} value={phone} onChange={e=>{setPhone(e.target.value);setInvalid(false);}} placeholder="777 123 456" aria-invalid={invalid} aria-describedby="phone-note request-error request-note" disabled={state === 'loading'}/></div>}{method === 'whatsapp' && <p id="phone-note" className="text-xs text-muted-foreground">{t('غيّر مفتاح الدولة إذا كان رقمك خارج اليمن. لا ترسل بيانات الراوتر.','Change the calling code if your number is outside Yemen. No router details needed.')}</p>}<Button type="submit" disabled={state === 'loading'}>{state === 'loading' ? <Loader2 className="animate-spin"/> : <Arrow/>}{state === 'loading' ? t('جارٍ حفظ طلبك…','Saving your request…') : t('سجّل اهتمامك','Join early access')}</Button></div>
    <div className="form-trap" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off"/></div>
    <p id="request-error" role="alert" className="text-destructive mt-3 text-sm">{invalid ? method === 'email' ? t('راجع البريد، مثل name@example.com.','Check your email, for example name@example.com.') : t('راجع الرقم ومفتاح الدولة، مثل +967.','Check your number and calling code, for example +967.') : state === 'error' ? t('ما قدرنا نحفظ طلبك. بياناتك ما زالت هنا؛ جرّب مرة ثانية.','Your request could not be saved. Please try again.') : ''}</p>
    <p id="request-note" className="text-muted-foreground text-xs mt-4 leading-7">{t('نحفظ وسيلة التواصل لمتابعة اهتمامك فقط. لا دفع ولا رسائل تلقائية.','We save your contact details for early-access follow-up only. No payment or automatic messages.')} <Link to="/privacy" className="underline underline-offset-4">{t('إشعار الخصوصية','Privacy notice')}</Link></p>
  </form>;
}