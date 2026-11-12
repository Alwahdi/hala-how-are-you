import { Link, useLocation } from '@tanstack/react-router';
import { Home, Ticket, Router, UserRound, Activity, HeartPulse, Bell } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';

export function AppNavigation() {
  const { ar } = useLanguage();
  const location = useLocation();
  const t = (a: string,b: string) => ar ? a : b;
  const tab = new URLSearchParams(location.searchStr).get('tab');
  const current = location.pathname === '/dashboard' ? (tab === 'cards' ? 'cards' : tab === 'more' ? 'routers' : 'home') : location.pathname === '/routers' || location.pathname === '/health' ? 'routers' : location.pathname === '/account' || location.pathname === '/settings' ? 'account' : 'home';
  const items = [
    { id:'home', to:'/dashboard' as const, label:t('الرئيسية','Overview'), icon:Home, search:{} },
    { id:'cards', to:'/dashboard' as const, label:t('الكروت','Cards'), icon:Ticket, search:{tab:'cards' as const} },
    { id:'routers', to:'/routers' as const, label:t('الراوترات','Routers'), icon:Router, search:{} },
    { id:'account', to:'/account' as const, label:t('الحساب','Account'), icon:UserRound, search:{} },
  ];
  return <nav className="app-navigation" dir={ar ? 'rtl' : 'ltr'} aria-label={t('التنقل الرئيسي','Main navigation')}>
    <Link to="/dashboard" className="brand-word mb-7 hidden text-xl lg:block">Mikro<span className="text-primary">.</span></Link>
    {items.map(({id,to,label,icon:Icon,search}) => <Button asChild variant="ghost" key={id} className="app-nav-link"><Link to={to} search={search} activeOptions={{exact:true,includeSearch:true}} activeProps={{}} inactiveProps={{}} aria-current={current===id?'page':undefined}><Icon /><span>{label}</span></Link></Button>)}
    <div className="mt-auto hidden space-y-1 border-t border-border pt-5 lg:block">
      <Button asChild variant="ghost" className="app-nav-link"><Link to="/dashboard" search={{tab:'active'}}><Activity />{t('النشطون','Active users')}</Link></Button>
      <Button asChild variant="ghost" className="app-nav-link"><Link to="/health"><HeartPulse />{t('صحة الشبكة','Network health')}</Link></Button>
      <Button asChild variant="ghost" className="app-nav-link"><Link to="/alerts"><Bell />{t('التنبيهات والسجل','Alerts & history')}</Link></Button>
    </div>
  </nav>;
}