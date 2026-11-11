import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, ImageDown, MessageCircle, MessageSquareText, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildCustomerMessage, smsLink, whatsappLink, type DemoCard, type Language, type Tone } from '@/lib/specimen-data';
import { renderReportImage, shareReport } from '@/lib/report-image';

type Props = { card: DemoCard; ar: boolean; onBack?: (() => void) | undefined; backLabel?: string; buildMessage?: ((lang: Language) => string) | undefined };
/** Prepares a customer message. The owner always chooses the contact and presses send; nothing is sent automatically. */
export function CustomerReply({ card, ar, onBack, backLabel, buildMessage }: Props) {
  const t = (a: string, b: string) => ar ? a : b;
  const [lang, setLang] = useState<Language>(ar ? 'ar' : 'en'); const [tone, setTone] = useState<Tone>('short');
  const [phone, setPhone] = useState(''); const [status, setStatus] = useState('');
  const msg = buildMessage ? buildMessage(lang) : buildCustomerMessage(card, lang, tone);
  const isReport = !buildMessage && card.downloadMB + card.uploadMB > 0;
  const Back = ar ? ArrowRight : ArrowLeft; const seg = (on: boolean) => on ? 'default' : 'outline';
  const copy = async () => { try { await navigator.clipboard.writeText(msg); setStatus(t('تم نسخ الرسالة', 'Message copied')); } catch { setStatus(t('تعذر النسخ، حدد النص وانسخه يدوياً', 'Could not copy. Select the text and copy it.')); } };
  const withImage = async () => {
    setStatus(t('جارٍ تجهيز الصورة…', 'Preparing image…'));
    const r = await shareReport(card, lang === 'ar', msg);
    if (r === 'shared') setStatus(t('اختر WhatsApp من القائمة؛ الصورة والنص يصلان معاً', 'Pick WhatsApp from the menu; image and text go together'));
    else if (r === 'cancelled') setStatus(t('أُلغيت المشاركة', 'Sharing cancelled'));
    else { setStatus(t('جهازك لا يدعم إرسال الصورة مع النص مباشرة؛ نزّلنا الصورة وفتحنا WhatsApp بالنص لترفقها', 'Your device cannot share image and text together; the image was downloaded and WhatsApp opened with the text so you can attach it')); window.open(whatsappLink(msg, phone), '_blank', 'noopener'); }
  };
  const image = async () => { const blob = await renderReportImage(card, lang === 'ar'); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${card.id}-report.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); setStatus(t('تم تنزيل الصورة', 'Image downloaded')); };
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  return <div className="reply-step">
    {onBack && <Button variant="ghost" className="self-start" onClick={onBack}><Back/>{backLabel ?? t('رجوع للتفاصيل', 'Back to details')}</Button>}
    <div className="reply-options">
      <div role="group" aria-label={t('لغة الرسالة', 'Message language')}><Button size="sm" variant={seg(lang === 'ar')} onClick={() => setLang('ar')}>عربي</Button><Button size="sm" variant={seg(lang === 'en')} onClick={() => setLang('en')}>English</Button></div>
      {isReport && <div role="group" aria-label={t('طول الرسالة', 'Message length')}><Button size="sm" variant={seg(tone === 'short')} onClick={() => setTone('short')}>{t('مختصرة', 'Short')}</Button><Button size="sm" variant={seg(tone === 'detailed')} onClick={() => setTone('detailed')}>{t('مع الجلسات', 'With sessions')}</Button></div>}
    </div>
    <pre className="reply-preview" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} aria-label={t('معاينة الرسالة', 'Message preview')}>{msg}</pre>
    <label className="reply-phone"><span>{t('رقم الزبون (اختياري)', 'Customer number (optional)')}</span>
      <Input type="tel" inputMode="tel" dir="ltr" autoComplete="off" enterKeyHint="done" placeholder="+967 7XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}/>
      <small>{t('بدونه تختار جهة الاتصال داخل WhatsApp أو الرسائل.', 'Without it, you pick the contact in WhatsApp or Messages.')}</small></label>
    <div className="reply-actions">
      {isReport && <Button className="reply-primary" onClick={withImage}><MessageCircle/>{t('WhatsApp مع صورة التقرير', 'WhatsApp with report image')}</Button>}
      <Button variant={isReport ? 'outline' : 'default'} asChild><a href={whatsappLink(msg, phone)} target="_blank" rel="noopener noreferrer"><MessageCircle/>{isReport ? t('WhatsApp نص فقط', 'WhatsApp text only') : t('إرسال عبر WhatsApp', 'Send via WhatsApp')}</a></Button>
      <Button variant="outline" asChild><a href={smsLink(msg, phone)}><MessageSquareText/>{t('رسالة SMS', 'SMS')}</a></Button>
      <Button variant="outline" onClick={copy}><Copy/>{t('نسخ النص', 'Copy text')}</Button>
      {isReport && <Button variant="outline" onClick={image}><ImageDown/>{t('تنزيل الصورة', 'Download image')}</Button>}
      {!isReport && canShare && <Button variant="outline" onClick={() => navigator.share({ text: msg }).catch(() => {})}><Share2/>{t('مشاركة', 'Share')}</Button>}
    </div>
    <p role="status" aria-live="polite" className="reply-status">{status && <><Check size={14}/>{status}</>}</p>
  </div>;
}
