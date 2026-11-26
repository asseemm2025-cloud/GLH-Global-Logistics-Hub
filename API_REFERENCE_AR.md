# مرجع واجهات GLH API – الإصدار 0.5.0

الأساس: `/api`، والتنسيق JSON. المسارات المحمية تتطلب `Authorization: Bearer <token>`.

| الطريقة | المسار | الوظيفة | المصادقة |
|---|---|---|---|
| POST | `/auth/register` | تسجيل عميل | لا |
| POST | `/auth/login` | تسجيل الدخول وإصدار JWT | لا |
| GET | `/health` | حالة الخادم وقاعدة البيانات | لا |
| GET | `/catalog/products` | المنتجات المنشورة | لا |
| GET | `/catalog/finance-products` | منتجات التمويل المتاحة | لا |
| POST | `/orders` | إنشاء طلب | نعم |
| GET | `/orders/mine` | طلبات العميل الحالي | نعم |
| GET | `/orders` | عرض الطلبات التشغيلية | نعم + دور مصرح |
| PATCH | `/orders/:id/status` | تحديث حالة الطلب | نعم + دور مصرح |
| GET | `/management/sectors` | القطاعات والخدمات النشطة | لا |
| GET/POST | `/partners` | عرض/إضافة الشركاء | نعم + صلاحية |
| PATCH | `/partners/:id/status` | تغيير حالة شريك | نعم + صلاحية |
| PUT | `/partners/primary-bank/:id` | تعيين البنك الرئيسي | نعم + صلاحية |
| DELETE | `/partners/primary-bank` | إلغاء البنك الرئيسي | نعم + صلاحية |
| POST | `/partners/routing/preview` | معاينة توجيه عملية | نعم + صلاحية |
| GET/POST | `/partners/routing/rules` | عرض/إنشاء قواعد التوجيه | نعم + صلاحية |
| GET/POST | `/management/integrations` | سجل موصلات التكامل | نعم + صلاحية |
| POST | `/management/webhooks/:integrationId` | استقبال webhook موقّع | توقيع HMAC |
| GET | `/management/reports/summary` | ملخص تقارير الطلبات | نعم + صلاحية |
| GET | `/management/reports/audit` | سجل التدقيق | نعم + صلاحية |

## جسر المتصفح
الملف `web/glh-api.js` ينشئ الكائن `window.GLHApi` ويتيح `register`, `login`, `logout`, `createOrder`, `myOrders`, `sectors`, `partners`, `routingPreview`, `health`.

## ملاحظات
- مسارات الشركاء والتوجيه لا تنفذ مدفوعات أو تحويلات. `routing/preview` يعيد قرار اختيار فقط.
- مسارات الإدارة الحساسة تعتمد على الصلاحيات المسجلة في `RolePermission`؛ دور ADMIN يتجاوز فحص الصلاحية.
- يجب توحيد سياسات التحقق من الملكية والوصول على مستوى كل كيان قبل نشر النظام لعملاء فعليين.

## واجهات الإصدار 0.6.0 الجديدة

جميع المسارات أدناه تحت `/api/business` ما لم يذكر خلاف ذلك. تتطلب المسارات الإدارية Bearer JWT وصلاحية مناسبة.

