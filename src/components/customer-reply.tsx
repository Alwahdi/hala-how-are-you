import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, ImageDown, MessageCircle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildCustomerMessage, type DemoCard, type Language, type Tone } from '@/lib/specimen-data';
import { renderReportImage } from '@/lib/report-image';

type Props = { card: DemoCard; ar: boolean; onBack?: (() => void) | undefined; backLabel?: string; buildMessage?: ((lang: Language) => string) | undefined };
export function CustomerReply({ card, ar, onBack, backLabel, buildMessage }: Props) {
  const t = (a: string, b: string) => ar ? a : b;
  const [lang, setLang] = useState<Language>(ar ? 'ar' : 'en'); const [tone, setTone] = useState<Tone>('short');
  const [status, setStatus] = useState(''); const msg = buildMessage ? buildMessage(lang) : buildCustomerMessage(card, lang, tone); const isNew = !!buildMessage || (!!card.code && card.downloadMB + card.uploadMB === 0);
  const Back = ar ? ArrowRight : ArrowLeft;
  const copy = async () => { try { await navigator.clipboard.writeText(msg); setStatus(t('تم نسخ الرسالة', 'Message copied')); } catch { setStatus(t('تعذر النسخ، حدد النص وانسخه يدوياً', 'Could not copy. Select the text and copy it.')); } };
  const image = async () => { setStatus(t('جارٍ تجهيز الصورة…', 'Preparing image…')); const blob = await renderReportImage(card, lang === 'ar'); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${card.id}-report.png`; a.click(); URL.revokeObjectURL(a.href); setStatus(t('تم تنزيل الصورة', 'Image downloaded')); };
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const seg = (on: boolean) => on ? 'default' : 'outline';
  return <div className="reply-step">
    {onBack && <Button variant="ghost" className="self-start" onClick={onBack}><Back/>{backLabel ?? t('رجوع للتفاصيل', 'Back to details')}</Button>}
    <p className="text-sm text-muted-foreground">{t('رسالة جاهزة للزبون. أنت من يختار جهة الاتصال ويرسل.', 'A ready message for your customer. You choose the contact and send it.')}</p>
    <div className="reply-options">
      <div role="group" aria-label={t('لغة الرسالة', 'Message language')}><Button size="sm" variant={seg(lang === 'ar')} onClick={() => setLang('ar')}>عربي</Button><Button size="sm" variant={seg(lang === 'en')} onClick={() => setLang('en')}>English</Button></div>
      {!isNew && <div role="group" aria-label={t('طول الرسالة', 'Message length')}><Button size="sm" variant={seg(tone === 'short')} onClick={() => setTone('short')}>{t('مختصرة', 'Short')}</Button><Button size="sm" variant={seg(tone === 'detailed')} onClick={() => setTone('detailed')}>{t('مع الجلسات', 'With sessions')}</Button></div>}
    </div>
    <pre className="reply-preview" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} aria-label={t('معاينة الرسالة', 'Message preview')}>{msg}</pre>
    <div className="reply-actions">
      <Button onClick={copy}><Copy/>{t('نسخ النص', 'Copy text')}</Button>
      <Button variant="outline" asChild><a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"><MessageCircle/>{t('إرسال عبر WhatsApp', 'Send via WhatsApp')}</a></Button>
      <Button variant="outline" onClick={image}><ImageDown/>{t('تنزيل كصورة', 'Download as image')}</Button>
      {canShare && <Button variant="outline" onClick={() => navigator.share({ text: msg }).catch(() => {})}><Share2/>{t('مشاركة', 'Share')}</Button>}
    </div>
    <p role="status" aria-live="polite" className="reply-status">{status && <><Check size={14}/>{status}</>}</p>
  </div>;
}
