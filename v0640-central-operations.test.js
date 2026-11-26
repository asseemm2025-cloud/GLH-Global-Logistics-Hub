import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const schema=readFileSync(resolve(root,'server/prisma/schema.prisma'),'utf8');
const route=readFileSync(resolve(root,'server/src/routes/operations-hub.js'),'utf8');
const index=readFileSync(resolve(root,'server/src/index.js'),'utf8');
const bridge=readFileSync(resolve(root,'web/glh-api.js'),'utf8');
const workspace=readFileSync(resolve(root,'web/admin-operations.html'),'utf8');
test('central operational records and client requests are PostgreSQL-backed',()=>{
 assert.match(schema,/model OperationalRecord/); assert.match(schema,/model OperationalRequest/); assert.match(schema,/model OperationalRequestHistory/);
 assert.match(index,/app.use\('\/api\/operations-hub', operationsHub\)/);
 assert.match(route,/requireAuth/); assert.match(route,/allowRoles/); assert.match(route,/SUBMIT_OPERATIONAL_REQUEST/); assert.match(route,/STATUS_CHANGED/);
});
test('admin operations workspace uses central API instead of localStorage',()=>{
 assert.match(bridge,/operationalRecords/); assert.match(bridge,/submitOperationalRequest/); assert.match(bridge,/myOperationalRequests/);
 assert.match(workspace,/api.operationalRecords/); assert.match(workspace,/api.createOperationalRecord/); assert.doesNotMatch(workspace,/localStorage\.setItem\('glh_rebuild_db'/);
});
