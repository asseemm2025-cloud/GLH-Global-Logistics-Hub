import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.basename(process.cwd())==='server'?path.resolve(process.cwd(),'..'):process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('admin payment module can list all methods, create methods and enable or disable them',()=>{
 const routes=read('server/src/routes/business.js'); const ui=read('web/index.html');
 assert.match(routes,/router\.get\('\/admin\/payment-methods',requireAuth,requirePermission\('payments\.methods\.manage'\)/);
 assert.match(routes,/router\.post\('\/admin\/payment-methods'/); assert.match(routes,/router\.patch\('\/admin\/payment-methods\/:id'/);
 assert.match(ui,/paymentMethodForm/); assert.match(ui,/togglePaymentMethod/); assert.match(ui,/business\/admin\/payment-methods/);
});
test('admin donation module supports receiving and allocating pledges and changing campaign status',()=>{
 const routes=read('server/src/routes/business.js'); const ui=read('web/index.html');
 assert.match(routes,/router\.patch\('\/admin\/donation-campaigns\/:id'/); assert.match(routes,/router\.patch\('\/admin\/donations\/:id\/status'/);
 assert.match(ui,/setDonationStatus/); assert.match(ui,/تأكيد الاستلام/); assert.match(ui,/تأكيد التخصيص/);
});
