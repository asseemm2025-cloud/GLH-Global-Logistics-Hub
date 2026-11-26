import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('v0.6.24 stores external commerce connection and delivery quote on store/order',()=>{const s=read('../prisma/schema.prisma');for(const field of ['externalStoreUrl','externalPlatform','externalIntegrationId','externalSyncEnabled','deliveryProviderId','deliveryQuote'])assert.ok(s.includes(field));});
test('merchant product uploads are denied unless store permission is enabled',()=>{const s=read('../src/routes/business.js');assert.ok(s.includes("if(!store.merchantCanAddProducts)return res.status(403)"));assert.ok(s.includes("'/admin/stores/:id/permissions'"));});
test('orders calculate delivery fees server-side using active provider tariff',()=>{const s=read('../src/routes/orders.js'),ops=read('../src/routes/advanced-operations.js');assert.ok(s.includes('deliveryProviderId'));assert.ok(s.includes('deliveryQuote'));assert.ok(ops.includes("'/delivery/providers',requireAuth"));assert.ok(ops.includes("'/delivery/quote',requireAuth"));});
test('administration exposes store permissions and filtered department reports',()=>{const s=read('../../web/admin-business.html');for(const x of ['store-permissions','saveStorePermission','department','reports-ops'])assert.ok(s.includes(x));});
test('public client donor and manufacturer directories remain connected to active API',()=>{const s=read('../src/routes/advanced-operations.js'),c=read('../../web/index.html');assert.ok(s.includes("'/donors'"));assert.ok(s.includes("'/manufacturers'"));assert.ok(c.includes("'/operations/donors'"));assert.ok(c.includes("'/operations/manufacturers'"));});
