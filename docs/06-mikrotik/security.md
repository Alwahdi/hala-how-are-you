---
type: reference
status: draft
owner: founder
updated: 2026-11-11
related: [README.md]
---

# أمن RouterOS وصلاحيات Mikro

[confirmed] الترقية لا تلغي وصولاً زرعه مهاجم سابقاً ولا تحمي كلمات مرور مسرّبة. [المصدر](https://mikrotik.com/supportsec/meris-botnet/)
[confirmed] مجموعة `read` الافتراضية ليست أقل صلاحية؛ وFetch لا يتحقق من الشهادة افتراضياً. [الصلاحيات](https://help.mikrotik.com/docs/spaces/ROS/pages/8978504/User) — [Fetch](https://help.mikrotik.com/docs/spaces/ROS/pages/8978514/Fetch)

## كيف يعمل
- [confirmed] `read` قراءة، `write` تعديل عدا المستخدمين، `policy` إدارة المستخدمين، `test` يشمل Fetch. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/8978504/User)
- [confirmed] `read` الافتراضية تشمل `sensitive` و`reboot`؛ وكل المجموعات تصل لعمليات الملفات. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/8978504/User)
- [confirmed] صلاحيات السكربت تعتمد على طريقة تشغيله من المجدول. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/47579229/Scripting)

## ثغرات وحوادث معروفة
- [confirmed] **CVE-2018-14847 (Winbox):** قراءة قاعدة المستخدمين؛ أُصلحت في 6.40.8 / 6.42.1. [المصدر](https://mikrotik.com/supportsec/winbox-vulnerability)
- [confirmed] **Chimay-Red:** تنفيذ أوامر عبر خدمة WWW؛ أُصلحت في 6.37.5 / 6.38.5. [المصدر](https://mikrotik.com/supportsec/web-service-vulnerability/)
- [confirmed] **Mēris (2021):** أجهزة مخترقة منذ 2018؛ الترقية وحدها لا تكفي. [المصدر](https://mikrotik.com/supportsec/meris-botnet/)
- [confirmed] **CVE-2023-41570 (REST):** 7.1–7.11، أُصلحت في 7.12. [المصدر](https://mikrotik.com/supportsec/cve-2023-41570)
- [confirmed] **CVE-2024-54772 (Winbox):** كشف أسماء المستخدمين؛ إصلاح 6.49.18 و7.18، وتحديث أكتوبر 2026 يذكر حالة مع RADIUS قيد التحقيق. [المصدر](https://mikrotik.com/supportsec/cve-2024-54772/)
- [confirmed] **CVE-2024-54952 (SMB):** DoS؛ يوصى بأحدث v7 stable. [المصدر](https://mikrotik.com/supportsec/cve-2024-54952/)
- [confirmed] **CVE-2025-6443 (VXLAN):** يوصى بـ 7.20+. [المصدر](https://mikrotik.com/supportsec/cve-2025-6443/)

## أوامر مهمة
```routeros
/user group add name=mikro-monitor-api policy=read,api
/user group add name=mikro-push-runtime policy=read,test
/ip service print
/system scheduler print detail
/ip socks print
```
- [confirmed] لا تستخدم `dont-require-permissions=yes` حلاً عاماً. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/47579229/Scripting)

## تقوية الوصول
- [confirmed] حدّث RouterOS، وقيّد خدمات الإدارة بعناوين موثوقة أو VPN، وافحص السكربتات المجهولة. [المصدر](https://mikrotik.com/supportsec/meris-botnet/)
- [assumption] عطّل الخدمات غير المستخدمة، firewall لـ IPv4 وIPv6، وقيّد MAC management وneighbor discovery.
- [assumption] CGNAT لا يبرر إهمال firewall.
- [assumption] عند الاختراق: عزل، حفظ أدلة، إعادة تهيئة نظيفة، تدوير كلمات المرور وtokens.

## مخاطر
- **R-SEC-1 [confirmed]** بدون `check-certificate=yes` يمكن انتحال الخادم.
- **R-SEC-2 [confirmed]** مجموعة `read` الافتراضية فيها صلاحيات خطرة.
- **R-SEC-3 [assumption]** تسرب token يسمح بتقارير مزيفة.
- **R-SEC-4 [confirmed]** بقاء الاختراق بعد الترقية.
- **R-SEC-5 [assumption]** تغيير الشهادات أو الصلاحيات دون اختبار تدريجي يوقف كل الراوترات.
- **R-SEC-6 [confirmed]** كشف مستخدمي الإدارة عبر RADIUS لم يُصلح نهائياً.

## ماذا يعني لـ Mikro
- [assumption] سكربتنا الحالي بصلاحيات `read,write,test` ليس «قراءة فقط»؛ نختبر `read,test` للتشغيل الدوري.
- [assumption] لا نطلب فتح Winbox أو API للعامة أبداً.
- [assumption] تحذيرات أمان في Mikro حسب الإصدار والخدمات المكشوفة فعلياً.
