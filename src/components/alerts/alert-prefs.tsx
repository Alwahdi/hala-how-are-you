import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { confirmedWrite } from '@/lib/operations-ui';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type Prefs = { router_down: boolean; router_strain: boolean; cards_low: boolean; daily_report: boolean; health: boolean; auto_cleanup: boolean; cleanup_after_days: number; report_hour: number; utc_offset_min: number };
const DEFAULTS: Prefs = { router_down: true, router_strain: true, cards_low: true, daily_report: true, health: true, auto_cleanup: true, cleanup_after_days: 3, report_hour: 21, utc_offset_min: 180 };

/** One switch per alert type, the daily report hour, and nightly cleanup of used-up cards. Saved instantly. */
export function AlertPrefs({ ar }: { ar: boolean }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const qc = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ['alert-prefs'], queryFn: async () => { const { data,error } = await supabase.from('alert_prefs').select('*').maybeSingle(); if(error)throw error;return data as Prefs | null; } });
  const [p, setP] = useState<Prefs>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    if (data) setP({ ...DEFAULTS, ...data });
    else setP({ ...DEFAULTS, utc_offset_min: -new Date().getTimezoneOffset() });
  }, [data]);
  async function update(next: Partial<Prefs>) {
    if (saving) return;
    const previous = p; const merged = { ...p, ...next };
    setP(merged); setSaving(true); setSaveError(false);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('signed_out');
      await confirmedWrite(() => supabase.from('alert_prefs').upsert({ owner_id: u.user.id, ...merged, utc_offset_min: -new Date().getTimezoneOffset(), updated_at: new Date().toISOString() }));
      qc.invalidateQueries({ queryKey: ['alert-prefs'] });
    } catch { setP(previous); setSaveError(true); }
    finally { setSaving(false); }
  }
  const rows: { k: keyof Prefs; ar: string; en: string; subAr: string; subEn: string }[] = [
    { k: 'router_down', ar: 'انقطاع الراوتر ورجوعه', en: 'Router down / back up', subAr: 'بعد 3 دقائق بدون إشارة', subEn: 'After 3 minutes without a signal' },
    { k: 'router_strain', ar: 'ضغط على الراوتر', en: 'Router under strain', subAr: 'المعالج، الذاكرة، الحرارة، إعادة تشغيل مفاجئة', subEn: 'CPU, memory, heat, unexpected restart' },
    { k: 'cards_low', ar: 'قرب نفاد الكروت الجاهزة', en: 'Ready cards running low', subAr: 'أقل من 20 كرت في باقة', subEn: 'Under 20 cards in a package' },
    { k: 'health', ar: 'مشاكل خطيرة في صحة الراوتر', en: 'Serious router health problems', subAr: 'ثغرات، علامات اختراق، تاريخ خاطئ، امتلاء', subEn: 'Vulnerabilities, break-in signs, wrong date, full storage' },
    { k: 'daily_report', ar: 'التقرير اليومي', en: 'Daily report', subAr: 'المتصلون، الكروت، الانقطاعات', subEn: 'Users, cards, outages' },
  ];
  return (
    <section className="mt-6 space-y-1 border-t border-border py-6">
      <h2 className="flex items-center gap-2 text-lg font-bold">{t('ماذا يصلك', 'What reaches you')}{saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}</h2>
      {isPending && <p role="status" className="py-3 text-sm text-muted-foreground">{t('جارٍ قراءة الإعدادات…','Loading preferences…')}</p>}
      {isError && <div className="py-3"><p role="alert" className="text-sm text-destructive">{t('تعذر قراءة الإعدادات.','Could not load preferences.')}</p><Button variant="outline" onClick={()=>{void refetch();}}>{t('أعد المحاولة','Retry')}</Button></div>}
      {saveError && <p role="alert" className="py-2 text-sm text-destructive">{t('ما انحفظ التغيير؛ رجعنا الاختيار المحفوظ. حاول مرة أخرى.', 'Change not saved; restored the saved choice. Please retry.')}</p>}
      {rows.map((r) => (
        <div key={r.k} className="grid grid-cols-[minmax(0,1fr)_auto] min-h-16 items-center gap-4 border-b border-border/50 py-2 last:border-0">
          <Label htmlFor={`pref-${r.k}`} className="min-w-0 cursor-pointer"><b className="block">{ar ? r.ar : r.en}</b><span className="text-xs font-normal text-muted-foreground">{ar ? r.subAr : r.subEn}</span></Label>
          <Switch disabled={saving || isPending || isError} id={`pref-${r.k}`} checked={p[r.k] as boolean} onCheckedChange={(v) => update({ [r.k]: v })} />
        </div>
      ))}
      {p.daily_report && (
        <div className="flex items-center justify-between gap-3 py-2">
          <Label htmlFor="report-hour">{t('وقت التقرير', 'Report time')}</Label>
          <select disabled={saving || isPending || isError} id="report-hour" value={p.report_hour} onChange={(e) => update({ report_hour: Number(e.target.value) })} className="h-11 rounded-lg border border-border bg-background px-3" dir="ltr">
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
          </select>
        </div>
      )}
      <h3 className="pt-4 font-bold">{t('الصيانة الليلية التلقائية', 'Automatic night maintenance')}</h3>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] min-h-16 items-center gap-4 py-2">
        <Label htmlFor="pref-clean" className="min-w-0 cursor-pointer"><b className="block">{t('إزالة الكروت المنتهية الساعة 3 فجراً', 'Remove used-up cards at 3 am')}</b><span className="text-xs font-normal text-muted-foreground">{t('Hotspot فقط. الراوتر يتأكد من كل كرت قبل حذفه، ويصلك تقرير.', 'Hotspot only. The router re-checks each card before removing it, and you get a report.')}</span></Label>
        <Switch disabled={saving || isPending || isError} id="pref-clean" checked={p.auto_cleanup} onCheckedChange={(v) => update({ auto_cleanup: v })} />
      </div>
      {p.auto_cleanup && (
        <div className="flex items-center justify-between gap-3 py-2">
          <Label htmlFor="clean-days">{t('بعد انتهاء الكرت بـ', 'Days after a card ends')}</Label>
          <select disabled={saving || isPending || isError} id="clean-days" value={p.cleanup_after_days} onChange={(e) => update({ cleanup_after_days: Number(e.target.value) })} className="h-11 rounded-lg border border-border bg-background px-3">
            {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{ar ? `${d} ${d === 1 ? 'يوم' : 'أيام'}` : `${d} day${d > 1 ? 's' : ''}`}</option>)}
          </select>
        </div>
      )}
    </section>
  );
}
