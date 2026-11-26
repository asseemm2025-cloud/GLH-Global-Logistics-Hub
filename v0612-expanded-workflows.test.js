import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const schema = read('../prisma/schema.prisma');
const routes = read('../src/routes/business.js');
const admin = read('../../web/admin-business.html');
test('v0.6.12 adds persisted debt installments and collection diary models',()=>{
 assert.match(schema,/model DebtInstallment/); assert.match(schema,/model DebtCollectionActivity/); assert.match(schema,/installments DebtInstallment\[\]/);
 assert.match(routes,/\/admin\/debts\/:id\/installments/); assert.match(routes,/\/admin\/debts\/:id\/collection-activities/);
});
test('v0.6.12 adds donation allocation ledger separate from receipt',()=>{
 assert.match(schema,/model DonationAllocation/); assert.match(routes,/\/admin\/donation-allocations/); assert.match(routes,/DISBURSED/); assert.match(admin,/تخصيص وصرف التبرعات/);
});
test('v0.6.12 adds investment opportunities and customer applications',()=>{
 assert.match(schema,/model InvestmentOpportunity/); assert.match(schema,/model InvestmentApplication/); assert.match(routes,/\/investment-opportunities/); assert.match(routes,/\/investment-applications\/mine/); assert.match(admin,/إدارة الفرص الاستثمارية/);
});
test('investment application is authenticated and opportunity must be open',()=>{
 assert.match(routes,/router\.post\('\/investment-opportunities\/:id\/applications',requireAuth/); assert.match(routes,/status:'OPEN'/); assert.match(routes,/لا يمثل ذلك قبولاً أو ضماناً للعائد/);
});
test('admin screens expose forms for schedule, collection, allocation and investor review',()=>{
 assert.match(admin,/جدولة قسط ومتابعة التحصيل/); assert.match(admin,/حفظ متابعة التحصيل/); assert.match(admin,/قبول مبدئي/); assert.match(admin,/تأكيد الصرف/);
});
