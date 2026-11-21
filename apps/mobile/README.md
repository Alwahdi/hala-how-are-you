---
type: developer-guide
status: draft
owner: founder
updated: 2026-11-21
related: [../../docs/03-product/mobile-native-pilot-spec.md, ../../docs/03-product/mobile-pilot-verification.md, ../../docs/03-product/mobile-eas-build.md]
---
# تجربة Mikro المحلية

**الملخص:** [confirmed] تطبيق Expo مستقل داخل المستودع لتنفيذ [النطاق المعتمد](../../docs/03-product/mobile-native-pilot-spec.md)؛ [النتائج والمتبقي](../../docs/03-product/mobile-pilot-verification.md) هما مرجع الجاهزية.

## التشغيل للمطور
[confirmed] الأوامر التالية من هذا المجلد، مع Node وبيئة Android أو Apple المطلوبة؛ الملف `package-lock.json` يثبت نسخ الاعتماديات.

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run web
```

- [confirmed] الويب للتوضيح ومراجعة الواجهة فقط. الربط وSQLCipher والطباعة الأصلية يحتاجون تطبيقًا أصليًا خاصًا وليس Expo Go؛ راجع [شرح Expo](https://docs.expo.dev/develop/development-builds/introduction/).
- [confirmed] لا تدخل اعتمادًا حقيقيًا في التوضيح، ولا في ملفات أو أوامر أو المحادثة؛ استخدم نموذج التطبيق الأصلي بعد نجاح بنائه.

## Android
[confirmed] مسار البناء الحالي هو EAS وفق [سجل البناء](../../docs/03-product/mobile-eas-build.md). من هذا المجلد، افحص أرشيفًا جديدًا قبل أول رفع، ثم اطلب نسخة `preview` المستقلة؛ لا تحتاج أوامر البناء هذه Android Studio محليًا:

```powershell
npx eas-cli@latest build:inspect --platform android --profile preview --stage archive --output artifacts/eas-archive
npx eas-cli@latest build --platform android --profile preview
```

[confirmed] يستخدم الرفع قائمة السماح في ملف `.easignore` بجذر المستودع؛ فحص TypeScript وlint واختبارات البروتوكول تعمل أيضًا في خطوة EAS بعد تثبيت الاعتماديات. إصدار `development` يحتاج خادم تطوير، أما `preview` فيضم التطبيق للاستخدام المستقل.

### البناء المحلي السابق
[assumption] بعد إعداد Android SDK وJDK المتوافقين، يولد الأمر الأول المجلد الأصلي ويطبق إعدادات التشفير وتحقق TLS، ثم يبني الثاني ويشغل التطبيق على الجهاز المحدد:

```powershell
npm run prebuild:android
npm run android
```

- [confirmed] مجلد `android` ناتج توليد وغير محفوظ في Git؛ لا يصلح تعديل ناتجه وحده كمصدر دائم للإعدادات.
- [confirmed] الإضافة `plugins/with-verified-tcp.cjs` مرتبطة بإصدار TCP المثبت؛ تتوقف إذا تغير المصدر المتوقع. لا تحذف تحقق الشهادة أو تتجاوز الحماية لحل فشل البناء.
- [confirmed] أمر `npm run android` يشغل نسخة تطوير؛ حالة طلبات EAS وملفاتها في سجل البناء المرتبط أعلاه، دون وعد بملف تثبيت قبل نجاحه.

## iPhone
- [confirmed] يوفر EAS بيئة Apple للبناء دون Mac محلي، لكن تثبيت نسخة على iPhone فعلي يحتاج حساب Apple Developer وتوقيعًا مناسبًا؛ [متطلبات البناء](https://docs.expo.dev/build/setup/). لا تكفي معاينة المتصفح لاختبار TCP والطباعة على iPhone.
- [confirmed] المصدر والإعدادات مشتركان، لكن نجاح Android لا يثبت نجاح iOS؛ راجع حالة الاختبار في المرجع أعلاه.

## البيانات والمخرجات
- [confirmed] نسخة التوضيح في الذاكرة فقط، منفصلة عن قاعدة الهاتف. بيانات دخول الراوتر تبقى في الجلسة ولا تحفظ معه؛ الأرشيف الجديد يستخدم SQLCipher ومفتاح SecureStore.
- [confirmed] PDF أو الورقة يعرضان بيانات الكرت باختيار المالك. ملفات PDF المؤقتة تحذف بعد انتهاء المشاركة، ولا يوجد رفع تلقائي.
- [confirmed] فحص البروتوكول يستخدم خادم اختبار محليًا؛ لا تشغّل اختبارات على راوتر إنتاج ولا تحفظ ملفات تتضمن بيانات عملاء.
