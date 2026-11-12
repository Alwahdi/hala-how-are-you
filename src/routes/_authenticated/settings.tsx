import { PageHeading } from '@/components/account/page-heading';
import { PageLanguage } from '@/components/page-language';
import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ArrowLeft, Check, KeyRound, Loader2, Sparkles, Ticket, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_STYLE, detectStyle, sampleCard, type CardStyle } from '@/lib/card-style';
import { updateNetworkInfo } from '@/lib/profile.functions';
import type { Source } from '@/components/dashboard/types';
import { EnableAlerts } from '@/components/alerts/enable-alerts';
import { confirmedWrite } from '@/lib/operations-ui';
import { AlertPrefs } from '@/components/alerts/alert-prefs';

export const Route = createFileRoute('/_authenticated/settings')({
  head: () => ({ meta: [
    { title: 'Mikro — إعدادات الشبكة' },
    { name: 'description', content: 'Set your card style once: number only or number with a code, length and prefix.' },
    { property: 'og:title', content: 'Mikro — Network settings' },
    { property: 'og:description', content: 'Card style and network details for your Mikro account.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: SettingsPage,
});

type Saved = CardStyle & { source: string; confirmed: boolean };

function SettingsPage() {
  const { ar } = useLanguage();
  const t = (a: string, b: string) => (ar ? a : b);
  const qc = useQueryClient();
  const [source, setSource] = useState<Source>('hotspot');
  const { data: samples = [], isError: samplesError } = useQuery({ queryKey: ['style-samples'], queryFn: async () => { const { data,error } = await supabase.from('router_cards').select('source, name, pw_mode').order('first_seen_at', { ascending: false }).limit(200); if(error)throw error;return data ?? []; } });
  const { data: saved = [], isPending: savedLoading, isError: savedError, refetch: retrySaved } = useQuery({ queryKey: ['card-style-full'], queryFn: async () => { const { data,error } = await supabase.from('network_settings').select('*'); if(error)throw error;return (data ?? []) as Saved[]; } });
  const { data: profile, isError: profileError, refetch: retryProfile } = useQuery({ queryKey: ['profile-edit'], queryFn: async () => { const { data: u } = await supabase.auth.getUser(); const { data,error } = await supabase.from('profiles').select('network_name, city').eq('id', u.user?.id ?? '').maybeSingle(); if(error)throw error;return data; } });

  const guess = useMemo(() => detectStyle(samples.filter((c) => c.source === source)), [samples, source]);
  const current = saved.find((s) => s.source === source);
  const [style, setStyle] = useState<CardStyle>(DEFAULT_STYLE);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    const base = current ?? guess ?? DEFAULT_STYLE;
    setStyle({ mode: base.mode, length: base.length, charset: base.charset, prefix: base.prefix });
    setEditing(!current && !guess); setDone(false);
  }, [current, guess, source]);
  const preview = useMemo(() => [0, 1, 2].map(() => sampleCard(style)), [style]);

  async function save() {
    setBusy(true); setSaveError(false); setDone(false);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('signed_out');
      await confirmedWrite(() => supabase.from('network_settings').upsert({ owner_id: u.user.id, source, ...style, confirmed: true, updated_at: new Date().toISOString() }));
      setEditing(false); setDone(true);
      qc.invalidateQueries({ queryKey: ['card-style-full'] }); qc.invalidateQueries({ queryKey: ['card-style'] });
    } catch { setSaveError(true); setEditing(true); }
    finally { setBusy(false); }
  }

  return (
    <main className="app-shell min-h-screen pb-16 pt-6" lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <PageLanguage titles={['إعدادات الشبكة', 'Network settings']} />
      <div aria-hidden className="landing-pattern" />
      <PageHeading title={t('إعدادات الشبكة','Network settings')} back="/account" />

      <section className="mt-6 border-b border-border py-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Ticket className="size-5 text-primary" />{t('شكل كروتك', 'Your card style')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('تضبطه مرة واحدة، وكل كرت جديد يطلع بنفس الشكل.', 'Set it once; every new card follows it.')}</p>
        {savedLoading&&<p role="status" className="py-3 text-sm text-muted-foreground">{t('جارٍ قراءة الشكل المحفوظ…','Loading saved card style…')}</p>}
        {(savedError||samplesError)&&<div className="py-3"><p role="alert" className="text-sm text-destructive">{t('تعذر قراءة شكل الكروت؛ لا تحفظ قبل إعادة القراءة.','Could not read card style. Retry before saving.')}</p><Button variant="outline" onClick={()=>{void retrySaved();qc.invalidateQueries({queryKey:['style-samples']});}}>{t('أعد المحاولة','Retry')}</Button></div>}
        <div className="seg mt-4" role="group" aria-label={t('نوع الكروت', 'Card system')}>
          <button type="button" aria-pressed={source === 'hotspot'} onClick={() => setSource('hotspot')}>Hotspot</button>
          <button type="button" aria-pressed={source === 'usermanager'} onClick={() => setSource('usermanager')}>User Manager</button>
        </div>

        {!current && guess && !editing && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-primary/10 p-3 text-sm"><Sparkles className="mt-0.5 size-4 shrink-0 text-primary" /><span>{t(`قرأنا ${guess.sample} من كروتك واستنتجنا شكلها. هل هذا صحيح؟`, `We read ${guess.sample} of your cards and worked out their style. Is this right?`)}{!guess.sure && <span className="text-muted-foreground"> {t('(نوع كلمة السر يتأكد بعد إعادة الربط)', '(password type is confirmed after Reconnect)')}</span>}</span></p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-3" aria-label={t('معاينة', 'Preview')}>
          {preview.map((c, i) => (
            <div key={i} className={`${i > 0 ? 'hidden sm:block' : ''} rounded-md border border-primary/30 bg-primary/5 p-4`}>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wifi className="size-3.5" />{profile?.network_name || t('شبكتي', 'My network')}</p>
              <p className="mt-2 text-xs text-muted-foreground">{style.mode === 'number_only' ? t('رقم الكرت', 'Card number') : t('اسم المستخدم', 'Username')}</p>
              <p className="font-mono text-xl font-bold tracking-wider" dir="ltr">{c.user}</p>
              {c.password && <><p className="mt-1 text-xs text-muted-foreground">{t('كلمة السر', 'Password')}</p><p className="font-mono text-lg font-bold" dir="ltr">{c.password}</p></>}
            </div>
          ))}
        </div>

        {saveError && <p role="alert" className="mt-4 text-sm text-destructive">{t('ما انحفظ التعديل. بقيت اختياراتك هنا؛ حاول مرة أخرى.', 'Not saved. Your choices are still here; please retry.')}</p>}
        {editing ? (
          <div className="mt-5 space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t('الزبون يدخل...', 'The customer types...')}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <Choice on={style.mode === 'number_only'} onClick={() => setStyle({ ...style, mode: 'number_only' })} icon={<Ticket />} title={t('رقم واحد فقط', 'One number only')} sub={t('الأسهل للزبون — الأكثر استخداماً', 'Easiest for customers — most common')} />
                <Choice on={style.mode === 'number_password'} onClick={() => setStyle({ ...style, mode: 'number_password' })} icon={<KeyRound />} title={t('رقم + رمز سري', 'Number + secret code')} sub={t('أصعب للتخمين', 'Harder to guess')} />
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t('الأحرف', 'Characters')}</legend>
              <div className="flex flex-wrap gap-2">
                {(['digits', 'mixed', 'letters'] as const).map((c) => <button key={c} type="button" aria-pressed={style.charset === c} onClick={() => setStyle({ ...style, charset: c })} className="chip">{{ digits: t('أرقام فقط', 'Digits only'), mixed: t('أرقام وحروف', 'Digits + letters'), letters: t('حروف فقط', 'Letters only') }[c]}</button>)}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="len">{t('الطول', 'Length')}</Label>
                <div className="mt-1 flex items-center gap-2"><Button type="button" variant="outline" size="icon" className="size-11" aria-label="-" onClick={() => setStyle({ ...style, length: Math.max(4, style.length - 1) })}>−</Button><output id="len" className="w-8 text-center text-lg font-bold" dir="ltr">{style.length}</output><Button type="button" variant="outline" size="icon" className="size-11" aria-label="+" onClick={() => setStyle({ ...style, length: Math.min(16, style.length + 1) })}>+</Button></div>
              </div>
              <div><Label htmlFor="prefix">{t('بداية ثابتة (اختياري)', 'Fixed start (optional)')}</Label><Input id="prefix" dir="ltr" maxLength={6} value={style.prefix} onChange={(e) => setStyle({ ...style, prefix: e.target.value.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, Math.min(6, style.length - 2)) })} className="mt-1 h-11" placeholder="77" /></div>
            </div>
            <Button className="h-12 w-full text-base" disabled={busy || savedLoading || savedError || samplesError} onClick={save}>{busy ? <Loader2 className="animate-spin" /> : <Check />}{t('احفظ هذا الشكل', 'Save this style')}</Button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-12" onClick={() => setEditing(true)}>{t('تغيير', 'Change')}</Button>
            <Button className="h-12" disabled={busy || savedLoading || savedError || samplesError} onClick={save}>{busy ? <Loader2 className="animate-spin" /> : <Check />}{current?.confirmed || done ? t('محفوظ ✓', 'Saved ✓') : t('نعم، مثل هذا', 'Yes, like this')}</Button>
          </div>
        )}
      </section>

      <div className="mt-6"><EnableAlerts ar={ar} /></div>
      <AlertPrefs ar={ar} />

      {profileError ? <div className="mt-6"><p role="alert" className="text-sm text-destructive">{t('تعذر قراءة بيانات الشبكة.','Could not load network details.')}</p><Button variant="outline" onClick={()=>{void retryProfile();}}>{t('أعد المحاولة','Retry')}</Button></div> : <NetworkInfo ar={ar} name={profile?.network_name ?? ''} city={profile?.city ?? ''} />}
    </main>
  );
}

