# دليل الرفع إلى GitHub والنشر على Render — GLH v0.6.36

## أ) تجهيز GitHub
1. أنشئ مستودعاً خاصاً في GitHub أو استخدم المستودع المعتمد للمشروع.
2. فك ضغط حزمة GLH وافتح الطرفية في جذر المشروع.
3. تأكد أن `.gitignore` يستثني `.env` و`server/.env` و`node_modules/` وملفات السجلات.
4. نفذ:
   ```bash
   git init
   git add .
   git status
   git commit -m "GLH v0.6.36 donor and manufacturer admin workspaces"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPOSITORY.git
   git push -u origin main
   ```
5. استبدل `USERNAME/REPOSITORY` بعنوان مستودعك. إذا كان المستودع موجوداً مسبقاً، اسحب التغييرات أولاً أو ارفع الإصدار على فرع مستقل لتجنب استبدال العمل الموجود.

**ممنوع رفع** `.env` أو كلمات المرور أو مفاتيح JWT أو بيانات اتصال PostgreSQL أو وثائق العملاء.

## ب) إعداد Render
1. أنشئ PostgreSQL database على Render.
2. أنشئ Web Service واربطه بمستودع GitHub.
3. يمكن استخدام `render.yaml` كـ Blueprint. راجع اسم قاعدة البيانات والخطة قبل التأكيد.
4. إعدادات البناء الحالية:
   - Build: `cd server && npm install && npx prisma generate`
   - Start: `cd server && npx prisma db push && node prisma/seed.js && node src/index.js`
   - Health check: `/api/ready`
5. أضف متغيرات البيئة:
   - `NODE_ENV=production`
   - `DATABASE_URL` = Internal Database URL لقاعدة Render
   - `JWT_SECRET` = قيمة عشوائية طويلة (32 حرفاً على الأقل)
   - `JWT_EXPIRES_IN=8h`
   - `SEED_ADMIN_PASSWORD` = كلمة مرور فريدة لا تقل عن 12 حرفاً
   - `SEED_DEMO_DATA=false`
6. نفّذ Deploy وانتظر نجاح Build وDeploy.
7. اختبر `https://YOUR-SERVICE.onrender.com/api/health` ثم `/api/ready`. يجب أن تكون حالة قاعدة البيانات `connected` في `/api/ready`.
8. افتح `/admin-operations.html` وسجّل الدخول ثم اختبر واجهتي المانحين والمصنعين.

## ج) تحديث إصدار منشور
- احتفظ بنسخة احتياطية من PostgreSQL قبل أي تحديث مخطط.
- راجع فرق `schema.prisma` قبل تشغيل `prisma db push`.
- لا تنشئ مستودعاً جديداً ولا تستبدل قاعدة البيانات القائمة دون خطة ترحيل ونسخ احتياطي.
- بعد النشر امسح/حدّث ذاكرة المتصفح المؤقتة إذا ظهرت واجهة قديمة؛ إصدار Service Worker في هذه الحزمة تم رفعه إلى `glh-shell-v19`.

## د) حدود هذا التسليم
هذا الدليل يشرح خطوات الرفع، لكنه لا يعني أن GitHub أو Render قد تم تحديثهما بالفعل. النشر يحتاج صلاحية وصول إلى المستودع وحساب Render وقاعدة البيانات، ويتم فقط بعد تأكيد المستخدم.
