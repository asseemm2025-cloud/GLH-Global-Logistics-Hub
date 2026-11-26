import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html=readFileSync(new URL('../../web/index.html',import.meta.url),'utf8');
test('platform admin mode requires authenticated ADMIN login before showing admin shell',()=>{
  assert.match(html,/function enterAdminMode\(\)/);
  assert.match(html,/GLHApi\.login\(d\.username\.trim\(\),d\.password\)/);
  assert.match(html,/result\.user\?\.role!=='ADMIN'/);
  assert.match(html,/GLHApi\.request\('\/access\/catalog'\)/);
  assert.match(html,/function setMode\(m\)\{if\(m==='admin'\)\{enterAdminMode\(\);return\}/);
});
test('admin logout clears the API token and returns to client mode',()=>{
  assert.match(html,/GLHApi\.logout\(\)/);
  assert.match(html,/تسجيل خروج الإدارة/);
});
