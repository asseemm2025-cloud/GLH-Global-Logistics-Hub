# دليل الميزات الجديدة — GLH v0.6.1

## 1. تسجيل العميل والتاجر

`POST /api/auth/register`

- الحساب العادي: `accountType: "CLIENT"` ولا ينشئ ملف تاجر ولا يملك واجهات إضافة المنتجات.
- حساب التاجر: `accountType: "MERCHANT"` مع كائن `merchant` يحتوي الاسم التجاري، نوع النشاط، بيانات التسجيل والضرائب، المسؤول، الهاتف والبريد، الدولة والمدينة والعنوان.
- ينشأ ملف `MerchantProfile` بحالة `PENDING`، ولا يسمح بإضافة منتجات أو متاجر قبل اعتماد الإدارة.

## 2. المتاجر والمنتجات والربط

- `GET /api/business/merchant/me`
- `GET /api/business/merchant/stores`
- `POST /api/business/merchant/stores`
- `GET /api/business/merchant/products`
- `POST /api/business/merchant/products`
- `GET /api/business/merchant/connections`
- `POST /api/business/merchant/connections`
- `POST /api/business/merchant/portals`
- `GET /api/business/merchant/portals`

كل منتج يرسل بحالة `PENDING` ولا يظهر في السوق حتى موافقة الإدارة. العميل العادي لا يستطيع الوصول إلى مسارات التاجر.

مراجعة الإدارة:
- `GET /api/business/admin/merchants`
- `PATCH /api/business/admin/merchants/:id/review`
- `GET /api/business/admin/products/pending`
- `PATCH /api/business/admin/products/:id/review`
- `GET /api/business/admin/connections`
- `PATCH /api/business/admin/connections/:id/approve`
- `GET /api/business/admin/portals`
- `PATCH /api/business/admin/portals/:id/review`

## 3. البوابات والأنظمة المصغرة

كيان `MerchantPortal` يتيح لكل تاجر طلب بوابة مستقلة مرتبطة بمتجره، مع `slug` فريد وهوية بصرية وإعدادات. تبدأ بحالة `PENDING` ولا تصبح فعالة قبل موافقة الإدارة. هذه النسخة تسجل إعدادات البوابة وحالتها؛ ولا تنشئ بعد تطبيقاً مستقلاً متعدد المستأجرين أو نطاق DNS آلياً.

## 4. إدارة موارد المؤسسات ERP

الجداول:
- `Organization`: ملف الجهة وبياناتها القانونية والمالية.
- `OrganizationUnit`: الإدارات والأقسام والوحدات والميزانيات.
- `OrganizationEmployee`: الموظفون والوظائف والعقود والرواتب الأساسية.
- `EnterpriseAsset`: الأصول والأجهزة والمواقع والقيم.

واجهات API:
- `GET/POST /api/business/organizations`
- `GET /api/business/organizations/:id`
- `POST /api/business/organizations/:id/units`
- `POST /api/business/organizations/:id/employees`
- `POST /api/business/organizations/:id/assets`

هذه طبقة بيانات ERP أولية قابلة للتوسع؛ ولا تتضمن بعد دفتر أستاذ محاسبي أو رواتب أو مشتريات أو مخزون ERP متكامل.

## 5. إدارة وسائل الدفع

`PaymentMethod` يدعم الأنواع: النقد، التحويل البنكي، البطاقات، المحافظ الإلكترونية، QR، روابط الدفع، الخصم المباشر، الدفع عند الاستلام، حساب الضمان، وأخرى.

- `GET /api/business/payment-methods`
- `POST /api/business/admin/payment-methods`
- `PATCH /api/business/admin/payment-methods/:id`
- `POST /api/business/payment-transactions`
- `GET /api/business/payment-transactions/mine`
- `GET /api/business/admin/payment-transactions`

إنشاء `PaymentTransaction` يسجل نية/طلب دفع فقط (`INITIATED`) ولا يخصم مالاً. التنفيذ الحقيقي يتطلب موصل مزود الدفع ومفاتيح Sandbox/Production وتأكيد webhook موثوق.

## 6. دليل المستثمرين والمانحين والمقرضين والمهنيين

`ProfessionalProvider.category`:
- `INVESTOR` المستثمرون
- `DONOR` المانحون
- `LENDER` المقرضون
- `DEBT_COLLECTOR` محصلو الديون
- `LAWYER` المحامون
- `CHINA_MARKET_BROKER` وسطاء الأسواق المحلية في الصين

الواجهات:
- `GET /api/business/providers?category=...` يعرض الجهات الموثقة فقط.
- `GET/POST /api/business/admin/providers`
- `PATCH /api/business/admin/providers/:id/status`
- `POST /api/business/admin/providers/:id/engagements`

يجب التحقق من الهوية والتراخيص والعقود قبل اعتماد أي مزود أو إحالة عميل إليه.

## 7. التبرعات وسداد الديون

التبرعات:
- `GET /api/business/donation-campaigns`
- `POST /api/business/donations`
- `POST /api/business/admin/donation-campaigns`
- `GET /api/business/admin/donations`
- `PATCH /api/business/admin/donations/:id/status`

التبرع يسجل تعهداً ولا يعد مبلغاً مستلماً حتى تأكيد التحصيل. تغيير الحالة إلى `RECEIVED` يضيف المبلغ إلى إجمالي الحملة مرة واحدة.

الديون:
- `POST /api/business/admin/debts`
- `GET /api/business/admin/debts`
- `GET /api/business/debts/mine`
- `POST /api/business/debts/:id/payment-intents`
- `GET /api/business/admin/debt-payments`
- `PATCH /api/business/admin/debt-payments/:id/confirm`
- `POST /api/business/admin/debts/:id/payments` لتسجيل سداد تحقق منه الموظف.

طلب السداد من العميل يبقى `PENDING` ولا ينقص رصيد الدين حتى تأكيد التحصيل. لا تستخدم المنصة كجهة تحصيل قانونية دون التراخيص والتفويضات اللازمة.

## 8. الصلاحيات الجديدة

- `merchants.review`
- `products.moderate`
- `enterprise.view`
- `enterprise.manage`
- `payments.methods.manage`
- `payments.transactions.view`
- `providers.manage`
- `donations.manage`
- `debts.manage`

حساب ADMIN يمتلك الصلاحيات عبر middleware. يجب توزيع الصلاحيات على OPS وFINANCE من شاشة الصلاحيات أو بيانات RolePermission بحسب هيكل الجهة.
