import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { Building2, Globe2, Loader2, MapPin, Network, Wrench } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CITIES, COUNTRY_NAMES, cleanText } from '@/lib/cities';
import { saveAccountProfile } from '@/lib/profile.functions';

export const Route = createFileRoute('/_authenticated/welcome')({
  head: () => ({ meta: [
    { title: 'Mikro — عرّفنا بك' },
    { name: 'description', content: 'Tell Mikro whether you own a network or work as an engineer, plus your network name and city.' },
    { property: 'og:title', content: 'Mikro — About you' },
    { property: 'og:description', content: 'Account type, network name and city for Mikro.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Welcome,
});

function Welcome() {
  const { ar, toggleLanguage } = useLanguage();
  const t = (a: string, b: string) => (ar ? a : b);
  const navigate = useNavigate();
  const save = useServerFn(saveAccountProfile);
  const [type, setType] = useState<'owner' | 'engineer' | null>(null);
  const [networkName, setNetworkName] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suggestions = useMemo(() => {
    const q = cleanText(city);
    if (!q) return [];
    return CITIES.filter((c) => c.ar.includes(q) || c.en.toLowerCase().includes(q.toLowerCase())).slice(0, 5);
  }, [city]);
  const exact = CITIES.some((c) => c.ar === cleanText(city) || c.en === cleanText(city));
  const valid = !!type && cleanText(city).length >= 2 && (type === 'engineer' || cleanText(networkName).length >= 2);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!valid || !type) return;
    setBusy(true); setError(null);
    const r = await save({ data: { accountType: type, networkName, city, language: ar ? 'ar' : 'en' } }).catch(() => ({ ok: false as const }));
    setBusy(false);
    if (!r.ok) return setError(t('ما قدرنا نحفظ بياناتك. حاول مرة ثانية.', 'Could not save. Try again.'));
    navigate({ to: '/routers', replace: true });
  }

  const options = [
    { id: 'owner' as const, icon: <Network />, title: t('صاحب شبكة', 'Network owner'), sub: t('أدير شبكتي وكروتي ورواتري', 'I run my own network and vouchers') },
    { id: 'engineer' as const, icon: <Wrench />, title: t('مهندس شبكات', 'Network engineer'), sub: t('أركّب وأدير شبكات لعملاء', 'I install and manage networks for clients') },
  ];

  return (
    <main className="app-shell min-h-screen py-6" lang={ar ? 'ar' : 'en'} dir={ar ? 'rtl' : 'ltr'}>
      <div aria-hidden className="landing-pattern" />
      <div className="flex items-center justify-between">
        <span className="text-lg font-extrabold">Mikro</span>
        <Button variant="ghost" onClick={toggleLanguage}><Globe2 />{ar ? 'English' : 'العربية'}</Button>
      </div>
      <form onSubmit={submit} className="app-panel mx-auto mt-8 w-full max-w-lg space-y-6 p-5 sm:p-6">
        <div><h1 className="text-xl font-bold">{t('أهلاً بك في Mikro', 'Welcome to Mikro')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('ثلاث معلومات فقط، ونجهز لك كل شي على حسبها.', 'Just three details so we can set things up for you.')}</p></div>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">{t('أنت؟', 'You are')}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((o) => (
              <button key={o.id} type="button" aria-pressed={type === o.id} onClick={() => setType(o.id)}
                className={`flex min-h-24 items-start gap-3 rounded-xl border p-4 text-start transition-colors ${type === o.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary [&>svg]:size-5">{o.icon}</span>
                <span><b className="block">{o.title}</b><span className="text-xs text-muted-foreground">{o.sub}</span></span>
              </button>
            ))}
          </div>
        </fieldset>
        {type && (
          <div className="space-y-2">
            <Label htmlFor="network"><Building2 className="inline size-4" /> {type === 'owner' ? t('اسم الشبكة', 'Network name') : t('اسم نشاطك (اختياري)', 'Business name (optional)')}</Label>
            <Input id="network" className="h-12" maxLength={80} value={networkName} onChange={(e) => setNetworkName(e.target.value)} placeholder={type === 'owner' ? t('مثلاً: شبكة تواصل', 'e.g. Tawasul Net') : t('مثلاً: الوحدي للشبكات', 'e.g. Alwahdi Networks')} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="city"><MapPin className="inline size-4" /> {t('المدينة', 'City')}</Label>
          <Input id="city" className="h-12" maxLength={60} autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('اكتب أول حروف مدينتك', 'Start typing your city')} />
          {!exact && suggestions.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {suggestions.map((c) => <li key={c.en}><button type="button" onClick={() => setCity(ar ? c.ar : c.en)} className="min-h-11 rounded-full border border-border px-4 text-sm hover:border-primary">{ar ? c.ar : c.en} <span className="text-xs text-muted-foreground">· {COUNTRY_NAMES[c.country][ar ? 'ar' : 'en']}</span></button></li>)}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">{t('مدينتك مش في القائمة؟ اكتبها كما هي.', 'City not listed? Just type it.')}</p>
        </div>
        {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-12 w-full text-base" disabled={!valid || busy}>{busy && <Loader2 className="animate-spin" />}{t('متابعة', 'Continue')}</Button>
      </form>
    </main>
  );
}
