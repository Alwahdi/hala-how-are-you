import { useEffect } from 'react';
import { useLanguage } from './language-provider';

/** The leaf route owns static share metadata; its visible tab title follows manual language choice. */
export function PageLanguage({ titles }: { titles: [string, string] }) {
  const { ar } = useLanguage();
  const title = titles[ar ? 0 : 1];
  useEffect(() => { document.title = `Mikro — ${title}`; }, [title]);
  return null;
}