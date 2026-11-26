import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../../web/admin-operations.html',import.meta.url),'utf8');
test('donor and manufacturer management are grouped directly under operational administration',()=>{
  const start=html.indexOf('<div class=\"group\">الإدارة التشغيلية</div>');
  const end=html.indexOf('<div class=\"group\">أدوات عامة</div>');
  assert.ok(start>=0 && end>start);
  const operationalMenu=html.slice(start,end);
  assert.ok(operationalMenu.includes('إدارة المانحين'));
  assert.ok(operationalMenu.includes('إدارة المصنعين'));
  assert.ok(operationalMenu.includes("data-mod=\"donors\""));
  assert.ok(operationalMenu.includes("data-mod=\"manufacturers\""));
  for (const key of ['donor-programs','donor-applications','manufacturer-catalog','manufacturer-inquiries']) {
    assert.ok(operationalMenu.includes(`data-mod=\"${key}\"`));
    assert.ok(html.includes(`'${key}':{title:`));
  }
  assert.ok(!operationalMenu.includes('الشراكات والتمكين الصناعي'));
});
