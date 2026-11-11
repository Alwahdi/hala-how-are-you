---
type: reference
status: draft
owner: founder
updated: 2026-11-11
related: [README.md]
---

# HotSpot: الحسابات والكروت والجلسات

[confirmed] RouterOS يفصل بين الحساب وسياسة الاستخدام والجلسات المتصلة؛ عدد الجلسات ليس عدد الكروت المباعة ولا الأجهزة. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/56459266/HotSpot%2B-%2BCaptive%2Bportal)

## كيف يعمل
- [confirmed] `/ip hotspot user` الحساب وحدوده؛ `user profile` الخصائص المشتركة (`rate-limit`، `shared-users`، `session-timeout`)؛ `/ip hotspot profile` إعداد الخادم وصفحات HTML وليس الباقة. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/56459266/HotSpot%2B-%2BCaptive%2Bportal)
- [confirmed] `limit-bytes-total` = مجموع الرفع والتنزيل؛ `limit-uptime` = زمن الاتصال، وليس صلاحية تقويمية. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/56459266/HotSpot%2B-%2BCaptive%2Bportal)
- [confirmed] `shared-users` = عدد الجلسات المتزامنة للاسم نفسه، لا عدد الأجهزة طوال عمر الكرت. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/56459266/HotSpot%2B-%2BCaptive%2Bportal)
- [confirmed] `active` الجلسات الحالية، `host` الأجهزة المعروفة، `cookie` لإعادة الدخول؛ وجود host أو cookie لا يعني جلسة نشطة. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/56459266/HotSpot%2B-%2BCaptive%2Bportal)
- [confirmed] `mac-cookie` إعادة دخول بالـ MAC بعد مصادقة سابقة؛ `login-by=mac` مصادقة مستقلة بالـ MAC. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/56459266/HotSpot%2B-%2BCaptive%2Bportal)
- [confirmed] `rate-limit` ينشئ Dynamic Simple Queue؛ `rx/tx` من منظور الراوتر (رفع العميل/تنزيله). [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/56459266/HotSpot%2B-%2BCaptive%2Bportal)

## صفحات الدخول وطباعة الكروت
- [confirmed] الملفات `login.html` و`status.html` و`logout.html`؛ يجب الحفاظ على متغيرات RouterOS ومنطق CHAP عند التعديل. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/87162881/Hotspot+customisation)
- [assumption] لـ Mikro: دفعات كروت بمعرّف Batch، معاينة قبل الطباعة، وإظهار الحجم والسرعة والوقت والصلاحية كلٌّ على حدة. إعادة الطباعة منفصلة عن إعادة التفعيل.

## الفرق بين v6 وv7
- [confirmed] إعلان Captive Portal عبر DHCP منذ v7.3 (قد يحتاج `api.json` وشهادة). [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/56459266/HotSpot%2B-%2BCaptive%2Bportal)
- [confirmed] `device-mode` قد يمنع تشغيل HotSpot في الإصدارات التي تطبقه؛ HotSpot لـ IPv4 فقط. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/56459266/HotSpot%2B-%2BCaptive%2Bportal)

## أوامر مهمة
```routeros
/ip hotspot user profile print
/ip hotspot user print
/ip hotspot active print count-only
/ip hotspot host print detail
/ip hotspot cookie print
/ip hotspot user profile set [find where name="voucher-basic"] rate-limit=512k/2M shared-users=1
```

## مشاكل شائعة وحلولها
- [confirmed] **«الكرت خلص بسرعة»:** الحد يشمل الرفع والتنزيل معاً؛ ابدأ بـ `bytes-in` + `bytes-out`. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/56459266/HotSpot%2B-%2BCaptive%2Bportal)
- [assumption] تحديثات الهاتف والنسخ الاحتياطي والفيديو التلقائي أسباب محتملة؛ تُثبت بالقياس.
- [confirmed] **«ما استخدمت الهاتف وخلص الوقت»:** `limit-uptime` يحسب زمن الاتصال؛ راجع `idle-timeout` و`keepalive-timeout` والـ cookies. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/56459266/HotSpot%2B-%2BCaptive%2Bportal)
- [confirmed] شكوى منتدى عن عدم تطبيق حد uptime مع User Manager؛ حالة فردية، افحص Accounting وInterim Updates. [المصدر](https://forum.mikrotik.com/t/user-manager-hotspot-uptime-limit-not-enforced/267385)

## مخاطر
- **R-hotspot-1 [confirmed]** `http-pap` يرسل بيانات الدخول بلا تشفير. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/56459266/HotSpot%2B-%2BCaptive%2Bportal)
- **R-hotspot-2 [assumption]** عرض hosts أو cookies كأنها «متصلون» يضلل المالك.
- **R-hotspot-3 [assumption]** الـ MAC قابل للتغيير والانتحال؛ ليس إثبات هوية.

## ماذا يعني لـ Mikro
- [assumption] العداد الحالي `active print count-only` اسمه «جلسات HotSpot النشطة».
- [assumption] الباقة تُفصل إلى: حجم، سرعة، uptime، مدة جلسة، صلاحية تقويمية، مشاركة، ومصدر التطبيق (محلي أو RADIUS).
