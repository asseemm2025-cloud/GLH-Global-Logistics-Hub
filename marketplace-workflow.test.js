import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.basename(process.cwd())==='server'?path.resolve(process.cwd(),'..'):process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('published marketplace catalogue is restricted to approved products and active stores',()=>{
 const s=read('server/src/routes/business.js');
 assert.match(s,/router\.get\('\/marketplace\/products'/);
 assert.match(s,/published:true,moderationStatus:'APPROVED',store:\{status:'ACTIVE'\}/);
});
test('customer inquiries persist and connect customer, product and merchant',()=>{
 const schema=read('server/prisma/schema.prisma'); const route=read('server/src/routes/business.js');
 assert.match(schema,/model MerchantInquiry/); assert.match(schema,/customer User @relation\("InquiryCustomer"/); assert.match(schema,/merchant User @relation\("InquiryMerchant"/);
 assert.match(route,/router\.post\('\/marketplace\/products\/:id\/inquiries',requireAuth/);
 assert.match(route,/router\.get\('\/merchant\/inquiries'/);
 assert.match(route,/router\.patch\('\/merchant\/inquiries\/:id\/respond'/);
});
test('customer UI cannot add products and marketplace UI is present',()=>{
 const merchant=read('web/merchant.html'); const market=read('web/marketplace.html');
 assert.match(merchant,/عميل عادي/); assert.match(merchant,/لا تتوفر لهذا الحساب صلاحيات إضافة أو إدارة المنتجات/);
 assert.match(market,/business\/marketplace\/products/); assert.match(market,/استفسار \/ طلب عرض/);
});
test('merchant onboarding captures business profile requirements',()=>{
 const schema=read('server/prisma/schema.prisma'); const ui=read('web/merchant.html'); const auth=read('server/src/routes/auth.js');
 for(const field of ['businessCategory','legalForm','productCategories','estimatedMonthlyOrders','hasCommercialRegistration','shippingCapability','returnPolicy']) { assert.match(schema,new RegExp(field)); assert.match(ui,new RegExp(field)); assert.match(auth,new RegExp(field)); }
});
test('admin dashboard exposes database summary and inquiry supervision',()=>{
 const route=read('server/src/routes/business.js'); const ui=read('web/admin-business.html');
 assert.match(route,/router\.get\('\/admin\/summary'/); assert.match(route,/router\.get\('\/admin\/marketplace\/inquiries'/);
 assert.match(ui,/ملخص الإدارة/); assert.match(ui,/استفسارات السوق/);
});
