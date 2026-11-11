// Main cities for the first markets; "other" lets people type their own.
export const CITIES: { country: 'YE' | 'EG' | 'SY'; ar: string; en: string }[] = [
  ...[['صنعاء','Sanaa'],['عدن','Aden'],['تعز','Taiz'],['الحديدة','Hodeidah'],['إب','Ibb'],['ذمار','Dhamar'],['المكلا','Mukalla'],['مأرب','Marib'],['حجة','Hajjah'],['عمران','Amran'],['صعدة','Saada'],['البيضاء','Al Bayda'],['سيئون','Seiyun'],['لحج','Lahij']].map(([ar, en]) => ({ country: 'YE' as const, ar: ar!, en: en! })),
  ...[['القاهرة','Cairo'],['الجيزة','Giza'],['الإسكندرية','Alexandria'],['المنصورة','Mansoura'],['طنطا','Tanta'],['أسيوط','Asyut'],['سوهاج','Sohag'],['المنيا','Minya'],['الزقازيق','Zagazig'],['الأقصر','Luxor'],['أسوان','Aswan']].map(([ar, en]) => ({ country: 'EG' as const, ar: ar!, en: en! })),
  ...[['دمشق','Damascus'],['حلب','Aleppo'],['حمص','Homs'],['حماة','Hama'],['اللاذقية','Latakia'],['طرطوس','Tartus'],['إدلب','Idlib'],['درعا','Daraa'],['دير الزور','Deir ez-Zor'],['الحسكة','Hasakah']].map(([ar, en]) => ({ country: 'SY' as const, ar: ar!, en: en! })),
];
export const COUNTRY_NAMES = { YE: { ar: 'اليمن', en: 'Yemen' }, EG: { ar: 'مصر', en: 'Egypt' }, SY: { ar: 'سوريا', en: 'Syria' } } as const;

export const cleanText = (v: string) => v.replace(/\s+/g, ' ').trim();
