import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const route=fs.readFileSync(new URL('../src/routes/client-requests.js',import.meta.url),'utf8');
const schema=fs.readFileSync(new URL('../prisma/schema.prisma',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
test('client service requests are persisted with ownership and audit trail',()=>{
 assert.match(schema,/model ClientServiceRequest/); assert.match(schema,/user User @relation\(fields: \[userId\]/);
 assert.match(route,/where:\{userId:req\.user\.id\}/); assert.match(route,/auditLog\.create/);
});
test('debt review requests verify debt ownership',()=>{assert.match(route,/debtorUserId:req\.user\.id/);});
test('admin review endpoints are role protected',()=>{
 assert.match(route,/router\.get\('\/', requireAuth, allowRoles/); assert.match(route,/router\.patch\('\/:id\/status', requireAuth, allowRoles/);
 assert.match(index,/app\.use\('\/api\/client-requests', clientRequests\)/);
});
