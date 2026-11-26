# GLH v0.6.21 – الربط المركزي لطلبات العميل

## ما أضيف برمجياً
- نموذج PostgreSQL جديد `ClientServiceRequest` مرتبط بحساب المستخدم، ويخزن نوع الطلب ومرجعه وحالته وبياناته الإضافية وملاحظات الإدارة.
- واجهة API موحدة تحت `/api/client-requests`:
  - `POST /api/client-requests` إنشاء طلب (يتطلب تسجيل الدخول).
  - `GET /api/client-requests/mine` عرض طلبات الحساب الحالي فقط.
  - `GET /api/client-requests` عرض الطلبات للإدارة والأدوار التشغيلية المصرح بها، مع مرشحات `type` و`status`.
  - `PATCH /api/client-requests/:id/status` تحديث الحالة وملاحظة الإدارة.
- أنواع الطلبات: `INVESTMENT`, `DONATION`, `DEBT_REVIEW`.
- حالات المعالجة: `SUBMITTED`, `UNDER_REVIEW`, `NEED_INFO`, `APPROVED`, `REJECTED`, `CLOSED`.
- فحص ملكية المديونية عند تقديم طلب مراجعة دين؛ لا يسمح بإنشاء طلب على مديونية لا تخص المستخدم.
- تسجيل إنشاء الطلب وتحديث حالته في سجل التدقيق.
- إضافة دوال مساعدة في `web/glh-api.js` لإرسال الطلبات وعرض طلبات العميل.

## تشغيل التحديث
من مجلد المشروع:
1. `npm install` (من الجذر إن كان إعداد المشروع يستخدم ذلك، أو `cd server && npm install`).
2. ضبط `DATABASE_URL` و`JWT_SECRET` في ملف البيئة، وعدم مشاركة الأسرار أو رفعها للمستودع.
3. `cd server && npx prisma validate`
4. `cd server && npx prisma generate`
5. `cd server && npx prisma db push` لتطبيق النموذج على قاعدة PostgreSQL الحالية بعد أخذ نسخة احتياطية.
6. `cd server && npm test`
7. تشغيل الخدمة ثم فحص `/api/ready` للتأكد من اتصال PostgreSQL.

## حدود التنفيذ الحالية
- تمت إضافة طبقة API والموديل وربط عميل JavaScript. يلزم استدعاء `GLHApi.submitClientServiceRequest(...)` من نماذج واجهة العميل وربط شاشة إدارة الطلبات بواجهتي GET وPATCH حتى يظهر سير العمل بصرياً في الشاشتين.
- لم يتم تشغيل PostgreSQL في بيئة التطوير هذه، لذلك لم تُنفذ ترقية قاعدة البيانات ولم يتم التحقق من الاتصال الفعلي.
- لم يتم نشر التحديث إلى GitHub أو Render.