function Choice({ on, onClick, icon, title, sub }: { on: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`app-panel tap-card flex items-center gap-3 p-4 text-start ${on ? 'border-primary bg-primary/5' : ''}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary [&>svg]:size-5">{icon}</span>
      <span className="flex-1"><b className="block">{title}</b><span className="text-xs text-muted-foreground">{sub}</span></span>
      {on && <Check className="size-5 text-primary" />}
    </button>
  );
}

function NetworkInfo({ ar, name, city }: { ar: boolean; name: string; city: string }) {
  const t = (a: string, b: string) => (ar ? a : b);
  const save = useServerFn(updateNetworkInfo);
  const qc = useQueryClient();
  const [n, setN] = useState(name); const [c, setC] = useState(city); const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  useEffect(() => { setN(name); setC(city); }, [name, city]);
  return (
    <section className="mt-6 space-y-3 border-t border-border py-6">
      <h2 className="text-lg font-bold">{t('بيانات الشبكة', 'Network details')}</h2>
      <div><Label htmlFor="nn">{t('اسم الشبكة', 'Network name')}</Label><Input id="nn" value={n} onChange={(e) => { setN(e.target.value); setState('idle'); }} className="mt-1 h-11" dir="auto" /></div>
      <div><Label htmlFor="cc">{t('المدينة', 'City')}</Label><Input id="cc" value={c} onChange={(e) => { setC(e.target.value); setState('idle'); }} className="mt-1 h-11" dir="auto" /></div>
      {state === 'err' && <p role="alert" className="text-sm text-destructive">{t('ما انحفظت البيانات. تأكد أن الاسم والمدينة حرفان على الأقل، ثم حاول مرة أخرى.', 'Not saved. Check name and city have at least 2 characters, then retry.')}</p>}
      <Button variant="outline" className="h-11 w-full" disabled={state === 'busy'} onClick={async () => { setState('busy'); const r = await save({ data: { networkName: n, city: c } }).catch(() => ({ ok: false })); setState(r.ok ? 'ok' : 'err'); qc.invalidateQueries({ queryKey: ['profile'] }); }}>{state === 'busy' ? <Loader2 className="animate-spin" /> : state === 'ok' ? <Check /> : null}{state === 'ok' ? t('تم الحفظ', 'Saved') : t('حفظ', 'Save')}</Button>
    </section>
  );
}
