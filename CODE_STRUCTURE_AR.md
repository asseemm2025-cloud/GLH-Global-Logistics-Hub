# شرح بنية الأكواد — GLH v0.6.0

- `web/index.html`: واجهة Stage 5 الأصلية.
- `web/glh-api.js`: جسر طلبات HTTP إلى `/api`، مع Bearer token في sessionStorage.
- `web/merchant.html`: تسجيل عميل/تاجر، ملف التاجر، المتاجر، المنتجات، طلبات الربط والبوابات.
- `web/admin-business.html`: مراجعة التجار والمنتجات والبوابات وطلبات الربط، وإدارة ERP والمدفوعات ومزودي الخدمات والتبرعات والديون.
- `web/community.html`: وسائل الدفع، حملات التبرع، دليل الخدمات المهنية وطلبات سداد الدين.
- `server/src/index.js`: إعداد Express والحماية وتهيئة المسارات وتقديم ملفات الويب.
- `server/src/routes/auth.js`: تسجيل ودخول المستخدمين وإصدار JWT.
- `server/src/routes/business.js`: الوحدات الجديدة في v0.6.0.
- `server/src/middleware/auth.js`: التحقق من JWT وصلاحيات الدور.
- `server/prisma/schema.prisma`: مخطط PostgreSQL.
- `server/prisma/seed.js`: إعداد القطاعات والصلاحيات ووسائل الدفع وحساب الإدارة.
- `server/test/`: اختبارات Node.js.

## نمط إضافة API جديد
1. أضف نموذج Prisma أو حقولاً جديدة في `schema.prisma`.
2. شغّل `prisma validate` ثم migration/`db push` في بيئة التطوير.
3. أضف route في `server/src/routes/` أو داخل `business.js`.
4. احمِ المسارات بـ `requireAuth` و`requirePermission` أو ملكية السجل.
5. أضف سجل تدقيق عند تغييرات الحالة الحساسة.
6. أضف اختباراً في `server/test/` ووثّق المسار في `API_REFERENCE_AR.md`.
7. أضف دالة في `web/glh-api.js` ثم اربطها بواجهة العميل أو الإدارة.

لا تعتمد على إخفاء الأزرار في المتصفح كوسيلة حماية؛ يجب فرض الصلاحيات على الخادم دائماً.
