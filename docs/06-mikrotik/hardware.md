---
type: reference
status: draft
owner: founder
updated: 2026-11-11
related: [README.md]
---

# العتاد الشائع وحدود الذاكرة والتخزين

[assumption] تصنيف عملي، وليس إحصاء انتشار. نعتمد product code لا الاسم التجاري.
[confirmed] الذاكرة والتخزين موردان منفصلان: hAP ac² فيه 128MB RAM لكن 16MB flash. [المصدر](https://mikrotik.com/product/hap_ac2)

## الموديلات
| الموديل | RAM / تخزين | ملاحظة |
|---|---|---|
| hAP lite RB941-2nD | [confirmed] 32MB / 16MB، SMIPS [المصدر](https://mikrotik.com/product/RB941-2nD) | لا User Manager (SMIPS)، أقل من توصية v7 |
| hAP RB951Ui-2nD | [confirmed] 64MB / 16MB [المصدر](https://mikrotik.com/product/RB951Ui-2nD) | Hotspot محدود |
| RB951Ui-2HnD | [confirmed] 128MB / 128MB [المصدر](https://mikrotik.com/products/compare?compare=L41G-2axD%2CRB951Ui-2HnD%2CRB952Ui-5ac2nD) | لا تخلطه مع 2nD |
| hEX RB750Gr3 | [confirmed] 256MB / 16MB [المصدر](https://mikrotik.com/product/RB750Gr3) | flash ضيق |
| hAP ax lite | [confirmed] 256MB / 128MB، v7 [المصدر](https://mikrotik.com/product/hap_ax_lite) | لا تخلطه مع hAP lite |
| hAP ax² | [confirmed] 1GB، ARM64 [المصدر](https://mikrotik.com/product/hap_ax2) | فئة حديثة |
| RB4011iGS+RM | [confirmed] 1GB / 512MB [المصدر](https://mikrotik.com/product/rb4011igs_rm) | تجميع |
| CCR2004-16G-2S+ | [confirmed] 4GB / 128MB [المصدر](https://mikrotik.com/product/ccr2004_16g_2splus) | core |
| cAP ac | [confirmed] 128MB / 16MB [المصدر](https://mikrotik.com/product/cap_ac) | AP داخلي |
| SXT Lite5 | [confirmed] 64MB / 128MB [المصدر](https://mikrotik.com/product/RBSXT5nDr2) | طرف خارجي |
| LHG 5 | [confirmed] 64MB / 16MB [المصدر](https://mikrotik.com/product/RBLHG-5nD) | طرف اتجاهي |

## الفرق بين v6 وv7
- [confirmed] v7 يعمل بـ 32MB افتراضياً، لكن يوصى بـ 64MB+. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/19136707/Software+Specifications) — [الترقية](https://help.mikrotik.com/docs/spaces/ROS/pages/115736772/Upgrading+to+v7)
- [confirmed] أجهزة MIPS-LE القديمة لا تدعم v7. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/19136707/Software+Specifications)
- [confirmed] تقسيم حزم wireless/WiFi تغيّر منذ v7.13. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/40992872/Packages)

## أوامر مهمة
```routeros
/system resource print
/system routerboard print
/system package print
/file print detail
```

## مشاكل شائعة وحلولها
- [confirmed] الملفات خارج مجلد `flash` (إن وجد) في RAM وتضيع بعد reboot. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2555971/Files)
- [confirmed] أجهزة NAND متعددة الأنوية (RB4011، CCR) تكتب متأخراً؛ انقطاع الكهرباء قد يفقد تعديلات. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/2555971/Files)
- [confirmed] تخزين خارجي لقواعد User Manager الكبيرة مع eject قبل الفصل. [المصدر](https://help.mikrotik.com/docs/spaces/ROS/pages/91193346/Disks)

## مخاطر
- **R-hardware-1 [confirmed]** ترقية hAP lite (32MB) إلى v7 أقل من التوصية.
- **R-hardware-2 [assumption]** كتابة ملفات أو logs كل 30 ثانية تملأ flash 16MB.
- **R-hardware-3 [assumption]** الاسم المختصر لا يحدد الذاكرة؛ نجمع الموارد الفعلية.

## ماذا يعني لـ Mikro
- [assumption] تصنيف الراوتر (محدود/عادي) من الموارد الفعلية في التقرير.
- [assumption] `output=none` يبقى، ولا نكتب أي ملف في كل دورة.
