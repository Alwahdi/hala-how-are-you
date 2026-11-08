import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { ArrowUpLeft, ArrowUpRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { earlyAccessSchema } from '@/lib/early-access';
import { requestEarlyAccess } from '@/lib/early-access.functions';

export function EarlyAccessForm({ ar }: { ar: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [invalid, setInvalid] = useState(false);
  const submit = useServerFn(requestEarlyAccess);
  const t = (a: string, b: string) => ar ? a : b;
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  if (state === 'success') return <div role="status" className="request-success"><CheckCircle2 className="text-primary size-8"/><h3>{t('وصل طلبك. شكراً لاهتمامك!','Your request is saved. Thank you!')}</h3><p>{t('هذا طلب وصول مبكر، وليس تفعيل حساب أو قبولاً في تجربة جاهزة.','This is an early-access request, not an activated account or an accepted trial.')}</p></div>;
  return <form noValidate onSubmit={async e => {
    e.preventDefault();
    if (state === 'loading') return;
    const sourceValue = new URLSearchParams(window.location.search).get('utm_medium');
    const source = sourceValue === 'referral' ? 'referral' : sourceValue ? 'campaign' : 'direct';
    const parsed = earlyAccessSchema.safeParse({ email, language: ar ? 'ar' : 'en', source, website: new FormData(e.currentTarget).get('website') || '' });
    setInvalid(!parsed.success);
    if (!parsed.success) return;
    setState('loading');
    try { const result = await submit({ data: parsed.data }); setState(result.ok ? 'success' : 'error'); }
    catch { setState('error'); }
  }} className="request-form">
    <label htmlFor="early-email" className="block mb-3 text-sm font-semibold">{t('بريدك الإلكتروني','Your email address')}</label>
    <div className="request-fields"><Input id="early-email" type="email" dir="ltr" autoComplete="email" maxLength={254} value={email} onChange={e => {setEmail(e.target.value); setInvalid(false);}} placeholder="you@example.com" aria-invalid={invalid} aria-describedby="request-note request-error" disabled={state === 'loading'}/><Button type="submit" disabled={state === 'loading'}>{state === 'loading' ? <Loader2 className="animate-spin"/> : <Arrow/>}{t('اطلب الوصول المبكر','Request early access')}</Button></div>
    <div className="form-trap" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off"/></div>
    <p id="request-error" role="alert" className="text-destructive mt-3 text-sm">{invalid ? t('أدخل بريداً إلكترونياً صحيحاً.','Please enter a valid email address.') : state === 'error' ? t('لم يُحفظ الطلب. بريدك موجود؛ حاول مرة أخرى.','Your request could not be saved. Please try again.') : ''}</p>
    <p id="request-note" className="text-muted-foreground text-xs mt-4 leading-7">{t('نحفظ بريدك لمتابعة طلب الوصول المبكر. لا دفع ولا بيانات راوتر.','Your email is saved to follow up on early access. No payment or router details.')} <Link to="/privacy" className="underline underline-offset-4">{t('إشعار الخصوصية','Privacy notice')}</Link></p>
  </form>;
}