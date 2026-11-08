export type Language = 'ar' | 'en';
export function resolveLanguage(saved: string | undefined, accepted = ''): Language {
  if (saved === 'ar' || saved === 'en') return saved;
  const preferences = accepted.split(',').map((entry, index) => {
    const [tag, ...params] = entry.trim().toLowerCase().split(';');
    const quality = params.find(p => p.trim().startsWith('q='));
    return { language: tag?.split('-')[0], quality: quality ? Number(quality.trim().slice(2)) : 1, index };
  }).filter(item => item.quality > 0).sort((a, b) => b.quality - a.quality || a.index - b.index);
  for (const item of preferences) if (item.language === 'ar' || item.language === 'en') return item.language;
  return 'ar';
}