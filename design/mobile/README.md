---
type: design-index
status: draft
owner: founder
updated: 2026-11-21
related: [../../docs/03-product/mobile-voucher-experience.md, ../../docs/03-product/mobile-owner-refinements.md, ../../docs/03-product/mobile-persona-walkthrough.md, ../../apps/mobile/README.md]
---
# تصاميم Mikro للجوال

**الملخص:** [confirmed] هذه نسخ HTML الأصلية المحفوظة من جلسة التصميم، نُقلت إلى المستودع لتبقى قابلة للمراجعة خارج المحادثة.
[confirmed] الأرقام والكروت وكلمات المرور المعروضة أمثلة توضيحية؛ لا اتصال براوتر أو إصدار أو طباعة فعلية من هذه التصورات. التطبيق الأصلي منفصل في `apps/mobile`.

## النسخ المحفوظة

| النسخة | الغرض |
|---|---|
| [mikro-owner-ready.html](mikro-owner-ready.html) | [confirmed] آخر تنقيح معتمد ضمن D-054؛ مرجع نتائجه في سجل التحسينات المرتبط أعلاه |
| [mikro-network-hub.html](mikro-network-hub.html) | [confirmed] مرجع دراسة الشخصية قبل التنقيح الأخير |
| [mikro-network-operations.html](mikro-network-operations.html) | [confirmed] تصور الباقات والإجراءات ضمن المصدر |
| [mikro-daily-work.html](mikro-daily-work.html) | [confirmed] تصور مهام صاحب الشبكة اليومية |
| [mikro-owner-flow.html](mikro-owner-flow.html) | [confirmed] تصور رحلة المالك والإعداد |
| [mikro-mobile-design.html](mikro-mobile-design.html) | [confirmed] التصور الأساسي السابق |

## التشغيل والفحص

[confirmed] يمكن فتح HTML مباشرة في متصفح؛ الخطوط الخارجية تحتاج وصولًا لمصدرها. أدوات حفظ حالة المحادثة اختيارية، والبيانات التشغيلية تبقى توضيحية.
[confirmed] من هذا المجلد، تثبت الأوامر التالية اعتماديات الفحص ثم تعيد فحوص التصور الأخير. لا تقوم هذه الفحوص مقام تجربة مستخدم أو جهاز أو RouterOS.

```sh
npm ci
npm test
npm run persona
```

- [confirmed] [دليل مراجعة الشخصية التاريخي](persona-walkthrough-evidence.json) محفوظ كما أُنتج؛ إعادة التشغيل تكتب نتيجة جديدة داخل `artifacts/` المستبعد من Git.
- [confirmed] فحوص المصدر تعتمد DOM مصطنعًا عبر LinkeDOM؛ التطبيق الأصلي ونتائج بنائه موثقان في الروابط أعلاه.
