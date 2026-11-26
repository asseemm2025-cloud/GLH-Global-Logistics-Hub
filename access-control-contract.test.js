import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../../',import.meta.url);
test('access control endpoints and admin UI are present',()=>{
 const route=fs.readFileSync(new URL('../src/routes/access-control.js',import.meta.url),'utf8');
 const index=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
 const page=fs.readFileSync(new URL('../../web/admin-access.html',import.meta.url),'utf8');
 assert.match(index,/app\.use\('\/api\/access', accessControl\)/);
 for(const path of ['/catalog','/matrix','/organization','/my-permissions'])assert.ok(route.includes(`'${path}'`));
 assert.match(route,/req\.user\?\.role==='ADMIN'/);
 assert.match(page,/مصفوفة الصلاحيات التفصيلية/);
});
