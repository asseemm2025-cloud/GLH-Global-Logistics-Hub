import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const client = readFileSync(join(root, 'web', 'index.html'), 'utf8');
const merchant = readFileSync(join(root, 'web', 'merchant.html'), 'utf8');
test('v0.6.20 client service request selects active delivery companies',()=>{
 assert.match(client,/cLocalCarrier[\s\S]{0,350}db\.delivery\.filter\(x=>x\.active\)/);
});
test('marketplace filters products by store and category',()=>{
 assert.match(client,/id="marketStore"/); assert.match(client,/data-store=/); assert.match(client,/x\.dataset\.store===st/);
});
test('merchant registration route defaults account type to merchant',()=>{
 assert.match(merchant,/qs\.get\('role'\)==='merchant'/); assert.match(merchant,/value='MERCHANT'/);
});
test('client ecommerce checkout reveals international transfer type and financing bank',()=>{
 assert.match(client,/ecTransferTypeWrap/); assert.match(client,/ecFinanceBankWrap/); assert.match(client,/toggleEcomPaymentFields/);
});
test('financing administration configures banks and products can reference a bank',()=>{
 assert.match(client,/addFinancingBank/); assert.match(client,/finProdBank/); assert.match(client,/bank:document\.getElementById\('finProdBank'\)/);
});
test('client finance request is available under services and administration sees advanced client requests',()=>{
 assert.match(client,/clientCurrent==='financeRequest'/); assert.match(client,/glh_platform_client_requests/);
});
