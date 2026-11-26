# تشغيل واختبار GLH محلياً – v0.6.11

## لماذا لا تعمل الروابط عند فتح community.html من الهاتف؟
ظهور عنوان مثل `content://0@media/community.html` يعني أن Android فتح ملف HTML مباشرة من مدير الملفات. هذه ليست جلسة تشغيل للمنصة عبر خادم ويب. صفحات GLH تستخدم مسارات مثل `/glh-api.js` و`/api/...`؛ وهذه المسارات لا تعمل من عنوان `content://`، لذلك قد تظهر صفحة غير موجودة أو أخطاء اتصال.

## طريقة الاختبار المدعومة
يلزم تشغيل خادم GLH وقاعدة PostgreSQL. لا تفتح `web/index.html` أو `web/community.html` مباشرة من مدير الملفات.

### Windows
1. ثبّت Docker Desktop وشغّله.
2. فك ضغط المشروع بالكامل إلى مجلد عادي.
3. افتح المجلد وشغّل `scripts/start-local.bat`.
4. انتظر حتى تصبح الخدمة جاهزة، ثم افتح `http://localhost:4000` في المتصفح على نفس الكمبيوتر.
5. افحص `http://localhost:4000/api/ready` ويجب أن يعرض `status: ready` و`database: connected`.

### macOS / Linux
من مجلد المشروع نفّذ `sh scripts/start-local.sh`، ثم افتح `http://localhost:4000`.

### إيقاف التشغيل
شغّل `scripts/stop-local.bat` في Windows أو `sh scripts/stop-local.sh` في macOS/Linux. لا تستخدم `docker compose down -v` إلا إذا أردت حذف بيانات قاعدة البيانات المحلية نهائياً.

## روابط الاختبار بعد تشغيل الخادم
- `http://localhost:4000/` الواجهة الرئيسية.
- `http://localhost:4000/community.html` الخدمات المالية والمجتمعية.
- `http://localhost:4000/marketplace.html` السوق والخدمات.
- `http://localhost:4000/merchant.html` بوابة العميل والتاجر.
- `http://localhost:4000/admin-business.html` إدارة الأعمال.
- `http://localhost:4000/admin-access.html` الهيكل والصلاحيات.

## ملاحظات
- يمكن فتح الموقع من هاتف آخر على الشبكة نفسها باستخدام عنوان IP المحلي للكمبيوتر بدلاً من `localhost`، بعد السماح بالمنفذ 4000 في جدار الحماية. `localhost` على الهاتف يشير إلى الهاتف نفسه وليس الكمبيوتر.
- بيانات الدخول الإدارية المحلية التجريبية تُضبط عبر `SEED_ADMIN_PASSWORD` في `docker-compose.yml`. غيّرها قبل الاستخدام ولا تستخدم كلمة مرور افتراضية في بيئة عامة.
- نجاح `/api/ready` يثبت اتصال PostgreSQL فقط، ولا يثبت اكتمال كل الوظائف التجارية. نفّذ اختبارات كل مسار بعد الدخول.
