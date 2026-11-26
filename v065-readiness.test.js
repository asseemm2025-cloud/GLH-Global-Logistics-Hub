import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.basename(process.cwd())==='server'?path.resolve(process.cwd(),'..'):process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('v0.6.5 separates liveness from PostgreSQL readiness',()=>{
 const src=read('server/src/index.js');
 assert.match(src,/app\.get\('\/api\/health'/);
 assert.match(src,/app\.get\('\/api\/ready'/);
 assert.match(src,/status: 'not_ready'/);
});
test('Render readiness gate checks the database endpoint',()=>{
 assert.match(read('render.yaml'),/healthCheckPath: \/api\/ready/);
});
test('database verification script checks PostgreSQL and public schema tables',()=>{
 const s=read('server/scripts/check-db.js');
 assert.match(s,/\$connect/); assert.match(s,/information_schema\.tables/);
});
test('admin UI exposes an actionable database readiness check',()=>{
 const ui=read('web/admin-business.html');
 assert.match(ui,/checkGLHDatabase/); assert.match(ui,/readiness\(\)/);
});
