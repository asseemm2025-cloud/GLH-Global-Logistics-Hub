import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const admin=readFileSync(resolve(root,'web/admin-business.html'),'utf8');
const access=readFileSync(resolve(root,'server/src/security/permission-catalog.js'),'utf8');
const business=readFileSync(resolve(root,'server/src/routes/business.js'),'utf8');

test('ERP organization rows expose a working detail action',()=>{
  assert.match(admin,/viewOrganization\('\$\{x\.id\}'\)/);
  assert.match(admin,/business\/organizations\/'\+id/);
});
test('providers navigation checks the same permission required by its API',()=>{
  assert.match(admin,/providers:'providers\.manage'/);
  assert.match(business,/router\.get\('\/admin\/providers',requireAuth,requirePermission\('providers\.manage'\)/);
});
test('payment administration lists disabled methods and supports enable/disable',()=>{
  assert.match(admin,/business\/admin\/payment-methods/);
  assert.match(admin,/togglePaymentMethod/);
  assert.match(admin,/enabled\?'مفعلة':'موقوفة'/);
});
test('global permission catalogue includes granular permissions for requested modules',()=>{
  for(const key of ['enterprise.view','enterprise.manage','debts.view','debts.manage','providers.view','providers.manage','donations.view','donations.manage','payments.methods.view','payments.methods.manage','merchants.review','products.moderate','roles.manage','permissions.assign']) assert.ok(access.includes(key),key);
});
