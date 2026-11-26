import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const web = path.join(import.meta.dirname, '../../web');
const admin = fs.readFileSync(path.join(web, 'admin-business.html'), 'utf8');
const legacy = fs.readFileSync(path.join(web, 'admin-operations.html'), 'utf8');
test('0.6.38 integrates operational navigation in platform administration', () => {
  for (const page of ['ops-investors','ops-donations','ops-debts','ops-erp','ops-portals','reports-ops','integrations-ops','delivery-ops']) assert.ok(admin.includes(`data-page="${page}"`), page);
  assert.ok(admin.includes("'ops-investors':'providers'"));
  assert.ok(admin.includes("api('/management/integrations')"));
  assert.ok(!admin.includes('href="/admin-operations.html"'));
  assert.ok(legacy.includes("document.body.classList.add('embedded')"));
});
