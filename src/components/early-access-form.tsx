import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { ArrowUpLeft, ArrowUpRight, CheckCircle2, Loader2, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { earlyAccessSchema } from '@/lib/early-access';
import { requestEarlyAccess } from '@/lib/early-access.functions';
import { useEarlyAccess } from './early-access-context';
import { contactValue, splitInternationalInput } from '@/lib/contact-input';

export function EarlyAccessForm({ ar }: { ar: boolean }) {
  const { draft, setDraft, state, setState } = useEarlyAccess();
  const { email, phone, dial, method } = draft;
  const [invalid, setInvalid] = useState<'contact' | 'dial' | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const edit = (change: Partial<typeof draft>) => {setDraft({...draft, ...change});setInvalid(null);if (state === 'error') setState('idle');};
  useEffect(() => { if (state === 'success') successRef.current?.focus(); }, [state]);
  const submit = useServerFn(requestEarlyAccess);
  const t = (a: string, b: string) => ar ? a : b;
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  if (state === 'success') return <div id="request-confirmation" ref={successRef} tabIndex={-1} role="status" className="request-success"><CheckCircle2 className="text-primary size-8"/><h3>{t('وصل طلبك. شكراً لاهتمامك!','Your request is saved. Thank you!')}</h3><p>{t('حفظنا وسيلة التواصل التي اخترتها. لا توجد رسالة تلقائية أو موعد تجربة مؤكد الآن.','We saved your chosen contact details. No automatic message or confirmed trial date yet.')}</p></div>;
  return <form noValidate onSubmit={async e => {
    e.preventDefault();
    if (state === 'loading') return;
    const sourceValue = new URLSearchParams(window.location.search).get('utm_medium');
    const source = sourceValue === 'referral' ? 'referral' : sourceValue ? 'campaign' : 'direct';
    const parsed = earlyAccessSchema.safeParse({ contactMethod: method, contactValue: method === 'email' ? email : contactValue(phone, dial), language: ar ? 'ar' : 'en', source, website: new FormData(e.currentTarget).get('website') || '' });
    if (!parsed.success) {
      const field = method === 'whatsapp' && !/^\+\d{1,3}$/.test(dial.trim()) ? 'dial' : 'contact';
      setInvalid(field);
      document.getElementById(field === 'dial' ? 'early-dial' : 'early-contact')?.focus();
      return;
    }
    setInvalid(null);
    setState('loading');
    try { const result = await submit({ data: parsed.data }); setState(result.ok ? 'success' : 'error'); }
    catch { setState('error'); }
  }} className="request-form" aria-busy={state === 'loading'}>
    <p className="sr-only" role="status" aria-live="polite">{state === 'loading' ? t('جارٍ حفظ طلبك…','Saving your request…') : ''}</p>
    <fieldset id="request-start" tabIndex={-1} className="mb-6" disabled={state === 'loading'}><legend className="text-sm font-semibold mb-3">{t('كيف نقدر نتواصل معك؟','How can we reach you?')}</legend><div className="flex gap-2"><Button type="button" variant={method === 'whatsapp' ? 'default' : 'outline'} aria-pressed={method === 'whatsapp'} onClick={() => edit({method: 'whatsapp'})}><MessageCircle/>WhatsApp</Button><Button type="button" variant={method === 'email' ? 'default' : 'outline'} aria-pressed={method === 'email'} onClick={() => edit({method: 'email'})}><Mail/>{t('البريد','Email')}</Button></div></fieldset>
    <label htmlFor="early-contact" className="block mb-3 text-sm font-semibold">{method === 'email' ? t('بريدك الإلكتروني','Your email address') : t('رقمك على WhatsApp','Your WhatsApp number')}</label>
    <div className="request-fields">{method === 'email' ? <Input id="early-contact" type="email" dir="ltr" autoComplete="email" maxLength={254} value={email} onChange={e => edit({email:e.target.value})} placeholder="you@example.com" required aria-invalid={invalid === 'contact'} aria-describedby="request-note request-error" disabled={state === 'loading'}/> : <div className="phone-fields" dir="ltr"><div className="phone-field"><label className="block text-xs text-muted-foreground mb-2" htmlFor="early-dial">{t('مفتاح الدولة','Country calling code')}</label><Input id="early-dial" type="tel" autoComplete="tel-country-code" value={dial} maxLength={5} onChange={e=>edit({dial:e.target.value})} required aria-invalid={invalid === 'dial'} aria-describedby="phone-note request-error" disabled={state === 'loading'}/></div><div className="phone-field"><label htmlFor="early-contact" className="block text-xs text-muted-foreground mb-2">{t('الرقم بدون المفتاح','Number without calling code')}</label><Input id="early-contact" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={20} value={phone} onChange={e=>edit(splitInternationalInput(e.target.value, dial))} placeholder="777 123 456" required aria-invalid={invalid === 'contact'} aria-describedby="phone-note request-error request-note" disabled={state === 'loading'}/></div></div>}{method === 'whatsapp' && <p id="phone-note" className="text-xs text-muted-foreground">{t('مثال: المفتاح +967 والرقم 777123456. غيّر المفتاح لبلد رقمك؛ ويمكنك لصق الرقم الدولي كاملاً.','Example: code +967, number 777123456. Use your number’s country code, or paste a full international number.')}</p>}<Button type="submit" disabled={state === 'loading'}>{state === 'loading' ? <Loader2 className="animate-spin"/> : <Arrow/>}{state === 'loading' ? t('جارٍ حفظ طلبك…','Saving your request…') : t('سجّل اهتمامك','Join early access')}</Button></div>
    <div className="form-trap" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off"/></div>
    <p id="request-error" role="alert" className="text-destructive mt-3 text-sm">{invalid === 'dial' ? t('اكتب مفتاح الدولة مع +، مثل +967 أو +44.','Enter the country calling code with +, such as +967 or +44.') : invalid ? method === 'email' ? t('راجع البريد، مثل name@example.com.','Check your email, for example name@example.com.') : t('راجع الرقم ومفتاح الدولة، مثل +967.','Check your number and calling code, for example +967.') : state === 'error' ? t('ما قدرنا نحفظ طلبك. بياناتك ما زالت هنا؛ جرّب مرة ثانية.','We could not save your request. Your details are still here; please try again.') : ''}</p>
    <Button type="button" variant="ghost" className="mt-2" onClick={()=>{document.getElementById('page-top')?.scrollIntoView({behavior:'auto'});document.getElementById('page-top')?.focus({preventScroll:true});}}>{t('العودة إلى الصفحة','Back to the page')}</Button>
    <p id="request-note" className="text-muted-foreground text-xs mt-4 leading-7">{t('نحفظ وسيلة التواصل لمتابعة اهتمامك فقط. لا دفع ولا رسائل تلقائية.','We save your contact details for early-access follow-up only. No payment or automatic messages.')} <Link to="/privacy" className="underline underline-offset-4">{t('إشعار الخصوصية','Privacy notice')}</Link></p>
  </form>;
}