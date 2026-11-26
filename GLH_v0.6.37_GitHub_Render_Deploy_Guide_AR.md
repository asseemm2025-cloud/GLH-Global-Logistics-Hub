# دليل رفع GLH v0.6.37 إلى GitHub وRender

## GitHub
من مجلد المشروع:
`git status`
`git add .`
`git commit -m "Release GLH v0.6.37 integrated operations admin"`
`git push origin main`

## Render
- اربط مستودع GitHub بخدمة Web Service.
- Build Command: `cd server && npm install && npx prisma generate`
- Start Command: `cd server && npx prisma db push && node prisma/seed.js && node src/index.js`
- أضف متغيرات البيئة المطلوبة في لوحة Render، ومنها `DATABASE_URL` و`JWT_SECRET` وكلمة مرور مسؤول التهيئة.
- اربط PostgreSQL مُداراً، ثم افحص `/api/ready`.

## تنبيه
هذا دليل رفع فقط؛ لم يتم تنفيذ push أو نشر Render من خلال إنشاء هذه الحزمة. خذ نسخة احتياطية واختبر قاعدة البيانات والصلاحيات قبل الإنتاج.
