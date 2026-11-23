# تطبيق GLH لنظام Android

هذا المجلد يشرح بناء غلاف Android باستخدام Capacitor فوق واجهة GLH الحالية. لا يتضمن هذا الإصدار ملف APK جاهزاً؛ يجب إنشاء مشروع Android وتشغيل Gradle باستخدام Android Studio/Android SDK بعد تثبيت الاعتماديات.

## المتطلبات
- Node.js 20 أو أحدث.
- Android Studio حديث مع Android SDK وJDK المتوافق معه.
- اتصال إنترنت لتنزيل حزم Capacitor ومكونات Gradle أول مرة.

## إعداد المشروع
من جذر المشروع:

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

## قبل ربط الخادم
الإعداد الافتراضي يضمّن واجهة الويب من مجلد `web`. هذا وحده لا يشغّل API أو PostgreSQL. يجب تشغيل خادم GLH وقاعدة البيانات أو نشرهما.

## ربط النسخة المنشورة
بعد نشر GLH والحصول على عنوان HTTPS النهائي، أضف عنوان الواجهة المنشورة إلى قسم `server.url` في `capacitor.config.json`، مثال توضيحي فقط:

```json
"server": {
  "url": "https://YOUR-GLH-DOMAIN",
  "androidScheme": "https",
  "cleartext": false
}
```

استبدل العنوان بعنوانك الحقيقي؛ لا تستخدم عنوان المثال. ثم نفّذ:

```bash
npx cap sync android
npx cap open android
```

من Android Studio اختر Build > Build Bundle(s) / APK(s) > Build APK(s). اختبر تسجيل الدخول والتنقل والطلبات والرفع والاتصال بالخادم على جهاز فعلي.

## ملاحظات أمان
- لا تضع كلمات مرور أو مفاتيح API سرية داخل تطبيق الهاتف.
- يجب أن يكون الخادم عبر HTTPS.
- إعدادات المصادقة والصلاحيات تظل مفروضة من API، لا من إخفاء عناصر الواجهة فقط.
- هذا الغلاف لا يثبت أن تكاملات الدفع أو الشحن الخارجية فعالة؛ كل تكامل يحتاج مفاتيح وموافقات وبيئة اختبار.
