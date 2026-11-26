# GLH Hybrid Implementation v0.6.6

Hybrid logistics, commerce and service platform. This release adds merchant onboarding and moderation, merchant stores/products/mini-portals, enterprise directory and basic ERP records, payment method catalog and payment-intent ledger, professional service providers, donations and debt repayment workflows.

See `README_AR.md` and `docs/FEATURES_0.6.6_AR.md` for Arabic setup and feature documentation. Payments and donations are not automatically charged or settled; real providers require credentials, contracts, sandbox validation and verified webhooks.


Version 0.6.6 adds a published-products marketplace, expanded merchant onboarding, persisted customer-to-merchant inquiries, merchant response workflow, and admin operational summary. See the Arabic workflow and implementation status docs.


## الإصدار 0.6.11 – التشغيل المحلي الصحيح
لا تفتح ملفات HTML مباشرة من مدير الملفات (عنوان `content://`). شغّل التطبيق وقاعدة البيانات معاً عبر Docker Compose: في Windows شغّل `scripts/start-local.bat`، وفي macOS/Linux نفّذ `sh scripts/start-local.sh`. بعد التشغيل افتح `http://localhost:4000`، وتحقق من `http://localhost:4000/api/ready`. التفاصيل في `docs/LOCAL_TESTING_0.6.11_AR.md`.
