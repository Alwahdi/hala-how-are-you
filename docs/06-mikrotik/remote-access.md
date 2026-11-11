---
type: reference
status: draft
owner: founder
updated: 2026-11-11
related: [README.md, api-rest.md]
---

# الوصول البعيد وMikroTik Cloud

[confirmed] IP Cloud يقدم DDNS؛ وBack To Home (BTH) يستخدم relay عند تعذر الوصول المباشر. [Cloud](https://help.mikrotik.com/docs/spaces/ROS/pages/97779929/Cloud) — [BTH](https://help.mikrotik.com/docs/spaces/ROS/pages/197984280/Back+To+Home)
[assumption] لـ Mikro: telemetry صادر، والإدارة عبر نفق يبدأه الراوتر إلى بوابة نملكها، مع بديل حسب الإصدار.

## كيف يعمل
- [confirmed] IP Cloud DDNS يفحص تغير IP كل 60 ثانية وTTL 60 ثانية، عبر `cloud2.mikrotik.com` UDP 15252. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/97779929/Cloud)
- [assumption] DDNS لا يحل CGNAT؛ ظهور `dns-name` ليس دليلاً على إمكانية الوصول.
- [confirmed] BTH يتطلب v7.12+ ومعمارية ARM/ARM64/TILE، وقد تنخفض السرعة عبر relay. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/197984280/Back+To+Home)
- [confirmed] WireGuard (UDP) مع `persistent-keepalive` 25s لمن هو خلف NAT. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/69664792/WireGuard)
- [confirmed] SSTP = PPP داخل TLS على TCP 443. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2031645/SSTP)
- [confirmed] L2TP وحده بلا تشفير؛ يُدمج مع IPsec. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2031631/L2TP)

## الفرق بين v6 وv7
- [confirmed] WireGuard في v7 فقط؛ BTH من v7.12. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/69664792/WireGuard)
- [assumption] SSTP وL2TP/IPsec وOpenVPN TCP على v6/v7؛ OpenVPN UDP على v7 فقط (يحتاج اختباراً).
- [confirmed] OpenVPN في RouterOS تنفيذ خاص بلا NCP؛ يجب تحديد cipher. تغييرات push routes في 7.14 وتعدد الخوادم في 7.17. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2031655/OpenVPN)
- [confirmed] IP Cloud لا يدعم x86، وCHR يحتاج رخصة مدفوعة. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/97779929/Cloud)

## أوامر مهمة
```routeros
/ip cloud print
/ip cloud set ddns-enabled=yes
/interface wireguard peers print
/interface sstp-client print
/interface l2tp-client print
/interface ovpn-client print
```

## مشاكل شائعة وحلولها
- [assumption] DDNS يعمل والاتصال يفشل: CGNAT أو double NAT أو firewall.
- [assumption] UDP محجوب: جرّب SSTP أو OpenVPN TCP.
- [confirmed] شهادات OpenVPN تحتاج ساعة صحيحة؛ فعّل NTP. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2031655/OpenVPN)
- [assumption] نجاح handshake لا يثبت وصول API: افحص routing وfirewall وMTU.
- [assumption] لا تجعل النفق default route؛ قد يقطع fetch كل 30 ثانية.

## مخاطر
- **R-remote-1 [assumption]** فتح API/WebFig على WAN لتجاوز CGNAT يزيد سطح الهجوم.
- **R-remote-2 [confirmed]** BTH يعتمد relay تابع لـ MikroTik بلا SLA.
- **R-remote-3 [assumption]** بوابة VPN مشتركة دون عزل تسمح بالتنقل بين شبكات العملاء.
- **R-remote-4 [assumption]** إتاحة خدمات Cloud في اليمن/مصر/سوريا غير مؤكدة.
- **R-remote-5 [assumption]** تغيير routes/DNS/MTU أثناء الإعداد قد يوقف telemetry.

## ماذا يعني لـ Mikro
- [assumption] الأساس HTTPS صادر بلا افتراض IP عام أو DDNS أو BTH.
- [assumption] الإدارة لاحقاً: WireGuard على v7، وSSTP/OpenVPN TCP بديلاً.
- [assumption] ملف قدرات لكل راوتر: الإصدار، المعمارية، CGNAT، TCP/UDP، حالة النفق، آخر telemetry.
