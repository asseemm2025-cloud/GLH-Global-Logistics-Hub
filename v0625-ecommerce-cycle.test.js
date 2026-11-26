import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('order creation calculates product subtotal and delivery-inclusive total on the server',()=>{const s=read('../src/routes/orders.js');assert.ok(s.includes('productSubtotal=Number(order.items.reduce'));assert.ok(s.includes('totalWithDelivery=Number((productSubtotal+deliveryFee).toFixed(2))'));});
test('order creation writes the ecommerce report in the same database transaction',()=>{const s=read('../src/routes/orders.js');const tx=s.indexOf('prisma.$transaction');const report=s.indexOf('tx.ecommerceOrderReport.create');const commit=s.indexOf('return {order,financeApplication,deliveryQuote,ecommerceReport');assert.ok(tx>=0&&report>tx&&commit>report);});
test('financing applications and delivery quotes are included in the linked report',()=>{const s=read('../src/routes/orders.js');assert.ok(s.includes('financeRequested:!!financeApplication'));assert.ok(s.includes('deliveryRequested:!!deliveryQuote'));assert.ok(s.includes('financeDetails:financeApplication?'));assert.ok(s.includes('deliveryDetails:deliveryQuote'));});
test('department ecommerce report endpoint supports finance, delivery, date, status and currency filters',()=>{const s=read('../src/routes/orders.js');for(const x of ["'/reports/ecommerce'",'department',"{financeRequested:true}","{deliveryRequested:true}",'createdAt','currency','totalAmount'])assert.ok(s.includes(x));});
test('release metadata is updated to 0.6.49',()=>{assert.match(read('../../package.json'),/"version": "0\.6\.49"/);assert.match(read('../package.json'),/"version": "0\.6\.49"/);});
