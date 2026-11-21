---
type: roadmap
status: approved
owner: founder
updated: 2026-11-21
related: [status.md]
---
# خارطة الطريق

**الملخص:** ست مراحل، وما نبدأ مرحلة إلا بعد ما نقفل اللي قبلها ويوافق المؤسس.
نحن الحين في **المرحلة 2: الاستكشاف**.

## المرحلة 1: التأسيس ✅
- [x] هيكل الشركة ككود والقواعد
- [x] حفظ الرؤية والمشاكل والعصف الذهني والقرارات

## المرحلة 2: إكمال الاستكشاف ⏳
- [x] تسليم المصدر والتصاميم وAPK التجريبي إلى GitHub وفق [D-057](../04-decisions/D-057-github-project-delivery.md) والتحقق من النتيجة؛ [السجل](github-delivery.md). [confirmed]
- [x] إكمال بناء APK داخلي على EAS وفق [D-056](../04-decisions/D-056-eas-pilot-build.md) والتحقق من نتيجته؛ [السجل](../03-product/mobile-eas-build.md). [confirmed]
- [x] اعتماد وتنفيذ كود الرحلة المحلية المحدودة وفق [D-055](../04-decisions/D-055-expo-local-pilot.md) وفحص المختبر والمتصفح؛ [حدود النتائج](../03-product/mobile-pilot-verification.md). [confirmed]
- [ ] إكمال بناء وقبول رحلة D-055 على الهاتف والراوتر والطباعة الفعلية وملاحظة مستخدم مبتدئ. [confirmed]
- [x] اعتماد [خطة الجوال للطباعة المحلية](../03-product/mobile-voucher-plan.md) وفق D-047 وإعداد [تسليم التصميم](../03-product/mobile-voucher-experience.md). [confirmed]
- [x] مراجعة تصور الجوال بالعناصر الأكبر ومساحات الراوترات؛ [D-048](../04-decisions/D-048-roomy-router-workspaces.md) مسودة تنتظر مراجعة النسخة. [confirmed]
- [x] إعداد مراجعة رحلة صاحب الشبكة ومهامه والبداية والربط والقوالب وفق [D-049](../04-decisions/D-049-owner-mobile-journey-review.md)؛ لا بناء فعلي أو توثيق أو جمع بيانات منفذ. [confirmed]
- [x] مراجعة تفاعل المستخدم الجديد وJTBD ومسودات الرد والتجديد والشكوى وفق [D-050](../04-decisions/D-050-novice-owner-interactions.md)؛ [حدود المحاكاة](../03-product/mobile-voucher-experience.md#مراجعة-التفاعل-للمستخدم-الجديد) وبوابات البناء باقية. [confirmed]
- [x] محاكاة إدارة الباقات والإجراءات والتجديد ضمن المصدر ومراجعة المناهج وفق [D-051](../04-decisions/D-051-mobile-plans-and-actions.md)؛ [النتائج والمتبقي](../03-product/mobile-voucher-experience.md#مراجعة-الباقات-والإجراءات)، لا تنفيذ RouterOS أو إغلاق تحقق المستخدم. [confirmed]
- [ ] مراجعة مواصفات الجوال واعتمادها، ثم تجربة الاتصال والطباعة على iPhone وAndroid وفق الخطة؛ لا نشر أو إنتاج. [confirmed]
- [x] تنقيح بطاقة الربط والاستكشاف وإدارة الاتصالات المحفوظة والتنقل وفق [D-052](../04-decisions/D-052-mobile-network-hub.md)؛ [حدود المحاكاة](../03-product/mobile-voucher-experience.md#مراجعة-ربط-الشبكات-والتنقل) لا تغلق اختبار الهاتف أو اعتماد المواصفات. [confirmed]
- [x] دراسة شخصية صاحب الشبكة ومراجعة المهام وفق [D-053](../04-decisions/D-053-owner-persona-review.md)؛ [النتائج](../03-product/mobile-persona-walkthrough.md) فحص خبير لا اختبار مستخدمين. [confirmed]
- [x] اعتماد وتنفيذ تحسينات نتائج PER-001 في التصور وفق [D-054](../04-decisions/D-054-owner-journey-refinements.md)؛ [نتائج الفحص](../03-product/mobile-owner-refinements.md). [confirmed]
- [ ] مراجعة التنقيح والتحقق من الفهم مع مستخدم مبتدئ والعرض والأجهزة؛ بوابة المواصفات والبناء الفعلي باقية. [confirmed]
- [x] تنفيذ التوسعة المتدرجة وفق [D-046](../04-decisions/D-046-large-voucher-batches.md)؛ [نتائج الاختبار والمتبقي](../03-product/voucher-large-batch-review.md). [confirmed]
- [x] نموذج الكرت الواحد والدفعات وتحسين قواعد الإصدار وفق [D-045](../04-decisions/D-045-single-and-batch-issuance.md). [confirmed]
- [ ] إكمال اختبار دورة الإصدار والأرشيف ثم التفعيل وفق D-045. [confirmed]
- [x] اختبار دفعات المنصة والمختبر وPDF ضمن [حدود التحقق](../03-product/voucher-release-verification.md). [confirmed]
- [x] قوالب الكروت وA4 وحفظها وPDF التجريبي وفق [D-044](../04-decisions/D-044-voucher-issuance-and-printing.md). [confirmed]
- [ ] تفعيل الإصدار بعد استكمال المتبقي والتحقق التجريبي وفق D-044؛ لا راوتر إنتاج تلقائيًا. [confirmed]
- [x] إعادة تصميم الشاشات والرحلات للهاتف والتحقق ضمن [D-043](../04-decisions/D-043-mobile-first-app-redesign.md). [confirmed]
- [x] تحسين واجهة الدخول والاستعادة وطرق الدخول والتحقق ضمن حدود [D-042](../04-decisions/D-042-sign-in-ui-ux.md). [confirmed]
- [x] فصل دخول البريد وإضافة الاستعادة وبيان طرق الدخول وفق [D-040](../04-decisions/D-040-independent-sign-in.md). [confirmed]
- [ ] إكمال دخول الهاتف وربطه؛ ينتظر التكامل المعتمد وفق [D-041](../04-decisions/D-041-keep-whatsapp-verification.md). [confirmed]
- [x] إصلاح الواجهات وفق الدراسة المعتمدة؛ [نتائج وحدود التحقق](../04-decisions/D-038-ui-outcomes-and-freshness.md). [confirmed]
- [x] تنفيذ تحسين نافذة التسجيل والمسافات والكروت والخلفية والأيقونة وفق [D-020](../04-decisions/D-020-landing-dialog-and-detail-refinement.md) والتحقق؛ لا نشر. [confirmed]
- [x] تحسين تصور الجوال وإشارات فتح الكروت وفق [D-019](../04-decisions/D-019-readable-demo-card-preview.md) والتحقق باللغتين؛ لا تشغيل شبكة أو نشر. [confirmed]
- [x] مراجعة المبادئ العشرة بلا إغفال وإصلاح النواقص ضمن الخطة المعتمدة؛ النتائج لكل مبدأ في [سجل الصفحة](../00-company/conversion-landing-page.md). [confirmed]
- [x] تحسين نص الصفحة واللغة وطلب التواصل ضمن الخطة المعتمدة، والتحقق من الطلبين وحفظ السجلات السابقة؛ [سجل الصفحة](../00-company/conversion-landing-page.md). [confirmed]
- [x] دراسة وحفظ مراجعة قابلية الاستخدام والمحتوى والسياق قبل كل خطوة وفق [D-017](../04-decisions/D-017-usability-content-context-review.md)؛ لا تطبيق جديد منفذ. [confirmed]
- [x] تنفيذ [صفحة التسويق](../00-company/conversion-landing-page.md) بعد اعتماد الخطة والتحقق من حفظ الطلبات؛ مراجعة الصفحة واستكمال الخصوصية والنشر لم تنفذ. [confirmed]
- [x] حفظ متطلب مراجعة المراجع في كل مهمة وفق [D-015](../04-decisions/D-015-product-ux-interaction-review.md)؛ ليس اعتماد تنفيذ أو تغيير مرحلة. [confirmed]
- [x] إعداد [تقييم فرصة مبدئي بالأسئلة العشرة](../01-discovery/product-opportunity-assessment.md) ضمن الخطة المعتمدة؛ لا ينقل الشركة للمرحلة 3 ولا يغلق التحقق. [confirmed]
- [x] اعتماد المسار المحدود للهوية قبل صفحة الهبوط وفق [D-005](../04-decisions/D-005-identity-before-landing-page.md). [confirmed]
- [x] اختيار محور التموضع وفق [D-007](../04-decisions/D-007-connected-work-positioning.md). [confirmed]
- [x] حسم اسم العمل والوصف وفق [D-008](../04-decisions/D-008-temporary-name-direct-description.md)؛ لا يغلق بوابة الاسم التجاري النهائي. [confirmed]
- [x] اعتماد الاسم النهائي وعلاقة نطاق الشركة وفق [D-009](../04-decisions/D-009-final-product-name-company-subdomains.md). [confirmed]
- [x] اعتماد النبرة ومبادئ التصميم وفق [D-010](../04-decisions/D-010-clear-voice-bold-design-principles.md). [confirmed]
- [x] اختيار اتجاه الألوان لتطوير العينة وفق [D-011](../04-decisions/D-011-petrol-lime-visual-direction.md). [confirmed]
- [x] إعداد [عينة الهوية الأولى](../00-company/identity-specimen-one.md) للمراجعة؛ ليست اعتماداً للتصميم النهائي. [confirmed]
- [x] تسجيل رفض العينة الأولى واعتماد الاتجاه البديل وفق D-013 وإعداد [العينة الثانية](../00-company/identity-specimen-two.md). [confirmed]
- [x] توثيق متطلبات D-014 وفحص [Flowrbit](../00-company/flowrbit-design-study.md)؛ يتبقى اختبار عينة تستخدم الخط فعلياً. [confirmed]
- [x] تنفيذ [العينة التفاعلية](../00-company/interactive-design-specimen.md) والتحقق من الخط والأرقام والبحث واللغة؛ ليست اعتماداً نهائياً. [confirmed]
- [ ] مراجعة الهوية والصفحة المنفذة واعتماد الشكل النهائي؛ استكمال معلومات الخصوصية من المؤسس قبل حملة عامة، ولا ربط نطاق منفذ.
- [x] توثيق اعتماد الاتجاه في [D-004](../04-decisions/D-004-self-serve-product-led-growth.md) (2026-11-06)؛ ليس إغلاقاً للتحقق أو اعتماداً للبناء. [confirmed]
- [ ] تحليل المنافسين
- [ ] تقدير حجم السوق
- [ ] طرق الدفع المحلية (H-007)
- [ ] الوصول التقني للراوترات (H-005)
- [ ] اعتماد خطة تحقق عن بعد وفق [مرجع المؤسس](../01-discovery/in-product-validation.md)؛ تحفظ المقابلات كوسيلة اختيارية دون زيارات، ولا تجربة منفذة بعد. [confirmed]
- [ ] تحديث المشاكل والشخصيات بعد المقابلات

## المرحلة 3: تقييم الفكرة
- [ ] تقرير التقييم وقرار: نكمل، أو نعدل الاتجاه، أو نوقف
- [ ] نموذج العمل والتسعير الأولي
- [ ] المخاطر

## المرحلة 4: النسخة الأولى
- [ ] حدود النسخة الأولى
- [ ] رحلات المستخدم
- [ ] مواصفات كل ميزة

## المرحلة 5: بنية المنتج
- [ ] البنية التقنية المناسبة للوكلاء
- [ ] نظام التصميم (Design System) بالعربي والإنجليزي

## المرحلة 6: البناء والإطلاق
- [ ] البناء على مراحل صغيرة
- [ ] التجربة على شبكات المؤسس
- [ ] الإطلاق لأول العملاء
