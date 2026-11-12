import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { AppNavigation } from '@/components/account/app-navigation';
import { useLocation } from '@tanstack/react-router';
import { useLanguage } from '@/components/language-provider';

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: '/auth' });
  },
  component: ProtectedLayout,
});

function ProtectedLayout(){
  const { ar } = useLanguage();
  const { pathname } = useLocation();
  const setup = pathname === '/onboarding' || pathname === '/welcome';
  return <div className={setup ? '' : 'operations-layout'} dir={ar?'rtl':'ltr'} lang={ar?'ar':'en'}>
    {!setup && <AppNavigation />}<div className={setup ? '' : 'operations-content'}><Outlet /></div>
  </div>;
}
