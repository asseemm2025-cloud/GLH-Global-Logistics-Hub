# تشغيل GLH v0.6.5 على Render

1. ارفع محتويات الحزمة إلى مستودع GitHub.
2. أنشئ PostgreSQL على Render.
3. أنشئ Web Service أو Blueprint من `render.yaml`.
4. اضبط `DATABASE_URL` و`JWT_SECRET` و`SEED_ADMIN_PASSWORD` كمتغيرات سرية.
5. Build: `cd server && npm install && npx prisma generate`.
6. Start: `cd server && npx prisma db push && node prisma/seed.js && node src/index.js`.
7. افحص `/api/health` حتى تظهر قاعدة البيانات `connected`.
8. اختبر التسجيل من `/merchant.html`، والإدارة من `/admin-business.html`.

لا تضع `.env` أو أسرار مزودي الدفع في GitHub. راجع دليل التثبيت الكامل والقيود في `INSTALL_GITHUB_RENDER_AR.md` و`IMPLEMENTATION_STATUS_AR.md`.
