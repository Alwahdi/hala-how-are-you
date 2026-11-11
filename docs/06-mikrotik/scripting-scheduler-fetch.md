---
type: reference
status: draft
owner: founder
updated: 2026-11-11
related: [README.md, ../04-decisions/D-028-router-push-status.md]
---

# Scripting وScheduler وFetch (أساس ربط Mikro الحالي)

[confirmed] Fetch يرسل HTTP POST، لكن دعم الخيارات وحدود البيانات والتحقق من TLS والصلاحيات عوامل مستقلة. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/8978514/Fetch)
[assumption] يجب اختبار سكربت Mikro من المجدول فعلياً، وفصل أخطاء جمع البيانات عن أخطاء الإرسال.

## كيف يعمل
- [confirmed] السكربت يتوقف عند أول runtime error؛ `:do { } on-error={ }` يعزل الخطأ. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/47579229/Scripting)
- [confirmed] المجدول يكرر حسب `interval`؛ `start-time=startup` مع interval لا يعني تنفيذاً فورياً عند الإقلاع. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/40992881/Scheduler)
- [assumption] POST الصادر يعمل خلف CGNAT بشرط نجاح DNS وHTTPS الصادر.

## الفرق بين v6 وv7
- [confirmed] `http-method` و`http-data` أضيفا في 6.39؛ الأقدم لا يرسل POST. [المصدر](https://forum.mikrotik.com/t/post-request-with-fetch/108061)
- [confirmed] `:serialize` لبناء JSON موجود في التوثيق الحديث (v7) وليس في v6. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/47579229/Scripting)
- [confirmed] حد `http-data` هو 64KB؛ `output=none` لا يرفعه. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/8978514/Fetch)
- [assumption] نرسل مجاميع فقط (لا قوائم جلسات) ونبقي الحجم تحت 8KB.

## أوامر مهمة
```routeros
:local json "{\"schema\":1}"
:do {
  /tool fetch url="https://example.invalid/report" http-method=post \
    http-header-field="Content-Type: application/json" \
    http-data=$json output=none check-certificate=yes
} on-error={ :log warning "Mikro report failed" }

/system scheduler print detail
/system script job print
/log print where topics~"script"

# v7 فقط
:local payload {"identity"=[/system identity get name]}
:local json [:serialize to=json value=$payload options=json.no-string-conversion]
```
[confirmed] الصلاحيات: تشغيل السكربت بالاسم يستخدم صلاحياته، و`/system script run` قد يرث صلاحيات المجدول؛ المجدول المحدود لا يشغل سكربتاً بصلاحيات أعلى. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/47579229/Scripting)

## مشاكل شائعة وحلولها
- [confirmed] **HTTPS بلا تحقق افتراضياً** (`check-certificate=no`)؛ `yes` يتحقق من السلسلة في المخزن المحلي. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/8978514/Fetch)
- [assumption] فشل TLS بعد التفعيل: ساعة الجهاز، صلاحية الشهادة، hostname، وسلسلة CA.
- [confirmed] الفاصلة تفصل headers؛ الفاصلة داخل القيمة تحتاج escaping. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/8978514/Fetch)
- [assumption] يعمل يدوياً ويفشل من المجدول: راجع owner وpolicy.
- [assumption] يتوقف قبل الإرسال: كل حقل اختياري (health، routerboard، hotspot) في `on-error` منفصل.
- [assumption] JSON يدوي: identity بالعربي أو فيها `"` يكسر JSON؛ يلزم escaping للـ backslash والاقتباس وأحرف التحكم.
- [assumption] بطء الشبكة قد يسبب تداخل التشغيلات كل 30 ثانية؛ استخدم قفلاً.

## مخاطر
- **R-fetch-1 [confirmed]** بدون تحقق من الشهادة يمكن اعتراض token.
- **R-fetch-2 [assumption]** تراكم jobs عند بطء الشبكة.
- **R-fetch-3 [assumption]** `dont-require-permissions=yes` كحل افتراضي يوسّع الصلاحيات.
- **R-fetch-4 [assumption]** token يظهر في export أو مصدر السكربت.
- **R-fetch-5 [assumption]** فقد أو تكرار القياسات عند انقطاع النقل.

## ماذا يعني لـ Mikro
- [assumption] مصفوفة اختبار: أقل v6 مدعوم وv6 حديث وv7، تشمل POST وheaders وTLS والمجدول وJSON بالعربي.
- [assumption] «آخر اتصال» منفصل عن «آخر قراءة حرارة».
