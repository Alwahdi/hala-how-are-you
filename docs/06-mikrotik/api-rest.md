---
type: reference
status: draft
owner: founder
updated: 2026-11-11
related: [README.md]
---

# RouterOS API وREST API

[confirmed] يستخدم API المنفذين TCP 8728 و8729، بينما REST يعمل عبر خدمة الويب في v7؛ وهما ليسا نفس البروتوكول. [API](https://help.mikrotik.com/docs/spaces/ROS/pages/47579160/API) — [REST](https://help.mikrotik.com/docs/spaces/ROS/pages/47579162/REST%20API)
[assumption] الأنسب لـ Mikro إبقاء telemetry الصادر أساساً، وإضافة الإدارة عبر API داخل VPN، لا فتح الإدارة للإنترنت.

## كيف يعمل
- [confirmed] API بروتوكول ثنائي (sentences/words) قريب من CLI؛ 8728 لـ `api` و8729 لـ `api-ssl`. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/47579160/API)
- [confirmed] `api-ssl` قد يعمل دون شهادة (anonymous DH)، فاسم الخدمة لا يضمن التحقق من هوية الخادم. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/47579160/API)
- [confirmed] REST واجهة JSON عند `/rest` بـ HTTP Basic Auth وحساب RouterOS. GET قراءة، PUT إنشاء، PATCH تعديل، DELETE حذف، POST لأوامر console؛ القيم تعود strings. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/47579162/REST%20API)
- [confirmed] صلاحية `api` للدخول عبر API و`rest-api` عبر REST، وتبقى `read`/`write` منفصلة. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/8978504/User)
- [confirmed] مجموعة `read` الافتراضية ليست الحد الأدنى (تشمل `sensitive` و`reboot`)؛ أنشئ custom group. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/8978504/User)

## الفرق بين v6 وv7
- [confirmed] API متاح في v6 وv7؛ تغيّر login منذ v6.43، فيجب أن يدعم العميل الطريقتين. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/47579160/API)
- [confirmed] REST بدأ في v7.1beta4 (عبر `www-ssl`)، ودعم `www` غير المشفر منذ v7.9. لا REST في v6. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/47579162/REST%20API)

## أوامر مهمة
```routeros
/ip service print
/user group print
/user group add name=mikro-api-ro policy=read,api
# v7 فقط
/user group add name=mikro-rest-ro policy=read,rest-api
# قالب تقييد (لا تنفّذه كما هو)
/ip service set api disabled=yes
/ip service set api-ssl disabled=no certificate=ROUTER_TLS_CERT address=10.250.0.0/24
```
[confirmed] `address` يقيد العملاء على مستوى الخدمة لكنه ليس جداراً نارياً. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/103841820/Services)

## مشاكل شائعة وحلولها
- [confirmed] REST يقطع الطلب بعد 60 ثانية ولا يدعم streaming؛ استخدم `once`/`count`/`duration`. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/47579162/REST%20API)
- [confirmed] استخدم `.proplist` لتقليل الحقول والحمل. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/47579160/API)
- [confirmed] `max-sessions` الافتراضي 20 لكل خدمة في التوثيق الحالي. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/103841820/Services)
- [confirmed] `fetch` يحتاج صلاحية `test`. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/8978504/User)
- [assumption] لا سقف موثق لعدد الطلبات بالثانية؛ نستخدم حدود تزامن وbackoff.

## مخاطر
- **R-api-1 [confirmed]** 8728 أو REST عبر HTTP يعرّض بيانات الدخول للتنصت.
- **R-api-2 [confirmed]** منح `policy`/`write` لقارئ telemetry غير لازم وخطر.
- **R-api-3 [assumption]** polling متزامن بلا حدود يرهق الأجهزة الضعيفة.
- **R-api-4 [assumption]** token داخل السكربت سر يظهر للمشرفين؛ token لكل راوتر مع إلغاء وتدوير.

## ماذا يعني لـ Mikro
- [assumption] إبقاء POST الصادر كل 30 ثانية مساراً للقراءة، وAPI (v6/v7) أو REST (v7.1+) للإدارة لاحقاً داخل نفق.
- [assumption] حساب قراءة منفصل عن حساب تنفيذ أوامر Hotspot/PPPoE.
