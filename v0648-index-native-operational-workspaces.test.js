import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const s=readFileSync(new URL('../../web/index.html',import.meta.url),'utf8');
test('index contains native operational field definitions and no iframe-only workspace',()=>{for(const k of ['investors','donors','donor-programs','donor-applications','manufacturers','manufacturer-catalog','manufacturer-inquiries','donations','debt','erp','portals','resources'])assert.ok(s.includes(k),k);assert.match(s,/function renderInlineOperationalWorkspace/);assert.match(s,/function inlineOpsField/);assert.doesNotMatch(s,/glhOpsAdminFrame/)});
test('admin records and client requests share central operations API',()=>{assert.match(s,/GLHApi\.createOperationalRecord/);assert.match(s,/GLHApi\.updateOperationalRecord/);assert.match(s,/GLHApi\.operationalRequests/);assert.match(s,/GLHApi\.submitOperationalRequest/);assert.match(s,/GLHApi\.updateOperationalRequest/)});
test('client can submit grant and manufacturer inquiry workflows',()=>{assert.match(s,/renderClientOperationalSubmission/);assert.match(s,/donor-applications/);assert.match(s,/manufacturer-inquiries/)});
