import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '../../web/index.html'), 'utf8');

test('v0.6.18 client navigation is vertical with a horizontal header and three-column service cards', () => {
  assert.match(html, /class="client-layout"/);
  assert.match(html, /class="client-sidebar"/);
  assert.match(html, /id="clientNav"/);
  assert.match(html, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(html, /الوحدات التشغيلية المتقدمة/);
});

test('client navigation keeps registration in a separate account area and hides finance/community and portal shortcuts', () => {
  assert.match(html, /مساحة الحساب والبوابة/);
  assert.match(html, /التسجيل \/ دخول العميل/);
  assert.match(html, /التسجيل كتاجر/);
  assert.match(html, /بوابتي/);
  assert.doesNotMatch(html, /home-shortcut shortcut-finance|home-shortcut shortcut-portal/);
  assert.doesNotMatch(html, /clientPage\('community'|clientPage\('finance'/);
});

test('advanced operational entry links to existing customer-facing destinations', () => {
  assert.match(html, /clientCurrent==='operations'/);
  for (const page of ['orders','request','services','directory','market','insurance','tools']) {
    assert.ok(html.includes(`clientPage('${page}')`), `missing client destination ${page}`);
  }
});
