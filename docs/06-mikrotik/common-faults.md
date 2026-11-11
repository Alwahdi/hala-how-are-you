---
type: reference
status: draft
owner: founder
updated: 2026-11-11
related: [README.md, troubleshooting.md, hotspot.md, pppoe.md, queues.md, security.md, risks-register.md]
---
# أكثر أعطال MikroTik شيوعاً وحلولها

**الملخص:** أعطال متكررة في المنتدى الرسمي وReddit والمقالات، لكل عطل: العرض، الأسباب المرجحة، أوامر التشخيص، الحل، وما يمكن لـ Mikro كشفه.
الترتيب حسب صلته بأصحاب شبكات Hotspot/PPPoE، لا حسب إحصاء مثبت. [assumption]
مجموعات فيسبوك المغلقة غير متاحة للبحث؛ تجارب المؤسس مطلوبة لتأكيد الأولوية. [confirmed]
لا تُطبّق أي أمر تغيير قبل `/export file=backup` ونسخة `/system backup save`.

## F-01 «الكرت خلص بسرعة» (أكثر شكوى الزبائن)
- **الأسباب:** الوقت يُحسب أثناء الاتصال فقط مع `limit-uptime` لكن الزبون توقع مدة تقويمية (أو العكس)؛ `keepalive-timeout`/`idle-timeout` يُبقي الجلسة نشطة بعد انصراف الجهاز فيستمر احتساب الوقت؛ حد الحجم `limit-bytes-total` استُهلك بتحديثات تلقائية أو فيديو في الخلفية؛ مشاركة الكرت بين أجهزة (`shared-users` > 1)؛ ساعة الراوتر خاطئة بعد انقطاع الكهرباء دون NTP فتنتهي صلاحية سكربتات المدة التقويمية. [confirmed] [منتدى](https://forum.mikrotik.com/t/hotspot-users-expiring-before-their-allocated-time-routeros-v7-17-2/182046)
- **التشخيص:** `/ip hotspot user print detail where name=X` (uptime، bytes-in/out، limit-*)؛ `/ip hotspot active print`؛ `/ip hotspot cookie print`؛ `/system clock print`؛ `/log print where topics~"hotspot"`.
- **الحل:** وضّح نوع الباقة على الكرت (وقت اتصال أم مدة أيام أم حجم)؛ اضبط idle-timeout معقولاً (مثلاً 5m) وkeepalive 2m؛ `shared-users=1`؛ فعّل NTP client (`/system ntp client`) وفي v6 تحقق من أن الساعة لا تعود للصفر.
- **Mikro:** تقرير الكرت (الجلسات، الأجهزة MAC، الحجم) هو الإثبات للزبون — مطابق لمساعد الرد في [D-024](../04-decisions/D-024-customer-reply-assistant-demo.md).

## F-02 صفحة دخول Hotspot لا تظهر
- **الأسباب:** إعداد DNS (الراوتر لا يسمح بطلبات DNS البعيدة `allow-remote-requests`)؛ الجهاز يستخدم DNS خاصاً أو DoH/Private DNS في أندرويد؛ المواقع HTTPS لا يمكن اعتراضها (طبيعي)؛ إعدادات ARP غير متسقة بعد الترقية لـ v7؛ walled-garden أو `login-by` خاطئ؛ عنوان Hotspot DNS name بدون شهادة. [confirmed] [منتدى](https://forum.mikrotik.com/t/hotspot-not-redirecting-to-login-page/166115)
- **التشخيص:** `/ip hotspot print`، `/ip dns print`، `/ip hotspot host print` (هل الجهاز ظاهر؟)، فتح `http://` لموقع غير مشفر.
- **الحل:** `allow-remote-requests=yes` مع منع DNS من WAN بالجدار الناري؛ استخدام `dns-name` وعنوان HTTP؛ مراجعة arp وadd-arp في DHCP.
- **Mikro:** فحص تلقائي للإعدادات الثلاثة وشرح مبسط.

## F-03 الإنترنت بطيء عند الجميع
- **الأسباب:** CPU 100%؛ خط المزود نفسه؛ queue أعلى من سرعة الخط فلا عدل؛ مستخدم واحد يستهلك (تحميل/تورنت)؛ تداخل لاسلكي.
- **التشخيص:** `/system resource print`، `/tool profile`، `/tool torch interface=ether1`، `/queue simple print stats`، `/tool bandwidth-test` أو speedtest من الراوتر (v7).
- **الحل:** queue رئيسية أقل قليلاً من سرعة الخط الفعلية مع PCQ للزبائن [queues](queues.md)؛ تحديد المستخدم المستهلك.
- **Mikro:** عرض «أكثر المستخدمين استهلاكاً الآن» وCPU في تقرير الحالة كل 30 ثانية ([D-028](../04-decisions/D-028-router-push-status.md)).

## F-04 CPU مرتفع
- **الأسباب حسب `/tool profile`:** `dns` → DNS مفتوح للإنترنت ويُستغل في هجمات؛ `firewall` → قواعد كثيرة أو layer7 أو هجوم؛ `queuing` → queues كثيرة بلا FastTrack؛ `management` → Winbox/API مكشوف أو سكربت يدور؛ `wireless`. [confirmed] [RadiusNest](https://radiusnest.net/mikrotik-high-cpu.html)
- **الحل:** حظر DNS وWinbox وAPI من WAN؛ تقليل layer7؛ قواعد مرتبة (established/related أولاً)؛ ملاحظة أن FastTrack يتجاوز الـ queues فيكسر تحديد السرعة.
- **Mikro:** تنبيه عند CPU مرتفع مستمر مع السبب الأرجح.

## F-05 انقطاع PPPoE أو «double login»
- **الأسباب:** جلسة قديمة بقيت بعد انقطاع كهرباء الزبون؛ keepalive غير فعال؛ MTU/MSS (صفحات تفتح جزئياً)؛ أسماء مستخدمين مكررة؛ RADIUS بطيء. [confirmed] [منتدى](https://forum.mikrotik.com/t/pppoe-keepalive-timeout-not-working/131126)
- **التشخيص:** `/ppp active print`، `/log print where topics~"pppoe"`، `/interface pppoe-server server print`.
- **الحل:** `keepalive-timeout` 10–30، `change-tcp-mss=yes`، `one-session-per-host`، `max-mtu/max-mru=1480` عند الحاجة، وفصل الجلسة القديمة يدوياً.
- **Mikro:** زر «فصل الجلسة العالقة» (يحتاج اتصال أوامر لاحقاً عبر VPS، [D-027](../04-decisions/D-027-router-connection-spike.md)).

## F-06 مشاكل بعد الترقية من v6 إلى v7
- **الأعراض:** queues لا تعمل، Hotspot لا يعيد التوجيه، ضياع إعدادات OSPF/BGP/routing filters (أعيد تصميمها في v7)، wireless تغيّر لحزمة wifi في بعض الأجهزة، User Manager v7 مختلف كلياً عن v6 ولا تنتقل بياناته تلقائياً. [confirmed] [منتدى](https://forum.mikrotik.com/t/simple-queue-no-longer-works-after-upgrade-from-v6-to-v7/175101)، [Reddit](https://www.reddit.com/r/mikrotik/comments/zqpg1i/losing_routing_config_when_upgrading_rosv6_to_v7/)
- **الحل:** backup + export قبل الترقية؛ الترقية لآخر 6.49.x أولاً؛ تجربة على جهاز احتياطي؛ إمكانية الرجوع عبر `/system package downgrade` أو Netinstall.
- **Mikro:** لا يرقّي تلقائياً أبداً؛ يحذّر قبل الترقية ويحفظ export. [confirmed] متسق مع [سجل المخاطر](risks-register.md).

## F-07 الراوتر مخترق
- **العلامات:** مستخدمين غريبين في `/user print`، سكربتات أو scheduler مجهول، `/ip socks` مفعّل، proxy مفعّل، DNS static غريب، CPU مرتفع، قواعد NAT غريبة.
- **السبب التاريخي:** ثغرة Winbox CVE-2018-14847 في الإصدارات القديمة، واستُغلت أجهزة غير محدّثة في شبكة Meris وغيرها. [confirmed] [MikroTik](https://mikrotik.com/supportsec/meris-botnet)، [Cloudflare](https://blog.cloudflare.com/meris-botnet/)
- **الحل:** تحديث، تغيير كل كلمات المرور، حذف المستخدمين والسكربتات الغريبة (أو Netinstall عند الشك)، حصر الإدارة بشبكة موثوقة، تعطيل الخدمات غير المستخدمة (`/ip service`).
- **Mikro:** فحص أمني للقراءة فقط: socks/proxy/خدمات مكشوفة/إصدار قديم. لا يُرسل أي كلمة مرور.

## F-08 الراوتر يعيد التشغيل أو يعلق
- **الأسباب:** مزود طاقة ضعيف أو حرارة؛ امتلاء الذاكرة أو مساحة التخزين (ملفات logs/ backups)؛ watchdog.
- **التشخيص:** `/system resource print` (free-hdd، free-memory)، `/system health print`، `/log print where topics~"critical"`، `/file print`.
- **Mikro:** مؤشرات الحرارة والذاكرة والمساحة موجودة في تقرير الحالة الحالي.

## F-09 نقاط الوصول (AP) وضعف التغطية
- **الأسباب:** قناة مزدحمة، قوة إرسال عالية تسبب تداخلاً، عدد زبائن كبير على AP واحد، bridge loop عند ربط AP بشكل خاطئ.
- **التشخيص:** `/interface wireless registration-table print`، `/interface wireless scan`، فحص loop بـ RSTP.
- **Mikro:** عدد الأجهزة لكل AP لاحقاً (يحتاج مصدر بيانات DHCP/registration).

## F-10 الإنترنت ينقطع كلياً
- **الأسباب:** خط المزود، انتهاء DHCP client من المزود، default route مفقود، تعدد الخطوط بلا check-gateway.
- **التشخيص:** `/ip route print`، `ping 8.8.8.8`، `/ip dhcp-client print`، `/tool netwatch`.
- **Mikro:** إذا انقطع تقرير الراوتر أكثر من 90 ثانية يظهر «غير متصل» — لا يميز بين انقطاع الكهرباء والإنترنت، وهذا قيد يجب أن يُذكر للمستخدم. [confirmed]

## ما يحتاج تأكيداً من المؤسس
- [hypothesis] ترتيب الأعطال حسب تكرارها في شبكاتك؛ أي أعطال تتكرر عندك ولم تُذكر هنا.
- تجربة F-01 وF-02 وF-05 عملياً على راوتر v6 وv7.
