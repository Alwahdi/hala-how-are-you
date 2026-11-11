---
type: reference
status: draft
owner: founder
updated: 2026-11-11
related: [README.md]
---

# استكشاف الأعطال والتشخيص

[assumption] نبدأ بقياسات خفيفة ثم اختبارات محدودة بموافقة المالك؛ غياب التقرير ليس دليلاً وحده على انقطاع الإنترنت.

## كيف يعمل
- [confirmed] `Logging` يحفظ الأحداث في RAM أو disk أو syslog بعيد. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/328094/Log)
- [confirmed] `Torch` يرى الحركة قبل Firewall، ولا يرى حركة bridge المسرّعة بالعتاد كاملة. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/8323150/Torch)
- [confirmed] `Ping`/`Traceroute` للفقد والمسار، لا لاختبار HTTPS. [Ping](https://help.mikrotik.com/docs/spaces/ROS/pages/8323183/Ping)
- [confirmed] `Netwatch` يراقب ويشغّل سكربتات عند تغير الحالة. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/8323208/Netwatch)
- [confirmed] `Profile` يعرض CPU لكل عملية ولكل نواة. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/8323153/Profiler)

## الفرق بين v6 وv7
- [confirmed] Netwatch قبل v7.4 = ICMP بسيط؛ بعده TCP وHTTP/HTTPS وDNS. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/8323208/Netwatch)
- [confirmed] `/interface wifi` منذ v7.13 (كان wifiwave2)، و`/interface wireless` driver مختلف. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/224559120/WiFi)

## أوامر مهمة
```routeros
/log print where topics~"script|error|warning"
/system resource print
/system script job print
/ping address=1.1.1.1 count=10
/tool traceroute address=1.1.1.1
/tool profile cpu=all
/tool torch interface=ether1
/interface wireless registration-table print stats
```
[confirmed] Bandwidth Test يستهلك موارد ويشبع الوصلة؛ للصيانة فقط. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/7962644/Bandwidth+Test)

## مشاكل شائعة وحلولها
| العرض | التشخيص |
|---|---|
| بطء وقت الذروة | [assumption] قارن سلكي/لاسلكي، البوابة ثم المزود، ازدحام الوصلة والـ queues والـ CPU. |
| إشارة قوية وأداء ضعيف | [assumption] تداخل، محاذاة، عوائق، عملاء بطيئون. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/122388523/Wireless+Troubleshooting) |
| انقطاعات متكررة | [assumption] اربط الوقت بسجلات reboot/wireless؛ افحص الكهرباء وPoE والكابل والحرارة. |
| الإنترنت يعمل والتقرير لا يصل | [assumption] افصل DNS وTLS والمصادقة عن حالة الشبكة. |
| السكربت يعمل يدوياً فقط | [confirmed] صلاحيات المجدول وowner. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/47579229/Scripting) |
| يتوقف قبل الإرسال | [confirmed] خطأ غير معالج يوقف السكربت؛ اعزل الحقول الاختيارية. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/47579229/Scripting) |

## مخاطر
- **R-troubleshooting-1 [confirmed]** Bandwidth Test في الدورة الدورية يضر الخدمة.
- **R-troubleshooting-2 [confirmed]** Netwatch يعمل بصلاحيات `read,write,test,reboot` وسياق مستقل. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/8323208/Netwatch)
- **R-troubleshooting-3 [assumption]** السجلات قد تكشف tokens وعناوين وMAC الزبائن.

## ماذا يعني لـ Mikro
- [assumption] «آخر تقرير» منفصل عن «حالة الإنترنت»: انقطاع التقرير = «تعذر الرصد».
- [assumption] Torch وBandwidth Test أدوات يطلبها المالك يدوياً، لا جزء من التقرير الدوري.
