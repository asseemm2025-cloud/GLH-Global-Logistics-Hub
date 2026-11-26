import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname || new URL('.', import.meta.url).pathname, '../..');
const indexHtml = await readFile(resolve(root, 'web/index.html'), 'utf8');
const adminHtml = await readFile(resolve(root, 'web/admin-business.html'), 'utf8');
test('admin sidebar groups all newly requested departments', () => {
  for (const label of ['التجار والسوق والبوابات','إدارة موارد المؤسسات ERP','إدارة المدفوعات التفصيلية','إدارة المستثمرين ومقدمي الخدمات','إدارة التبرعات','إدارة الديون والتحصيل','الهيكل الإداري والصلاحيات']) assert.ok(indexHtml.includes(label), `missing ${label}`);
});
test('admin navigation opens API-backed modules instead of dead legacy routes', () => {
  for (const key of ['enterpriseAdmin','debtsAdmin','providersAdmin','donationsAdmin','paymentAdmin','merchantAdmin','accessAdmin']) assert.ok(indexHtml.includes(`'${key}'`), `missing module ${key}`);
  for (const endpoint of ['/business/organizations','/business/admin/debts','/business/admin/providers','/business/admin/donation-campaigns','/business/admin/payment-transactions','/business/admin/merchants','/access/matrix']) assert.ok(indexHtml.includes(endpoint), `missing API endpoint ${endpoint}`);
});
test('business admin honors requested section after login', () => {
  assert.ok(adminHtml.includes("new URLSearchParams(location.search).get('section')"));
  assert.ok(adminHtml.includes('async function initializeAdmin()'));
  assert.ok(adminHtml.includes('if(GLHApi.isAuthenticated())initializeAdmin()'));
  assert.ok(adminHtml.includes('await load(page)'));
  assert.ok(adminHtml.includes("const requested=new URLSearchParams(location.search).get('section')"));
});
test('client UI exposes merchant registration portal', () => {
  assert.ok(indexHtml.includes('مساحة الحساب والبوابة'));
  assert.ok(indexHtml.includes('href="/merchant.html"'));
});
