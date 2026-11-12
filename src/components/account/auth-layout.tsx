import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Globe2 } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';

export function AuthLayout({ children }: { children: ReactNode }) {
  const { ar, toggleLanguage } = useLanguage();
  return <main className="app-shell min-h-screen py-5 sm:py-7" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}>
    <div aria-hidden className="landing-pattern opacity-20" />
    <header className="flex items-center justify-between">
      <Link to="/" className="brand-word inline-flex min-h-11 items-center text-xl">Mikro<span className="ms-1 text-primary">.</span></Link>
      <Button variant="ghost" className="h-11" onClick={toggleLanguage}><Globe2 />{ar ? 'English' : 'العربية'}</Button>
    </header>
    <div className="mx-auto w-full max-w-sm pb-6 pt-8 sm:pt-12">{children}</div>
    <footer className="pb-4 text-center"><Link to="/privacy" className="inline-flex min-h-11 items-center text-xs text-muted-foreground hover:text-foreground">{ar ? 'الخصوصية' : 'Privacy'}</Link></footer>
  </main>;
}