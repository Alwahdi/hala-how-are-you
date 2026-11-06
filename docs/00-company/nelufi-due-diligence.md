---
type: naming-due-diligence
status: draft
owner: founder
updated: 2026-11-06
related: [product-name-research-round-three.md, brand-brief.md, ../04-decisions/D-007-connected-work-positioning.md]
---
# فحص Nelufi قبل اختيار الاسم

**الملخص:** [confirmed] طلب المؤسس «فحص Nelufi أكثر» بتاريخ 2026-11-06؛ هذا ليس اعتماداً للاسم.
[confirmed] الفحص العام لا يمنح تصريحاً قانونياً ولا يثبت إتاحة كل النطاقات أو الحسابات.

## نطاق الفحص
- [confirmed] فحص الاستعمال المطابق بالعربية واللاتينية، والمتغيرات القريبة، والتشابه مع Nefeli في قطاع الشبكات، والنطاقات وسجلات العلامات العامة حيث يمكن الوصول.
- [assumption] التوصية تبنى على وزن التعارض والالتباس، لا مجرد غياب نتيجة بحث مطابقة.

## اختبار النطق المقترح — غير منفذ
- [assumption] يعرض الاسم مكتوباً ثم يسمع دون رؤية الكتابة، ويطلب نطقه وإملاؤه؛ يفصل تذكر الاسم عن إعجاب الشخص به.
- [assumption] تختبر صيغ Nelufi وNilufi وNelufy دون إخبار المشارك بالتهجئة الصحيحة مسبقاً، ويختبر الالتباس مع Nefeli دون تلقينه إجابة.
- [assumption] الكتابة العربية والنطق والتهجئة النهائية لا تعتمد قبل الاختيار؛ «نيلوفي» قد توحي بصوت أول أطول من neh المقترح.

## حالة العمل
- [confirmed] الفحص الموسع طلب بحث فقط؛ لا شعار أو نطاق مشترى أو صفحة مبنية بهذا الطلب.

## نتائج الفحص الموسع — 2026-11-06
- [confirmed] [نون](https://www.noon.com/saudi-ar/seller/p-419675/) يعرض عنوان بائع «نيلوفي»، تطابق عربي تجاري؛ طلبات فتح الصفحة تعثرت، فلا نوع البضاعة ولا الهوية القانونية أو تهجئتها اللاتينية مثبتة. لا تنسب إليه منتجات بائع آخر باسم قريب.
- [confirmed] [Nelufi على OP.GG](https://op.gg/no/lol/summoners/JP/Nelufi-8780) و[Nelufy](https://twpf.jp/Nelufy) استعمالات ألعاب؛ لا يثبتان منتج برمجيات منافساً أو هوية واحدة.
- [confirmed] بيان [Cloudflare بتاريخ 2024-03-06](https://www.cloudflare.com/press/press-releases/2024/cloudflare-enters-multicloud-networking-market-unlocks-simple-secure/) يصف شراء فريق وتقنية Nefeli؛ [مقالها التقني](https://blog.cloudflare.com/introducing-magic-cloud-networking/) يصف إدارة وأتمتة شبكات سحابية. لا دليل على زوال حقوق الاسم بعد الشراء.
- [confirmed] سجل [CIPO الكندي الرسمي: NEFELI، طلب 2002144](https://ised-isde.canada.ca/cipo/trademark-search/2002144) يعرض التسجيل TMA1214918 حياً ومسجلاً، باسم Nefeli Networks Inc. المعروض، وفئتي 9 و42 لبرمجيات وإدارة شبكات وخدمات SaaS/PaaS. يشير إلى تسجيل دولي 1503635 وطلب أمريكي 88401055؛ لا يحسم المالك الحالي عالمياً.
- [confirmed] [Trademarkia](https://www.trademarkia.com/nefeli-88401055) مصدر ثانوي يذكر التسجيل الأمريكي 6397149 وCloudflare، لكنه غير متسق في عرض المالك؛ مرجع للوصول للسجل لا إثبات رسمي محدث.
- [confirmed] [WIPO](https://branddb.wipo.int/) و[USPTO](https://tmsearch.uspto.gov/) أعادا واجهات دون نتائج قابلة للتحقق، و[TSDR](https://tsdr.uspto.gov/#caseNumber=88401055&caseSearchType=US_APPLICATION&caseType=DEFAULT&searchType=statusSearch) لم يعرض بيانات الحالة في الاسترجاع. واجهة JSON رفضت الوصول بلا مفتاح؛ لا فحص علامات شامل ولا تصريح خلو.

## فحص النطاقات
- [confirmed] تحقق مصدر خدمات RDAP من [دليل IANA](https://data.iana.org/rdap/dns.json).
- [confirmed] [nelufi.app لدى سجل Google](https://pubapi.registry.google/rdap/domain/nelufi.app) أعاد `errorCode: 404` و`nelufi.app not found`: لم يكن مسجلاً في استعلام السجل وقت الفحص؛ لا يثبت إمكان شراء أو سعراً أو استمرار الحالة.
- [confirmed] [nelufi.com لدى Verisign](https://rdap.verisign.com/com/v1/domain/nelufi.com) أعاد 404 دون محتوى JSON صريح؛ الحالة غير محسومة هنا، ولا يستنتج أنه متاح من DNS أو استجابة فارغة.

## الاستعلامات الرئيسية
```text
"Nelufi" OR "نيلوفي"
"Nelufy" OR "Nilufi" OR "Nelofi"
("Nelufi" OR "Nelufy" OR "Nilufi" OR "Nelofi") (software OR network OR telecom OR company OR SaaS)
"p-419675" noon
"نيلوفي" نون بائع منتجات
site.cloudflare.com Nefeli acquired technology March 2024
"Nelufi" "trademark" OR "Nefeli" "trademark"
```

## التوصية وحدودها
- [assumption] يبقى Nelufi مرشحاً مشروطاً لفحص علامة متخصص، لا اسم جاهزاً للاستثمار في هويته؛ تسجيل NEFELI في خدمات شبكات يجعل الخطر أهم من استعمالات الألعاب.
- [confirmed] الاسمان ليسا متطابقين؛ الالتباس البصري والصوتي محتمل وغير مختبر، ولا يحكم هذا البحث بوجود تعدٍ قانوني.
- [assumption] قبل التزام نهائي: فحص العلامات والحقوق والملكية في بلدان الإطلاق والتوسع، وحسم استعمال بائع نون، ثم اختبار النطق والإملاء. لا يغني تسجيل نطاق عن حقوق العلامة.