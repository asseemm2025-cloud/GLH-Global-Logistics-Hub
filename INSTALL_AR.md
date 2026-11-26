# دليل تثبيت ورفع GLH v0.6.1 إلى GitHub وRender

## أولاً: المتطلبات
- Node.js 20+
- PostgreSQL 14+
- حساب GitHub ومستودع جديد أو فرع إصدار منفصل.
- حساب Render.

## ثانياً: الإعداد المحلي
1. فك ضغط `GLH_Hybrid_Implementation_0.6.1.zip`.
2. افتح مجلد المشروع.
3. انسخ `.env.example` إلى `server/.env`.
4. اضبط `DATABASE_URL` لقاعدة PostgreSQL و`JWT_SECRET` عشوائياً بطول 32 حرفاً على الأقل.
5. ثبت الحزم وشغّل Prisma:
   ```bash
   cd server
   npm install
   npx prisma generate
   npx prisma db push
   npm run db:seed
   npm test
   npm start
   ```
6. افتح `http://localhost:4000`.

## ثالثاً: حساب الإدارة
اضبط `SEED_ADMIN_PASSWORD` قبل تنفيذ `npm run db:seed`؛ يجب أن تكون كلمة المرور 12 حرفاً على الأقل. ينشئ seed مستخدم `admin` عند ضبط المتغير. لا تستخدم كلمة مرور تجريبية في الإنتاج، ولا تحفظ `.env` في GitHub.

## رابعاً: رفع GitHub
1. أنشئ مستودعاً خاصاً جديداً باسم مثل `GLH-Hybrid-Implementation`.
2. فك ضغط الحزمة ثم افتح الطرفية في جذر المشروع.
3. نفذ:
   ```bash
   git init
   git add .
   git commit -m "GLH Hybrid Implementation v0.6.1"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPOSITORY.git
   git push -u origin main
   ```
4. تأكد من وجود `.gitignore` ومن عدم رفع أي ملف `.env` أو أسرار أو مفاتيح API.

## خامساً: النشر على Render
1. أنشئ PostgreSQL database على Render.
2. أنشئ Web Service من مستودع GitHub أو استخدم Blueprint عبر `render.yaml`.
3. استخدم Build Command:
   `cd server && npm install && npx prisma generate`
4. استخدم Start Command:
   `cd server && npx prisma db push && node prisma/seed.js && node src/index.js`
5. اضبط المتغيرات:
   - `NODE_ENV=production`
   - `DATABASE_URL` من قاعدة Render
   - `JWT_SECRET` سر عشوائي طويل
   - `JWT_EXPIRES_IN=8h`
   - `SEED_ADMIN_PASSWORD` كلمة مرور قوية
   - `WEB_ORIGIN` نطاق التطبيق عند الحاجة
6. اجعل Health Check Path هو `/api/health`.
7. بعد النشر افتح `/api/health` وتأكد من `database: connected`.
8. سجّل الدخول إلى `/admin-business.html` بحساب الإدارة، ثم أنشئ حساب تاجر من `/merchant.html` لاختبار دورة الاعتماد.

## سادساً: مسارات الواجهات
- `/` واجهة Stage 5 الأصلية.
- `/merchant.html` تسجيل العميل/التاجر وإدارة المتاجر والمنتجات والبوابات.
- `/admin-business.html` إدارة التجار والمنتجات والبوابات وERP والمدفوعات والمزودين والتبرعات والديون.
- `/community.html` وسائل الدفع وحملات التبرع ودليل المزودين وطلبات سداد الدين.

## سابعاً: اختبارات ما قبل الإنتاج
نفذ `npm test` داخل مجلد `server`. بعد توفر PostgreSQL نفذ `npx prisma validate` و`npx prisma db push`، ثم اختبر التسجيل واعتماد التاجر وإضافة منتج ومراجعته، وحاول إضافة منتج بحساب عميل عادي وتأكد من رفضه، واختبر التبرعات والديون والتسويات. لا تعتبر بوابات الدفع أو البنوك متصلة فعلياً دون بيئة Sandbox رسمية.

## ملاحظات مهمة
- `prisma db push` مناسب لبيئة الاختبار الأولية. للإنتاج طويل الأمد أنشئ واعتمد Prisma migrations ثم استخدم `prisma migrate deploy` بعد مراجعة النسخ الاحتياطي.
- تأكد من سياسة النسخ الاحتياطي والاحتفاظ بقاعدة Render وفق الخطة المستخدمة.
- تخزين ملفات المستندات في هذا الإصدار ليس خدمة تخزين سحابي دائمة؛ استخدم Object Storage خاصاً قبل استقبال مستندات قانونية أو حساسة.
- وحدات ERP والبوابات المصغرة هي أساس قابل للتوسعة وليست ERP شاملاً أو نظام استضافة multi-tenant مكتمل.
