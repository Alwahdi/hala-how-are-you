---
type: reference
status: draft
owner: founder
updated: 2026-11-11
related: [README.md]
---

# PPPoE Server: المشترك والباقة والجلسة

[confirmed] PPPoE ينقل PPP فوق Layer 2؛ الحسابات والسياسات والجلسات في قوائم PPP. [PPPoE](https://help.mikrotik.com/docs/spaces/ROS/pages/2031625/PPPoE) — [PPP AAA](https://help.mikrotik.com/docs/spaces/ROS/pages/132350049/PPP%2BAAA)

## كيف يعمل
- [confirmed] `/interface pppoe-server server` الخدمة، `/ppp secret` الحساب، `/ppp profile` الإعداد المشترك، `/ppp active` الجلسات. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/132350049/PPP%2BAAA)
- [confirmed] Discovery لا يعبر راوتر IP دون تمديد Layer 2. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2031625/PPPoE)
- [confirmed] `rate-limit` في Profile ينشئ Dynamic Queue؛ `512k/2M` = رفع 512k وتنزيل 2M. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/132350049/PPP%2BAAA)
- [confirmed] `only-one` لا يطبق بنفس الطريقة مع RADIUS. الراوتر يبحث في RADIUS فقط إذا لم يجد حساباً محلياً. [PPP](https://help.mikrotik.com/docs/spaces/ROS/pages/132350049/PPP%2BAAA) — [RADIUS](https://help.mikrotik.com/docs/spaces/ROS/pages/328097/RADIUS)

## الفرق بين v6 وv7
- [assumption] القوائم التقليدية مشتركة؛ اختبر Dynamic Queues والمحاسبة بعد الترقية.

## أوامر مهمة
```routeros
/interface pppoe-server server print detail
/ppp profile print detail
/ppp active print count-only
/ip pool used print
/ppp profile set [find where name="pppoe-basic"] rate-limit=512k/2M only-one=yes
```

## مشاكل شائعة وحلولها
- [confirmed] الخادم لا يظهر: الواجهة، VLAN، Bridge، `service-name`. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2031625/PPPoE)
- [confirmed] فشل المصادقة: `service`، طرق المصادقة، حساب محلي يسبق RADIUS. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328097/RADIUS)
- [confirmed] مواقع تفتح وأخرى لا: MTU/MRU و`change-tcp-mss`؛ الحد التقليدي 1492. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2031625/PPPoE)
- [confirmed] السرعة لا تطابق الباقة: FastTrack يتجاوز Simple Queues. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328088/Queues)

## مخاطر
- **R-pppoe-1 [confirmed]** PPPoE ليس تشفيراً؛ PAP يرسل كلمة المرور واضحة. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2031625/PPPoE)
- **R-pppoe-2 [assumption]** قطع جلسة مشترك يجب أن يكون إجراءً صريحاً بتأكيد.
- **R-pppoe-3 [assumption]** حسابات محلية + RADIUS بلا قاعدة أولوية تطبق باقة خاطئة.

## ماذا يعني لـ Mikro
- [assumption] عداد مستقل لجلسات PPPoE (`service=pppoe`)، ولا تُرسل بيانات Secrets في تقرير الـ 30 ثانية.
