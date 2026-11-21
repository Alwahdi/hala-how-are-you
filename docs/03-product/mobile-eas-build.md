---
type: build-record
status: draft
owner: founder
updated: 2026-11-21
related: [README.md, ../04-decisions/D-056-eas-pilot-build.md, mobile-native-pilot-spec.md, mobile-pilot-verification.md, ../../apps/mobile/eas.json, ../../.easignore]
---
# سجل بناء الجوال على EAS

**الملخص:** [confirmed] نجح بناء Android الداخلي على EAS وفق D-056؛ هذا السجل يفصل الإعداد والرفع والبناء عن الاختبار الفعلي على الهاتف.

## إعداد المحاولة
- [confirmed] المصدر `apps/mobile` داخل المستودع؛ ملف [eas.json](../../apps/mobile/eas.json) يحدد `preview` كملف APK مستقل دون خادم تطوير، والتوقيع المُدار في EAS.
- [confirmed] عُينت قائمة سماح في [.easignore](../../.easignore) لمصدر الجوال وموارده وملفات الاعتماديات والفحوص فقط؛ الملفات البيئية وبيانات التشغيل وسجل Git والمجلدات الأصلية المولدة خارجها.
- [confirmed] استبعاد Android/iOS المولدين يجعل EAS يولدهما من إعدادات التطبيق والإضافات، بما فيها SQLCipher وتحقق هوية TLS؛ [مرجع التوليد على EAS](https://docs.expo.dev/build-reference/android-builds/).
- [confirmed] حساب Expo مسجل بالفعل في أداة البناء؛ لا حاجة لإرسال كلمة مرور أو رمز وصول في المحادثة.

## نتائج المحاولة
- [confirmed] أُنشئ [مشروع EAS](https://expo.dev/accounts/syndeocare/projects/mikro-local-pilot) وربط بمعرفه في إعداد التطبيق، مع توقيع Android مُدار دون تنزيل المفتاح.
- [confirmed] نجحت فحوص lint دون تحذيرات وTypeScript والاختبارات الـ55 بتاريخ 2026-11-21. صُححت ملاحظات lint البسيطة دون تغيير مهام الراوتر أو صيغة المخرجات.
- [confirmed] كشف الفحص الأول استبعاد ملفات التطبيق بسبب مطابقة المجلدات في أداة النسخ على Windows؛ صححت القواعد، ثم نجح فحص الأرشيف الثاني: 43 ملفًا، 1071938 بايت، مطابقة للمصدر ولا ملفات خارج قائمة السماح أو أسرار تشغيل أو Git أو مجلدات مولدة. الأرقام من فحص الملفات المحلي لهذه المحاولة، وليست قياس أداء.
- [confirmed] نجح [طلب البناء الأول](https://expo.dev/accounts/syndeocare/projects/mikro-local-pilot/builds/e5ee2960-ad06-4935-982d-555c0b7b4120) بحالة `FINISHED` بتاريخ 2026-11-21. ملف [APK الناتج](https://expo.dev/artifacts/eas/08CfwoHY4v2fGPW7NKlW-JXl25GscJlVmAkx1EwFP8I.apk) متاح؛ فحوص الملف أدناه منفصلة عن تشغيله والقبول على الهاتف.
- [confirmed] نُزّل الملف بحجم 101702703 بايت، ونجح `apksigner verify` بتوقيع v2 وموقّع واحد. أثبت `aapt` المعرف `dev.mikro.localpilot`، الإصدار `0.1.0` ورقم البناء `1`، والحد الأدنى API 24، ووجود ARM64 وARMv7 وx86 وx86_64؛ مصادر هذه القيم فحص الملف الناتج محليًا.
- [confirmed] بصمة SHA-256 للملف: `32eb5e4abc3e449e15a9310c1aa8df9f42382955ad91b6312638278e7b3fe6e3`؛ هذه بصمة APK وليست كلمة مرور أو مفتاح توقيع.
- [confirmed] ثُبت APK بنجاح على محاكي Android API 30 بمعمارية x86 وشُغلت `MainActivity` تشغيلًا باردًا؛ ظهرت الواجهة العربية وفتح مسار الشبكات المحفوظة بعد اجتياز حضور وحدة TCP وتهيئة مفتاح النظام وSQLCipher وقراءة قاعدة جديدة فارغة. لم تدخل بيانات راوتر ولم يختبر اتصال RouterOS أو إصدار حقيقي من هذا الفحص.
- [confirmed] بعد إيقاف عملية التطبيق وإعادة تشغيله باردًا، نجح فتح قاعدة التخزين مجددًا وعرض الشبكات المحفوظة الفارغة دون خطأ. هذا يفحص استعادة مفتاح النظام وفتح SQLCipher عبر إعادة التشغيل؛ لا يثبت حفظ كرت حقيقي أو إعادة طباعته.

## حدود القبول
- [confirmed] مرجع اختبار الراوتر والطباعة والهاتف هو [بروتوكول القبول](mobile-pilot-verification.md#بروتوكول-القبول-على-الأجهزة)، ولا يغلق نجاح EAS وحده هذه الاختبارات.
- [confirmed] توقيع iPhone لجهاز فعلي ما زال يتطلب حساب Apple المناسب؛ لم يطلب نشر متاجر أو دفع اشتراك ضمن هذه المحاولة.

## مراجع التنفيذ
- [confirmed] [إعداد APK](https://docs.expo.dev/build-reference/apk/)، [أرشيف الرفع](https://docs.expo.dev/build-reference/project-upload/)، [فحص الاستبعاد](https://docs.expo.dev/build-reference/easignore/)، و[البناء داخل المستودع](https://docs.expo.dev/build-reference/build-with-monorepos/) هي المراجع الرسمية المستخدمة بتاريخ هذا السجل.
