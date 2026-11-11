import { useState } from 'react';
import { Check, Copy, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Guided User Manager setup: plain steps with one-line commands. Nothing runs on the router until the owner pastes it.
type Step = { ar: string; en: string; cmd?: string; note?: [string, string] };
const INSTALL: Step = { ar: 'ثبّت حزمة User Manager', en: 'Install the User Manager package', note: ['من mikrotik.com/download نزّل «Extra packages» لنفس إصدارك ونوع الجهاز، ارفع user-manager-*.npk في Files، ثم أعد تشغيل الراوتر.', 'From mikrotik.com/download get "Extra packages" for your exact version and device, upload user-manager-*.npk to Files, then reboot.'] };
const RADIUS: Step = { ar: 'اربط الهوتسبوت به', en: 'Connect the hotspot to it', cmd: '/radius add service=hotspot address=127.0.0.1 secret={SECRET}; /ip hotspot profile set [find] use-radius=yes' };
const RELINK: Step = { ar: 'أعد الربط في Mikro', en: 'Reconnect in Mikro', note: ['من «المزيد ← الراوترات» اضغط «إعادة الربط» والصق الأمر؛ نبدأ قراءة كروت وباقات User Manager تلقائياً.', 'In More → Routers tap Reconnect and paste the command; we start reading User Manager cards and packages automatically.'] };
const STEPS_V7: Step[] = [INSTALL, { ar: 'شغّل User Manager', en: 'Turn User Manager on', cmd: '/user-manager set enabled=yes; /user-manager router add name=local address=127.0.0.1 shared-secret={SECRET}' }, RADIUS, RELINK];
// v6 keeps User Manager under /tool and ships a default "admin" customer.
const STEPS_V6: Step[] = [INSTALL, { ar: 'عرّف الراوتر عند User Manager', en: 'Add this router to User Manager', cmd: '/tool user-manager router add subscriber=admin ip-address=127.0.0.1 shared-secret={SECRET}' }, RADIUS, RELINK];

export function UserManagerSetup({ ar, v7 }: { ar: boolean; v7: boolean }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const [copied, setCopied] = useState<number | null>(null);
  // Local RADIUS secret between hotspot and User Manager on the same router; random per visit, never stored.
  const [secret] = useState(() => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join(''));
  return (
    <section className="app-panel p-5">
      <p className="flex items-center gap-2 font-bold"><Server className="size-5 text-primary" />{t('ما لقينا User Manager على راوتراتك', "We didn't find User Manager on your routers")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t(`4 خطوات لتجهيزه على ${v7 ? 'v7' : 'v6'}. لو تستخدم Hotspot فقط، ما تحتاجه.`, `Four steps to set it up on ${v7 ? 'v7' : 'v6'}. If you only use Hotspot, you do not need it.`)}</p>
      {(
        <ol className="mt-4 space-y-3">
          {(v7 ? STEPS_V7 : STEPS_V6).map((s, i) => (
            <li key={s.en} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary" dir="ltr">{i + 1}</span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-semibold">{ar ? s.ar : s.en}</p>
                {s.note && <p className="text-xs text-muted-foreground">{ar ? s.note[0] : s.note[1]}</p>}
                {s.cmd && (() => { const cmd = s.cmd.split('{SECRET}').join(secret); return (
                  <div className="flex items-center gap-2">
                    <code dir="ltr" className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs">{cmd}</code>
                    <Button variant="outline" size="icon" className="size-11 shrink-0" aria-label={t('نسخ', 'Copy')} onClick={() => { navigator.clipboard.writeText(cmd + '\n'); setCopied(i); setTimeout(() => setCopied(null), 2000); }}>{copied === i ? <Check /> : <Copy />}</Button>
                  </div>
                ); })()}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
