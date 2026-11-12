import { Link } from '@tanstack/react-router';
import { ArrowLeft, Globe2 } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { Button } from '@/components/ui/button';

export function PageHeading({ title, back = '/dashboard' }: { title: string; back?: '/dashboard' | '/account' | '/routers' }) {
  const { ar, toggleLanguage } = useLanguage();
  return <header className="space-y-3 border-b border-border pb-5">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <Button asChild variant="ghost" className="h-11 justify-self-start px-0 text-muted-foreground"><Link to={back}><ArrowLeft className="rtl:rotate-180" />{ar ? 'رجوع' : 'Back'}</Link></Button>
      <Button variant="ghost" className="h-11 shrink-0" onClick={toggleLanguage}><Globe2 />{ar ? 'English' : 'العربية'}</Button>
    </div>
    <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
  </header>;
}