| المسار | الطريقة | الصلاحية / الغرض |
|---|---|---|
| `/merchant/me` | GET | ملف التاجر الحالي |
| `/merchant/stores` | GET/POST | متاجر التاجر المعتمد |
| `/merchant/products` | GET/POST | منتجات التاجر؛ الإضافة ترسل للمراجعة |
| `/merchant/connections` | GET/POST | طلب ربط متجر/واجهة API |
| `/merchant/portals` | GET/POST | طلب بوابة مصغرة |
| `/admin/merchants` | GET | `merchants.review` |
| `/admin/merchants/:id/review` | PATCH | اعتماد/رفض/تعليق التاجر |
| `/admin/products/pending` | GET | `products.moderate` |
| `/admin/products/:id/review` | PATCH | الموافقة على النشر أو الرفض |
| `/admin/connections` | GET | طلبات ربط التجار |
| `/admin/connections/:id/approve` | PATCH | مراجعة صلاحيات الربط |
| `/admin/portals` | GET | طلبات البوابات |
| `/admin/portals/:id/review` | PATCH | تفعيل/رفض/تعليق بوابة |
| `/organizations` | GET/POST | `enterprise.view` / `enterprise.manage` |
| `/organizations/:id` | GET | ملف الجهة والوحدات والموظفين والأصول |
| `/organizations/:id/units` | POST | إنشاء إدارة/قسم |
| `/organizations/:id/employees` | POST | تسجيل موظف |
| `/organizations/:id/assets` | POST | تسجيل أصل |
| `/payment-methods` | GET | وسائل الدفع المفعلة |
| `/admin/payment-methods` | POST | `payments.methods.manage` |
| `/admin/payment-methods/:id` | PATCH | تعديل حالة/رسوم الوسيلة |
| `/payment-transactions` | POST | تسجيل طلب دفع دون خصم فعلي |
| `/payment-transactions/mine` | GET | عمليات المستخدم |
| `/admin/payment-transactions` | GET | `payments.transactions.view` |
| `/providers` | GET | دليل المزودين الموثقين |
| `/admin/providers` | GET/POST | `providers.manage` |
| `/admin/providers/:id/status` | PATCH | توثيق أو تعليق المزود |
| `/admin/providers/:id/engagements` | POST | تسجيل تكليف مهني |
| `/donation-campaigns` | GET | الحملات النشطة |
| `/donations` | POST | تعهد تبرع دون تحصيل آلي |
| `/admin/donation-campaigns` | POST | `donations.manage` |
| `/admin/donations` | GET | سجل التبرعات |
| `/admin/donations/:id/status` | PATCH | تحديث حالة التحصيل |
| `/admin/debts` | GET/POST | `debts.manage` |
| `/debts/mine` | GET | ديون مرتبطة بالمستخدم |
| `/debts/:id/payment-intents` | POST | طلب سداد ينتظر التأكيد |
| `/admin/debt-payments` | GET | مراجعة طلبات السداد |
| `/admin/debt-payments/:id/confirm` | PATCH | تأكيد/رفض طلب السداد |
| `/admin/debts/:id/payments` | POST | تسجيل سداد تم التحقق منه إدارياً |

### رموز الحالات
- التاجر: `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`.
- المنتج: `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`.
- البوابة: `DRAFT`, `PENDING`, `ACTIVE`, `SUSPENDED`.
- الدفع: `INITIATED`, `PENDING`, `SUCCESS`, `FAILED`, `CANCELLED`, `REFUNDED`.
- التبرع: `PLEDGED`, `RECEIVED`, `ALLOCATED`, `CANCELLED`.
- الدين: `OPEN`, `PARTIALLY_PAID`, `SETTLED`, `DISPUTED`, `WRITTEN_OFF`.

## واجهات الهيكل الإداري والصلاحيات (v0.6.1)

- `GET /api/access/catalog` — كتالوج الإدارات والأدوار والصلاحيات.
- `GET /api/access/matrix` — مصفوفة الصلاحيات الحالية.
- `PUT /api/access/matrix` — تحديث مجموعة تغييرات `{changes:[{role,permission,allowed}]}`؛ ADMIN فقط.
- `GET /api/access/organization` — الهيكل الإداري المحفوظ.
- `PUT /api/access/organization` — حفظ الإدارات والمسميات الوظيفية؛ ADMIN فقط.
- `GET /api/access/my-permissions` — الصلاحيات الممنوحة للدور الحالي.

تتطلب الواجهات المصادقة Bearer JWT. التحديثات الإدارية تسجل في AuditLog.
