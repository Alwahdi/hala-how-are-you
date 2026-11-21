---
type: index
status: draft
owner: founder
updated: 2026-11-21
related: [../05-operations/roadmap.md, ../templates/feature-spec.md]
---
# المنتج

**الملخص:** [confirmed] يضم المجلد دراسات الواجهات ضمن اعتمادها المحدود؛ لا يغلق ذلك تقييم الفرصة أو يعتمد النسخة الأولى.
ممنوع نبني أي ميزة ما لها ملف مواصفات معتمد هنا.

## الدراسات الحالية
- [confirmed] [بناء التجربة على EAS](mobile-eas-build.md)؛ إعداد الرفع والبناء ونتائجه وفق D-056، دون إغلاق اختبار الهاتف والراوتر.
- [confirmed] [التجربة الأصلية المحلية](mobile-native-pilot-spec.md) معتمدة وفق D-055؛ [أدلة التحقق وحدود الجاهزية](mobile-pilot-verification.md) تفصل فحوص الكود والمتصفح عن الهاتف والراوتر والطباعة الفعلية.
- [confirmed] [تجربة تطبيق الجوال](mobile-voucher-experience.md)؛ رحلة ومواصفات وتصور للمراجعة ضمن [الخطة المعتمدة](mobile-voucher-plan.md)، قبل البناء.
- [confirmed] [رئيسية صاحب الشبكة](mobile-owner-home-spec.md) و[إعداد الرقم والشبكة](mobile-account-setup-spec.md)؛ توسعة مراجعة تجربة الجوال، لا تنفيذ هوية أو ربط أو جمع بيانات.
- [confirmed] [مهام المستخدم الجديد واختبارها](mobile-jtbd-review.md)، و[رد الزبون](mobile-voucher-report-spec.md)، و[الشكوى](mobile-complaints-spec.md)، و[التجديد](mobile-voucher-renewal-spec.md)؛ مواصفات مسودة مرتبطة بمراجعة التفاعل.
- [confirmed] [إضافة الباقات وتعديلها](mobile-packages-spec.md) و[الإجراءات السريعة](mobile-quick-actions-spec.md)؛ مراجعة مكتملة كمحاكاة، وتحتاج السياسات والمواصفات والمختبر اعتمادًا قبل التنفيذ.
- [confirmed] [إدارة اتصالات الشبكات](mobile-saved-networks-spec.md) و[بطاقة الربط والاستكشاف](mobile-router-spec.md)؛ تنقيح التصور وفق D-052، لا اكتشاف أو حفظ دائم منفذ.
- [confirmed] [مراجعة المهام من منظور PER-001](mobile-persona-walkthrough.md)؛ أدلة من النموذج وأولويات الإصلاح مع فصلها عن نتائج المستخدمين.
- [confirmed] [تنفيذ تحسينات PER-001](mobile-owner-refinements.md)؛ ربط نتائج المراجعة بإصلاحات التصور والفحوص وحدود الجاهزية وفق D-054.
- [confirmed] [مراجعة الدفعات الكبيرة](voucher-large-batch-review.md)؛ أدلة حدود الإصدار والطباعة واتجاه التوسعة المقترح.
- [confirmed] [تحقق الإصدار قبل النشر](voucher-release-verification.md)؛ نتائج المختبر والمتبقي وحدود الجاهزية.
- [confirmed] [دراسة إصدار الكروت والطباعة والقوالب](voucher-issuance-printing-review.md)؛ نتيجة تنفيذ نطاقها وحدوده في [D-044](../04-decisions/D-044-voucher-issuance-and-printing.md).
- [confirmed] [مراجعة إعادة التصميم للهاتف](mobile-first-redesign-review.md)، والدراسة السابقة المرتبطة بها.

## الملفات المتوقعة
- `mvp.md`: حدود النسخة الأولى، يعني وش داخلها ووش برّاها.
- `journeys/`: رحلات المستخدم لكل طرف.
- `specs/`: ملف مواصفات لكل ميزة، من [قالب المواصفات](../templates/feature-spec.md).
- `architecture.md`: بنية المنتج التقنية، وتنكتب بعد اعتماد النسخة الأولى.
