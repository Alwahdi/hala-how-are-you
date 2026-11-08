import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowUpLeft, ArrowUpRight, Search, Globe2, Layers, Check, Wifi, Loader2, AlertCircle, SlidersHorizontal, X, Monitor, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { demoCards, searchCards, formatNumber, type Language } from '@/lib/specimen-data';
import { DemoCardList } from '@/components/demo-card-list';

export const Route = createFileRoute('/design-specimen')({
  head: () => ({meta:[{title:'Mikro — Design study by Alwahdi'},{name:'description',content:'Mikro interactive visual system study: Cairo typography, glass surfaces and bilingual network operations examples.'},{property:'og:title',content:'Mikro — Design study by Alwahdi'},{property:'og:description',content:'A visual direction for Mikro. Demonstration data only.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
  component: Index,
});
function Index() {
  const [lang,setLang]=useState<Language>('ar');
  const [query,setQuery]=useState('');
  const [results,setResults]=useState(demoCards);
  const [loading,setLoading]=useState(false);
  const [dialog,setDialog]=useState(false);
  const [tab,setTab]=useState<'workspace'|'surfaces'>('workspace');
  const ar=lang==='ar'; const t=(a:string,b:string)=>ar?a:b;
  useEffect(()=>{document.documentElement.lang=lang;document.documentElement.dir=ar?'rtl':'ltr';},[lang,ar]);
  async function search() { setLoading(true); await new Promise(r=>setTimeout(r,450)); setResults(searchCards(query)); setLoading(false); }
  const Arrow=ar?ArrowUpLeft:ArrowUpRight;
  return <main className="specimen" lang={lang} dir={ar?'rtl':'ltr'}>
    <svg className="network-paths" viewBox="0 0 1440 950" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(i=><path key={i} d={`M ${180+i*35} -30 L ${500+i*35} 280 Q ${650+i*18} 420 ${540+i*32} 540 L ${300+i*35} 850`}/>)}
      <path className="wide-path" d="M 520 -40 L 880 280 Q 1080 450 900 560 L 640 820"/>
      <path className="violet-path" d="M 1400 80 L 1000 440 Q 930 510 1080 690 L 1400 930"/>
    </svg>
    <header className="specimen-header glass flex items-center justify-between gap-3 px-5 py-4">
      <div dir="ltr" className="flex items-baseline gap-3"><span className="brand-word text-2xl">Mikro<span className="text-primary">.</span></span><span className="hidden text-xs text-muted-foreground sm:inline">by Alwahdi</span></div>
      <nav className="hidden items-center gap-1 md:flex" aria-label={t('العينات','Specimens')}>
        <Button variant={tab==='workspace'?'secondary':'ghost'} onClick={()=>setTab('workspace')}><Monitor/>{t('مساحة العمل','Workspace')}</Button>
        <Button variant={tab==='surfaces'?'secondary':'ghost'} onClick={()=>setTab('surfaces')}><Layers/>{t('الأسطح والعناصر','Surfaces')}</Button>
      </nav>
      <Button variant="ghost" onClick={()=>setLang(ar?'en':'ar')} aria-label={ar?'Switch to English':'التبديل إلى العربية'}><Globe2/><span>{ar?'English':'العربية'}</span></Button>
    </header>
    <section className="intro">
      <div className="mb-5 flex flex-wrap items-center gap-3 text-xs"><span className="section-kicker text-primary" dir="ltr">MIKRO / DESIGN STUDY 03</span><span className="text-muted-foreground">{t('تصور للمراجعة · بيانات تجريبية','Concept study · Demonstration data')}</span></div>
      <h1>{t('وضوح في كل تفصيلة.','Clarity in every detail.')}<br/><span className="text-muted-foreground">{t('قوة في كل خطوة.','Confidence in every step.')}</span></h1>
      <div className="mt-6 flex flex-wrap items-center gap-3"><span className="flex items-center gap-2 text-sm text-muted-foreground"><span className="status-dot"/>{t('إدارة متكاملة لشبكات MikroTik','Integrated MikroTik network operations')}</span></div>
    </section>
    <div className="workspace pb-16">
      <div className="mb-5 flex items-center justify-between border-b border-border pb-4"><h2 className="text-lg font-bold">{tab==='workspace'?t('مساحة العمل','Workspace'):t('الأسطح والعناصر','Surfaces & elements')}</h2><span className="numeral section-kicker text-muted-foreground">{tab==='workspace'?'01 / 03':'02 / 03'}</span></div>
      {tab==='workspace'?<section className="glass p-6 md:p-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-xs text-primary"><Wifi size={15}/>{t('متصل · مثال توضيحي','Connected · Demonstration')}</div><h3 className="text-2xl font-bold">{t('شبكة تجريبية','Demonstration network')}</h3><p className="mt-2 text-xs text-muted-foreground"><bdi dir="ltr">192.0.2.1</bdi> · <bdi dir="ltr">2026-11-06</bdi></p></div><Button variant="outline" onClick={()=>setDialog(true)}><SlidersHorizontal/>{t('تفاصيل الشبكة','Network details')}<Arrow/></Button></div>
        <div className="workspace-grid">
          <div><div className="mb-6 grid grid-cols-3 gap-3 border-b border-border pb-6">{[[formatNumber(1234),t('كرت تجريبي','Demo cards')],[formatNumber(2026,{useGrouping:false}),t('السنة','Year')],[formatNumber(.125,{style:'percent',maximumFractionDigits:1}),t('استهلاك توضيحي','Sample usage')]].map(([v,l])=><div key={l}><p className="numeral text-2xl font-semibold md:text-3xl">{v}</p><p className="mt-2 text-xs text-muted-foreground">{l}</p></div>)}</div>
          <form onSubmit={e=>{e.preventDefault();void search();}} className="mb-5 flex gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute start-3 top-3 size-4 text-muted-foreground"/><Input className="h-10 ps-10" aria-label={t('رقم الكرت','Card number')} placeholder={t('ابحث عن كرت · DEMO-001','Find a card · DEMO-001')} value={query} onChange={e=>setQuery(e.target.value)}/></div><Button className="h-10" type="submit" disabled={loading}>{loading?<Loader2 className="animate-spin"/>:<Search/>}{t('بحث','Search')}</Button></form>
          <DemoCardList ar={ar} cards={results}/>{results.length===0&&<div role="status" className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-muted-foreground"><Search/><p>{t('لم نجد كرتاً مطابقاً','No matching card')}</p><Button variant="ghost" onClick={()=>{setQuery('');setResults(demoCards);}}>{t('عرض الكل','Show all')}</Button></div>}
          </div>
          <div className="flex flex-col justify-between gap-6"><div><div className="mb-5 flex items-center gap-2 text-secondary"><ShieldCheck size={20}/><span className="text-sm font-semibold">{t('حالة الكرت واستهلاكه','Card status and usage')}</span></div><div className="mt-6 flex flex-col gap-4 text-sm"><div className="flex justify-between border-b border-border pb-3"><span className="text-muted-foreground">{t('آخر تحديث','Last updated')}</span><bdi dir="ltr">08:15</bdi></div><div className="flex justify-between"><span className="text-muted-foreground">{t('مصدر البيانات','Data source')}</span><span>{t('تجريبي فقط','Demo only')}</span></div></div></div><Button variant="secondary" className="h-11" onClick={()=>setDialog(true)}>{t('عرض التفاصيل','View details')}<Arrow/></Button></div>
        </div>
      </section>:<section className="state-grid"><div className="glass-demo"><div className="glass glass-sample"><Layers className="mb-3 text-primary"/><h3 className="font-semibold">{t('سطح زجاجي','Glass surface')}</h3><p className="mt-2 text-sm text-muted-foreground">{t('شبكة تجريبية','Demonstration network')}</p></div></div><div className="surface-solid p-6"><h3 className="mb-6 font-semibold">{t('سطح صلب','Solid surface')}</h3><p className="numeral text-3xl">1,234</p><p className="mt-3 text-sm text-muted-foreground">{t('كرت تجريبي','Demonstration cards')}</p></div><div className="glass p-6"><h3 className="mb-6 font-semibold">{t('الإجراء الرئيسي','Primary action')}</h3><Button onClick={()=>setDialog(true)}>{t('عرض التفاصيل','View details')}<Arrow/></Button></div></section>}
      <div className="mt-10 mb-5 flex items-center justify-between border-b border-border pb-4"><h2 className="text-lg font-bold">{t('الحالات والتفاعل','States & interaction')}</h2><span className="section-kicker text-muted-foreground numeral">03 / 03</span></div>
      <section className="state-grid"><div className="surface-solid p-6"><h3 className="mb-5 flex items-center gap-2 text-sm"><Check size={16} className="text-primary"/>{t('الاختيار والتركيز','Selection & focus')}</h3><Input aria-label={t('اسم الشبكة','Network name')} defaultValue={t('شبكة تجريبية','Demonstration network')}/><div className="mt-4 flex gap-2"><Button onClick={()=>setTab('workspace')}>{t('متابعة','Continue')}<Arrow/></Button><Button variant="outline" onClick={()=>setTab('surfaces')}><Layers/>{t('الأسطح','Surfaces')}</Button></div></div><div className="surface-solid p-6"><h3 className="mb-5 flex items-center gap-2 text-sm"><Loader2 size={16} className="text-secondary"/>{t('الانتظار والتعطيل','Loading & disabled')}</h3><Button disabled className="w-full" variant="secondary"><Loader2/>{t('بانتظار الاتصال','Waiting for connection')}</Button><Input className="mt-4" disabled placeholder={t('غير متاح في العينة','Unavailable in this study')}/></div><div className="surface-solid p-6"><h3 className="mb-5 flex items-center gap-2 text-sm"><AlertCircle size={16} className="text-destructive"/>{t('حالة الخطأ','Error state')}</h3><p className="text-sm text-muted-foreground">{t('تعذر الاتصال بالشبكة التجريبية.','Unable to reach the demonstration network.')}</p><Button className="mt-5" variant="outline" onClick={()=>setDialog(true)}>{t('مراجعة التفاصيل','Review details')}<Arrow/></Button></div></section>
      <footer className="mt-10 flex flex-wrap justify-between gap-3 border-t border-border pt-5 text-xs text-muted-foreground"><span dir="ltr">Mikro · by Alwahdi / 2026</span><span>{t('عينة تصميم · لا اتصال بشبكات فعلية','Design study · No live network connection')}</span></footer>
    </div>
    <Dialog open={dialog} onOpenChange={setDialog}><DialogContent className="glass text-foreground" dir={ar?'rtl':'ltr'} lang={lang}><DialogTitle className="text-start text-2xl">{t('تفاصيل الشبكة التجريبية','Demonstration network details')}</DialogTitle><DialogDescription className="text-start leading-relaxed">{t('بيانات توضيحية للمراجعة، وليست قراءة من راوتر فعلي.','Illustrative data for review, not readings from a real router.')}</DialogDescription><dl className="space-y-4 py-4 text-sm">{[[t('عنوان الشبكة','Network address'),'192.0.2.1'],[t('النطاق','Domain'),'demo.example'],[t('السنة','Year'),'2026']].map(([k,v])=><div key={k} className="flex justify-between gap-3 border-b border-border pb-3"><dt className="text-muted-foreground">{k}</dt><dd><bdi dir="ltr">{v}</bdi></dd></div>)}</dl><Button onClick={()=>setDialog(false)}><Check/>{t('تم','Done')}</Button></DialogContent></Dialog>
  </main>;
}
