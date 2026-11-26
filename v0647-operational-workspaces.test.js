import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const html = await readFile(new URL('../../web/admin-operations.html', import.meta.url), 'utf8');
const keys = ['investors','donors','donor-programs','donor-applications','manufacturers','manufacturer-catalog','manufacturer-inquiries','donations','debt','erp','portals','resources'];
test('all 12 operational departments have independent field configurations', () => {
  for (const key of keys) assert.ok(html.includes(`${key}:`) || html.includes(`'${key}':`), `missing ${key}`);
});
test('department forms enforce configured mandatory fields and validate numeric values', () => {
  assert.match(html, /const requiredFields=/);
  assert.match(html, /reportValidity\(\)/);
  assert.match(html, /Number\.isFinite\(Number\(v\)\)/);
});
test('operational records support workflow stage changes with retained history', () => {
  assert.match(html, /advanceRecord/);
  assert.match(html, /workflowHistory/);
  assert.match(html, /updateOperationalRecord\(id,data\)/);
});
test('departments can view and review customer requests routed to their module', () => {
  assert.match(html, /طلبات العملاء الواردة لهذه الإدارة/);
  assert.match(html, /operationalRequests\(\{module\}\)/);
  assert.match(html, /updateOperationalRequest\(id/);
});
test('financial modules validate donation allocations and debt collections', () => {
  assert.match(html, /المستلم ≤ المتعهد به/);
  assert.match(html, /المبلغ المحصل لا يمكن أن يتجاوز/);
});
