---
type: reference
status: draft
owner: founder
updated: 2026-11-11
related: [README.md]
---

# User Manager وRADIUS

[confirmed] User Manager خادم RADIUS؛ و`/radius` إعداد العميل على الراوتر الذي يقدم Hotspot أو PPP. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328097/RADIUS)
[confirmed] الانتقال v6 → v7 يحتاج ترحيل قاعدة User Manager يدوياً. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2555940/User+Manager)

## كيف يعمل
- [confirmed] قيم RADIUS تتجاوز default profile، والقيم غير المرسلة تؤخذ منه. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328097/RADIUS)
- [confirmed] وجود مستخدم محلي بنفس الاسم يمنع الرجوع إلى RADIUS. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328097/RADIUS)
- [confirmed] في v7: `user` ← `user-profile` ← `profile` ← `profile-limitation` ← `limitation`؛ ويجب `use-profiles=yes` (الافتراضي no). [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2555940/User+Manager)
- [confirmed] تطبيق الحدود يحتاج accounting وInterim updates، وفصل الجلسة يحتاج `/radius incoming accept=yes`. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2555940/User+Manager)
- [confirmed] المنافذ UDP 1812/1813. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328097/RADIUS)
- [assumption] خلف CGNAT: RADIUS عبر نفق بعنوان NAS ثابت داخله.

## الفرق بين v6 وv7
- [confirmed] v6: `/tool user-manager` وواجهة `/userman`. [المصدر](https://forum.mikrotik.com/t/failure-bad-path-when-moving-usermanager-database-to-usb/143242)
- [confirmed] v7: `/user-manager` وقاعدة SQLite جديدة؛ يمكن ترحيل users/profiles/limitations/routers/counters/sessions. واجهة ويب للمستخدم النهائي تحت `/um/`. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2555940/User+Manager)
- [confirmed] حزمة منفصلة، غير متاحة على SMIPS، والجلسات مقيدة بالرخصة. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2555940/User+Manager)

## أوامر مهمة
```routeros
/user-manager user print count-only
/user-manager session print count-only
/user-manager database print
/ip hotspot profile set [find where name="hsprof1"] use-radius=yes radius-accounting=yes
/ppp aaa set use-radius=yes accounting=yes interim-update=1m
/user-manager set enabled=yes use-profiles=yes
/user-manager database save name=before-migration
/user-manager database migrate-legacy-db database-path=legacy-user-manager
```

## مشاكل شائعة وحلولها
- [confirmed] **اختفاء المستخدمين بعد الترقية:** v7 يبدأ بقاعدة جديدة؛ انسخ مجلد v6 كاملاً ونفّذ الترحيل. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2555940/User+Manager)
- [confirmed] تقارير فشل الترحيل في 7.1 و7.1.3. [المصدر](https://forum.mikrotik.com/t/user-manager-radius-7-1-migration-issue/154205)
- [confirmed] نفاد التخزين: راقب `db-size` و`free-disk-space`؛ `optimize-db` ليس أداة إصلاح تلف. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2555940/User+Manager)
- [confirmed] **رفض الدخول بعد 7.15+:** ردود RADIUS بلا Message-Authenticator تُرفض؛ حدّث الخادم بدل التعطيل الأعمى. [المصدر](https://forum.mikrotik.com/t/resolved-how-to-fix-mikrotik-login-failed-with-radius-added-require-message-auth-option-on-v7-15/176604)
- [confirmed] الحدود لا تفصل المشترك: افحص accounting وInterim وincoming. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2555940/User+Manager)

## مخاطر
- **R-UM-1 [confirmed]** `overwrite` في الترحيل يستبدل قاعدة v7.
- **R-UM-2 [assumption]** قاعدة الكروت على flash صغير = نقطة فشل واحدة.
- **R-UM-3 [confirmed]** بلا accounting/Interim لا تُطبق الحدود بدقة.
- **R-UM-4 [assumption]** الاعتماد على IP عام خلف CGNAT يخلط هوية NAS.
- **R-UM-5 [assumption]** قواعد المستخدمين والنسخ بيانات حساسة.

## ماذا يعني لـ Mikro
- [assumption] تقرير الـ 30 ثانية للصحة فقط، وليس بديلاً عن RADIUS accounting أو دليل رصيد.
- [assumption] الترحيل خطوات: نسخة احتياطية، اختبار، مقارنة أعداد، تراجع؛ لا زر تلقائي.
