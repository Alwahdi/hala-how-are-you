---
type: reference
status: draft
owner: founder
updated: 2026-11-11
related: [README.md, user-manager-radius.md]
---

# فروق RouterOS v6 وv7 المؤثرة على Mikro

[confirmed] v7 يدعم أسلوب أوامر v6 عموماً، لكن فيه تغييرات بنيوية خاصة في User Manager وrouting. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/115736772/Upgrading+to+v7)
[assumption] Mikro يكتشف قدرات كل راوتر ويختبر telemetry وRADIUS بعد كل ترقية، لا يعتمد على رقم الإصدار وحده.

## كيف يعمل
- [confirmed] الترقية: أولاً لأحدث v6 (stable أو long-term) ثم v7؛ التحويل التلقائي يغطي أغلب الإعدادات مع استثناءات. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/115736772/Upgrading+to+v7)
- [confirmed] لا يُنصح بـ v7 على أجهزة ذاكرتها أقل من 64MB. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/115736772/Upgrading+to+v7)
- [confirmed] قناة long-term للإصلاحات الحرجة، وstable للميزات المختبرة؛ testing/development ليست للإنتاج. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328142/Upgrading+and+installation)

## الفرق بين v6 وv7
- [confirmed] BGP وOSPF وrouting filters أعيد تصميمها في v7. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/115736772/Upgrading+to+v7)
- [confirmed] `/system health` في v7 صفوف (`name`/`value`/`type`) وأسماء الحساسات تختلف حسب العتاد (`temperature`، `cpu-temperature`، `board-temperature1`). [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/25690117/Health)
- [confirmed] User Manager في v7 تنفيذ جديد: مساره `/user-manager` بدل `/tool user-manager`، وإدارته عبر WinBox/CLI بلا واجهة الويب القديمة، ولا ترقية شفافة؛ توجد أداة `migrate-legacy-db`. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/115736772/Upgrading+to+v7) — [UM](https://help.mikrotik.com/docs/spaces/ROS/pages/2555940/User+Manager)
- [confirmed] User Manager حزمة منفصلة، غير متاح على SMIPS، وعدد الجلسات مقيد بمستوى الرخصة. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2555940/User+Manager)

## أوامر مهمة
```routeros
/system resource print
/system package print
/system package update print
/system health print
:local ids [/system health find where name="temperature"]
:if ([:len $ids] > 0) do={ :put [/system health get [:pick $ids 0] value] }
/user-manager/database/migrate-legacy-db
```

## مشاكل شائعة وحلولها
- [confirmed] تحويل إعدادات routing يتم مرة واحدة؛ downgrade ثم تعديل ثم upgrade قد يعيد إعداد v7 القديم. الخيار `force-v6-to-v7-configuration-upgrade=yes` يعيد التحويل. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/115736772/Upgrading+to+v7)
- [assumption] قبل الترقية: نسخة احتياطية للإعدادات وقاعدة User Manager خارج الجهاز، ووصول إنقاذ.
- [confirmed] قراءة health المكثفة على CCR2004-16G-2S+PC ترفع CPU. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/25690117/Health)

## مخاطر
- **R-v6v7-1 [assumption]** قراءة health غير متوافقة قد توقف السكربت كله.
- **R-v6v7-2 [assumption]** ترحيل User Manager دون اختبار يكسر الكروت أو الحدود أو accounting.
- **R-v6v7-3 [assumption]** ترقية راوتر بعيد دون خطة إنقاذ قد تحتاج زيارة ميدانية.
- **R-v6v7-4 [assumption]** نقص الذاكرة أو المساحة يفشل الترقية.

## ماذا يعني لـ Mikro
- [assumption] إرسال الإصدار والمعمارية والقدرات مع كل تقرير، وجعل الحقول الأساسية مستقلة عن health وUser Manager.
- [assumption] adapter منفصل لـ User Manager v6 وv7.
