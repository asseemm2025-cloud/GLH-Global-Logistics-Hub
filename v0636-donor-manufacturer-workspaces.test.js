import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const admin=readFileSync(resolve(root,'web/admin-business.html'),'utf8');
const ops=readFileSync(resolve(root,'web/admin-operations.html'),'utf8');
const routes=readFileSync(resolve(root,'server/src/routes/advanced-operations.js'),'utf8');
const schema=readFileSync(resolve(root,'server/prisma/schema.prisma'),'utf8');

test('donor and manufacturer workspaces have visible icon navigation and sub-functions',()=>{
  assert.match(admin,/data-page="donor-directory" class="nav-feature"/);
  assert.match(admin,/data-page="manufacturers" class="nav-feature"/);
  for(const page of ['donor-programs','donor-applications','manufacturer-catalog','manufacturer-inquiries']) assert.ok(admin.includes(`data-page="${page}"`),page);
});
test('operational menu routes donor and manufacturer entries to the detailed database-backed workspace',()=>{
  assert.match(ops,/data-mod=\"donors\"/);
  assert.match(ops,/data-mod=\"manufacturers\"/);
  assert.match(ops,/function openConnectedModule\(section\)/);
  assert.match(ops,/function normalizeModule\(key\)/);
  for (const key of ['donor-programs','donor-applications','manufacturer-catalog','manufacturer-inquiries']) { assert.ok(ops.includes(`data-mod=\"${key}\"`)); assert.ok(ops.includes(`'${key}':{title:`)); }
  assert.match(admin,/api\('\/operations\/admin\/donors'\)/);
  assert.match(admin,/api\('\/operations\/admin\/manufacturers'\)/);
});
test('workspace displays actionable error state instead of leaving an empty loading screen',()=>{
  assert.match(admin,/workspace-error/);
  assert.match(admin,/إعادة المحاولة/);
  assert.match(admin,/مراجعة الصلاحيات/);
});
test('server exposes donor and manufacturer CRUD, product, program and inquiry endpoints',()=>{
  for(const path of ["/admin/donors", "/admin/manufacturers", "/admin/donor-programs", "/admin/donor-applications", "/admin/manufacturer-products", "/admin/manufacturer-inquiries"]) assert.ok(routes.includes(path),path);
});
test('database schema includes donor and manufacturer workflow models',()=>{
  for(const model of ['DonorOrganization','DonorProgram','DonorApplication','Manufacturer','ManufacturerProduct','ManufacturerInquiry']) assert.ok(schema.includes(`model ${model} {`),model);
});
