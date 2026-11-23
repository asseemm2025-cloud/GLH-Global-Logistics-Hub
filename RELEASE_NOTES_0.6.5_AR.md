# GLH v0.6.5 — نسخة تجريبية قبل النشر

## ما تغير
- فصل فحص حياة التطبيق `/api/health` عن فحص جاهزية قاعدة البيانات `/api/ready`.
- أصبح Render يستخدم `/api/ready` حتى لا يعتبر التطبيق جاهزاً قبل نجاح استعلام PostgreSQL.
- إضافة اتصال صريح بقاعدة البيانات عند تشغيل الخادم وإغلاق منظم عند إيقاف الخدمة.
- إضافة `server/scripts/check-db.js` وأمر `npm run db:check` لفحص الاتصال وعدد جداول public.
- إضافة `npm run db:setup` لتهيئة المخطط الحالي باستخدام Prisma db push ثم تشغيل seed.
- إضافة مؤشر فحص PostgreSQL داخل ملخص الإدارة.
- تحديث رقم الإصدار إلى 0.6.5.

## تشغيل الاختبار محلياً
1. أنشئ PostgreSQL محلياً أو شغّل `docker compose up -d` من جذر المشروع.
2. انسخ `server/.env.example` إلى `server/.env` واضبط DATABASE_URL وJWT_SECRET (32 حرفاً على الأقل).
3. من مجلد server نفّذ: `npm install`.
4. نفّذ: `npx prisma validate` ثم `npx prisma generate`.
5. نفّذ: `npm run db:setup` ثم `npm run db:check`.
6. نفّذ: `npm test` ثم `npm start`.
7. افتح `/api/health` ثم `/api/ready`، ويجب أن يعيد الأخير `status: ready`.

## حدود هذه النسخة
- هذه نسخة تجريبية محلية قبل Render وليست نشرًا عاماً.
- لم يتم في بيئة البناء الحالية تثبيت npm dependencies أو تشغيل PostgreSQL فعلياً؛ لذلك لم يُدّعَ نجاح اتصال قاعدة البيانات أو اختبارات E2E.
- لا توجد بعد ملفات Prisma migrations معتمدة؛ `db:setup` يستخدم `prisma db push` للتهيئة التجريبية فقط. قبل الإنتاج يجب توليد migration baseline ومراجعتها واختبارها ثم اعتماد `prisma migrate deploy`.
- يجب عدم استخدام بيانات حقيقية أو أموال فعلية في الاختبار.
