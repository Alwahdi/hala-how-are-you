---
type: register
status: draft
owner: founder
updated: 2026-11-11
related: [README.md, ../04-decisions/D-028-router-push-status.md]
---
# سجل مخاطر MikroTik (R-###)

**الملخص:** المخاطر الأعلى أثراً على Mikro من الدراسة. التفاصيل والمصادر في ملف كل موضوع. الأولوية: عالية = تمس الربط الحالي أو أمن العملاء.

| ID | الخطر | الأولوية | الملف | ماذا نفعل |
|---|---|---|---|---|
| R-001 | Fetch لا يتحقق من شهادة HTTPS افتراضياً؛ token قابل للاعتراض | عالية | [security](security.md) | إضافة `check-certificate=yes` بعد اختبار v6/v7 |
| R-002 | خطأ في قراءة حقل اختياري (health/routerboard/hotspot) يوقف السكربت كله | عالية | [scripting](scripting-scheduler-fetch.md) | كل قراءة في `on-error` منفصل (جزئياً مطبق) |
| R-003 | v6 أقدم من 6.39 لا يدعم POST | عالية | [scripting](scripting-scheduler-fetch.md) | فحص الإصدار قبل توليد الأمر |
| R-004 | اسم الراوتر بالعربي أو فيه `"` يكسر JSON اليدوي | عالية | [scripting](scripting-scheduler-fetch.md) | escaping في السكربت أو إرسال الاسم مرمّزاً |
| R-005 | صلاحيات `read,write,test` أوسع من اللازم | متوسطة | [security](security.md) | اختبار `read,test` للتشغيل الدوري |
| R-006 | تداخل التشغيلات عند بطء الشبكة | متوسطة | [troubleshooting](troubleshooting.md) | قفل تشغيل واحد |
| R-007 | token يظهر في export ومصدر السكربت | متوسطة | [security](security.md) | token لكل راوتر قابل للإلغاء (مطبق) |
| R-008 | DDNS لا يحل CGNAT | معلومة | [remote-access](remote-access.md) | الاتصال الصادر (مطبق) |
| R-009 | ترحيل User Manager v6→v7 يدوي وقد يفقد الكروت | عالية (لاحقاً) | [user-manager](user-manager-radius.md) | خطوات نسخ واختبار وتراجع |
| R-010 | RADIUS بعد 7.15 يرفض ردود بلا Message-Authenticator | متوسطة | [user-manager](user-manager-radius.md) | خادم RADIUS محدث |
| R-011 | FastTrack يتجاوز حدود السرعة | متوسطة | [queues](queues.md) | تنبيه للمالك عند الاكتشاف |
| R-012 | «الكرت خلص بسرعة»: الحد يشمل الرفع والتنزيل، والوقت يُحسب أثناء الاتصال | منتج | [hotspot](hotspot.md) | شرح ذلك في رسالة الزبون |
| R-013 | أجهزة 32MB/16MB (hAP lite) ضيقة على v7 وبلا User Manager | متوسطة | [hardware](hardware.md) | تصنيف الجهاز من موارده |
| R-014 | أجهزة مخترقة سابقاً تبقى مخترقة بعد الترقية | عالية | [security](security.md) | فحص سكربتات/مستخدمين مجهولين لاحقاً |
| R-015 | فتح API/Winbox على الإنترنت | عالية | [remote-access](remote-access.md) | ممنوع في Mikro |
