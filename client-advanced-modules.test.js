import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '../../web/index.html'), 'utf8');

test('client advanced operations expose investors, debts and donations launchers', () => {
  assert.match(html, /clientPage\('investors'\)/);
  assert.match(html, /clientPage\('debts'\)/);
  assert.match(html, /clientPage\('donations'\)/);
});

test('client advanced modules provide request forms and do not expose admin workspace', () => {
  assert.match(html, /renderClientAdvancedModule/);
  assert.match(html, /طلب تسوية/);
  assert.match(html, /قيمة المساهمة المقترحة/);
  assert.match(html, /حجم الاستثمار المتوقع/);
  assert.match(html, /لا يمثل إرسال الطلب اعتماداً أو تحصيلاً أو تسوية مالية فعلية/);
});
