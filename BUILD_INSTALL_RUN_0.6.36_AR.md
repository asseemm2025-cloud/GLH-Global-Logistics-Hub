# دليل البناء والتثبيت والتشغيل — GLH v0.6.36

## 1) مكونات الحزمة
- `web/`: واجهة المنصة والعميل والتاجر والإدارة.
- `web/admin-operations.html`: مدخل الوحدات التشغيلية المتقدمة.
- `web/admin-business.html`: واجهة الإدارة المركزية، وبداخلها واجهتا إدارة المانحين والمصنعين والوظائف الفرعية.
- `server/`: خادم Node.js/Express وواجهات API.
- `server/prisma/schema.prisma`: مخطط PostgreSQL.
- `server/prisma/seed.js`: تهيئة مدير النظام والصلاحيات الافتراضية.
- `Dockerfile` و`docker-compose.yml`: بناء وتشغيل محلي باستخدام Docker.
- `render.yaml`: تعريف خدمة Render وقاعدة PostgreSQL.

## 2) المتطلبات
- Node.js 20 أو أحدث وnpm.
- PostgreSQL 14 أو أحدث، أو Docker Desktop مع Docker Compose.
- متصفح حديث.

## 3) تشغيل محلي باستخدام Docker (المسار الأسهل)
1. فك ضغط الحزمة.
2. انسخ `.env.example` إلى `.env` في جذر المشروع.
3. غيّر `POSTGRES_PASSWORD` و`JWT_SECRET` و`SEED_ADMIN_PASSWORD` إلى قيم قوية وفريدة. كلمة مرور المدير لا تقل عن 12 حرفاً، وJWT_SECRET لا يقل عن 32 حرفاً.
4. افتح الطرفية في جذر المشروع ونفذ:
   ```bash
   docker compose up --build -d
   ```
5. انتظر جاهزية قاعدة البيانات والخادم ثم افتح:
   - المنصة: `http://localhost:4000`
   - إدارة الوحدات التشغيلية: `http://localhost:4000/admin-operations.html`
   - الإدارة التفصيلية: `http://localhost:4000/admin-business.html`
   - فحص الجاهزية: `http://localhost:4000/api/ready`
6. حساب المدير: اسم المستخدم `admin` وكلمة المرور هي القيمة التي وضعتها في `SEED_ADMIN_PASSWORD`.

في Windows يمكن تشغيل `scripts/start-local.bat`، وفي Linux/macOS يمكن تشغيل `sh scripts/start-local.sh` بعد إعداد `.env`.

## 4) تشغيل يدوي دون Docker
1. أنشئ قاعدة PostgreSQL وقاعدة باسم `glh` ومستخدم لديه صلاحية عليها.
2. انسخ `server/.env.example` إلى `server/.env` وحدّث `DATABASE_URL` و`JWT_SECRET` و`SEED_ADMIN_PASSWORD`.
3. من جذر المشروع نفذ:
   ```bash
   cd server
   npm install
   npx prisma validate
   npx prisma generate
   npx prisma db push
   node prisma/seed.js
   npm test
   npm start
   ```
4. افتح `http://localhost:4000`.

## 5) الوصول إلى إدارة المانحين والمصنعين
1. افتح `/admin-operations.html` وسجّل الدخول بحساب إداري.
2. من قائمة **الإدارة التشغيلية** اختر **إدارة المانحين** أو **إدارة المصنعين**.
3. يفتح النظام `/admin-business.html?section=donor-directory` أو `/admin-business.html?section=manufacturers`.
4. داخل الواجهة التفصيلية ستجد وظائف الملفات والاعتماد، وبرامج المنح وطلبات المنح، وكتالوج المنتجات وطلبات عروض الأسعار والعينات.
5. إذا لم تكن الصلاحية متاحة، ستظهر رسالة واضحة مع رابط إلى إدارة الصلاحيات بدلاً من بقاء الصفحة فارغة.

الصلاحيات الأساسية:
- `donors.manage`
- `manufacturers.manage`

حساب `ADMIN` يمتلك صلاحيات شاملة. دور `OPS` يحصل على الصلاحيتين افتراضياً عند إنشاء قاعدة البيانات لأول مرة بواسطة seed. إذا كانت قاعدة موجودة مسبقاً، راجع مصفوفة الصلاحيات من `/admin-access.html` ولا تفترض أن seed سيعيد كتابة قرارات الصلاحيات الموجودة.

## 6) فحوص البناء
من مجلد `server`:
```bash
npm test
npx prisma validate
npx prisma generate
```
ثم اختبر قاعدة البيانات الفعلية باستخدام:
```bash
npx prisma db push
node scripts/check-db.js
```
لا تنفذ `db push` على قاعدة إنتاجية قبل أخذ نسخة احتياطية ومراجعة التغييرات.

## 7) إيقاف الخدمة والنسخ الاحتياطي
- إيقاف Docker: `docker compose down`.
- إيقاف مع الاحتفاظ بالبيانات: `docker compose down` (لا تستخدم `-v`).
- نسخة احتياطية: `sh scripts/backup-postgres.sh` مع ضبط متغيرات اتصال قاعدة البيانات.
- لا تحذف مجلد Docker volume `glh_pgdata` إذا كنت تريد الاحتفاظ بالبيانات.

## 8) تنبيهات تشغيلية
- الحزمة سورس كود، ولا تتضمن `node_modules` أو أسرار تشغيل.
- ملفات وثائق الجهات والمصانع في هذا الإصدار ممثلة ببيانات metadata داخل قاعدة البيانات؛ لا تعتبر رفع الملفات إلى تخزين سحابي دائم مكتملاً.
- لا توجد بيانات مانحين أو مصانع افتراضية تلقائية؛ ستظهر السجلات فارغة حتى تضيف بيانات حقيقية أو تستوردها.
- لا يوجد اتصال فعلي بالبنوك أو أنظمة SWIFT أو شركات الشحن لمجرد ظهور خيارات التكامل؛ يلزم عقد وبيانات اعتماد وبيئة اختبار ومراجعة أمنية.
