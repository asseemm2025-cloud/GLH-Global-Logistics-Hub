# دليل تثبيت وتشغيل GLH v0.6.37

## المتطلبات
- Node.js بإصدار متوافق مع المشروع، npm، PostgreSQL.
- أو Docker وDocker Compose.

## التشغيل المحلي
1. فك ضغط الحزمة.
2. انسخ `.env.example` إلى `.env` داخل مجلد المشروع وفق بنية المشروع.
3. اضبط `DATABASE_URL` و`JWT_SECRET` وكلمة مرور مسؤول التهيئة. لا ترفع ملف `.env` إلى GitHub.
4. من مجلد `server` نفذ:
   - `npm install`
   - `npx prisma validate`
   - `npx prisma generate`
   - `npx prisma db push`
   - `node prisma/seed.js`
   - `npm test`
   - `npm start`
5. افتح `http://localhost:4000/admin-business.html` وسجل الدخول بحساب إداري مخول.

## Docker
راجع `docker-compose.yml` وملف `.env.example`، ثم نفذ `docker compose up --build -d`.

## ملاحظة
نفذ نسخة احتياطية قبل أي تحديث لقاعدة بيانات إنتاجية. لا تستخدم بيانات اعتماد افتراضية أو أسراراً داخل المستودع.
