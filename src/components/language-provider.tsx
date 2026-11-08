import { createContext, useContext } from 'react';
import type { Language } from '@/lib/locale';

export const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void }>({ language: 'ar', setLanguage: () => {} });
export function useLanguage() {
  const { language, setLanguage } = useContext(LanguageContext);
  return { ar: language === 'ar', language, toggleLanguage: () => setLanguage(language === 'ar' ? 'en' : 'ar') };
}