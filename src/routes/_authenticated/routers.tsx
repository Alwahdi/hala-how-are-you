import { createFileRoute, Link } from '@tanstack/react-router';
import { HeartPulse, ListChecks } from 'lucide-react';
import { NetworkPanel } from '@/components/dashboard/network-panel';
import { PageHeading } from '@/components/account/page-heading';
import { PageLanguage } from '@/components/page-language';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_authenticated/routers')({head:()=>({meta:[{title:'Mikro — إدارة الراوترات'},{name:'description',content:'Your MikroTik routers, latest reports and connection details.'},{property:'og:title',content:'Mikro — Routers'},{property:'og:description',content:'Router reports, connections and management.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:Routers});
function Routers(){const {ar}=useLanguage();const t=(a:string,b:string)=>ar?a:b;return <main className="app-shell min-h-screen py-6"><PageLanguage titles={['الراوترات','Routers']}/><PageHeading title={t('الراوترات','Routers')}/><div className="my-5 flex flex-wrap gap-2"><Button asChild variant="outline" className="h-11"><Link to="/health"><HeartPulse />{t('الصحة','Health')}</Link></Button><Button asChild variant="outline" className="h-11"><Link to="/alerts"><ListChecks />{t('سجل الإجراءات','Action history')}</Link></Button></div><NetworkPanel /></main>;}
