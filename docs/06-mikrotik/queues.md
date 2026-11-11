---
type: reference
status: draft
owner: founder
updated: 2026-11-11
related: [README.md]
---

# Queues وتحديد السرعات

[confirmed] RouterOS يستخدم HTB؛ Simple Queues للحالات المباشرة وQueue Tree للهرمية. السرعة ليست حصة حجم. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328088/Queues)

## كيف يعمل
- [confirmed] Simple Queues تُفحص بالترتيب حتى المطابقة؛ العدد والترتيب يؤثران على الأداء. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328088/Queues)
- [confirmed] Queue Tree اتجاه واحد لكل فرع، تعتمد Packet Marks. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328088/Queues)
- [confirmed] `max-limit` السقف و`limit-at` المضمون؛ مجموع ضمانات الأبناء لا يتجاوز الأب. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328088/Queues)
- [confirmed] PCQ يقسم حسب Classifier؛ `pcq-rate=0` تقاسم عادل. التقسيم حسب IP لا حسب صاحب الكرت. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328088/Queues)
- [confirmed] HotSpot وPPP ينشئان Dynamic Queues من Profile؛ عدّل الـ Profile لا الـ Queue. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/56459266/HotSpot%2B-%2BCaptive%2Bportal)

## الفرق بين v6 وv7
- [confirmed] CoDel وFQ-CoDel وCAKE منذ v7.1beta3 فقط. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328088/Queues)

## أوامر مهمة
```routeros
/queue simple print stats
/queue tree print stats
/ip firewall filter print where action=fasttrack-connection
```

## مشاكل شائعة وحلولها
- [confirmed] **السرعة لا تتقيد:** FastTrack يتجاوز Simple Queues وQueue Tree بـ `parent=global`. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328088/Queues)
- [assumption] لا تعطل FastTrack كلياً؛ استثنِ المرور المطلوب تشكيله.
- [confirmed] تجاوز مؤقت للسرعة قد يكون Burst. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328088/Queues)

## مخاطر
- **R-queues-1 [confirmed]** وجود Queue لا يعني تطبيقها مع FastTrack.
- **R-queues-2 [assumption]** Queues يدوية + ديناميكية متداخلة تعطي سقفاً غير متوقع.
- **R-queues-3 [assumption]** جلب آلاف Queues كل 30 ثانية يرهق الراوتر.

## ماذا يعني لـ Mikro
- [assumption] عرض «الحد المضبوط» منفصلاً عن «السرعة المقاسة»، وتمييز القوائم اليدوية عن الديناميكية.
