---
type: reference
status: draft
owner: founder
updated: 2026-11-11
related: [README.md, common-faults.md, troubleshooting.md, risks-register.md]
---
# تغطية مناهج MTCNA وMTCRE وMTCINE مقابل احتياج Mikro

**الملخص:** مقارنة موضوعات الشهادات الثلاث الرسمية بما وثّقناه، مع أولوية كل موضوع لشبكات Hotspot/PPPoE الصغيرة والمتوسطة.
القراءة لا تعادل الشهادة؛ الخبرة العملية تأتي من مختبر على راوتر v6 وv7 حقيقي. [confirmed]
المصادر: [MTCNA outline](https://i.mt.lv/cdn/training%5Fpdf/mtcna%5Foutline%5F2019181161836.pdf)، [MTCRE outline](https://i.mt.lv/cdn/training_pdf/mtcre_outline_2019181161836.pdf)، [MTCINE outline](https://www.mikrotik-trainings.com/home/downloadPDF/MTCINE_Outline.pdf).

## MTCNA (الأساس) — أولوية عالية لـ Mikro
| الموضوع | ما يهم Mikro | التوثيق |
|---|---|---|
| RouterOS، Winbox، الترقية، النسخ الاحتياطي، RouterBOOT، Netinstall | استعادة الراوتر بعد عطل أو ترقية فاشلة؛ حفظ export قبل أي تغيير | [v6-v7](v6-v7-differences.md)، [العتاد](hardware.md) |
| DHCP، ARP (reply-only)، Bridge | أكثر أسباب عدم ظهور صفحة دخول Hotspot | [الأعطال](common-faults.md) |
| Static routing، default route، distance | انقطاع الإنترنت عند تعدد خطوط المزود | [الأعطال](common-faults.md) |
| Wireless (wlan/wifi في v7)، CAPsMAN | نقاط الوصول الموزعة وضعف الإشارة | [doc-index](doc-index.md) |
| Firewall، NAT/masquerade، connection tracking، FastTrack | الأمان، استهلاك CPU، تعارض FastTrack مع الـ queues | [الأمن](security.md)، [queues](queues.md) |
| Simple queues، PCQ، burst | تقسيم السرعة بعدل بين الزبائن | [queues](queues.md) |
| PPP/PPPoE، أنفاق أساسية | خدمة PPPoE والوصول البعيد | [PPPoE](pppoe.md)، [الوصول البعيد](remote-access.md) |
| Tools: ping، traceroute، torch، netwatch، log، graphing، SNMP | أدوات التشخيص التي يحاكيها Mikro | [التشخيص](troubleshooting.md) |

## MTCRE (التوجيه) — أولوية متوسطة
| الموضوع | ما يهم Mikro |
|---|---|
| Static متقدم: ECMP، check-gateway، recursive next-hop، routing marks/policy | توزيع وموازنة عدة خطوط إنترنت (load balance/failover) شائع في الشبكات الأكبر [assumption] |
| VPN/أنفاق: IPIP، EoIP، PPTP، SSTP، L2TP | ربط مواقع الشبكة، والربط البعيد عبر راوتر وسيط |
| VLAN، QinQ، switch chip | فصل شبكة الإدارة عن الزبائن |
| OSPF (areas، LSA، DR/BDR) | نادر في شبكات Hotspot الصغيرة؛ مهم للموزعين والمشغلين الأكبر [assumption] |

## MTCINE (الربط بين الشبكات) — أولوية منخفضة الآن
BGP (iBGP/eBGP، multihop، filters، best path)، MPLS (LDP، VPLS، L3VPN، TE). هذه لشبكات المزودين (ISP) لا لصاحب شبكة Hotspot عادي. [assumption] لا تدخل في نطاق Mikro قبل التوسع لشريحة المشغلين، فلم تُدرس بعمق.

## الفجوات المتبقية
- [hypothesis] لم يُتحقق ميدانياً من نسبة الشبكات المستخدمة لتعدد الخطوط أو VLAN؛ يُسأل المؤسس وأصحاب الشبكات.
- Wireless/CAPsMAN في v7 (حزمة wifi الجديدة) لم يُوثّق بعمق بعد.
- لا مختبر عملي بعد: الخطوة الصحيحة تجربة كل عطل في [الأعطال](common-faults.md) على راوترات المؤسس.
