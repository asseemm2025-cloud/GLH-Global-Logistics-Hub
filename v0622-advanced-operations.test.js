import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('v0.6.22 persists donor, manufacturer, delivery and ecommerce report modules',()=>{const s=read('../prisma/schema.prisma');for(const m of ['model DonorOrganization','model Manufacturer','model DeliveryProvider','model EcommerceOrderReport'])assert.ok(s.includes(m));});
test('advanced operations APIs protect management and expose public active directories',()=>{const s=read('../src/routes/advanced-operations.js');for(const x of ["'/admin/donors',requireAuth,requirePermission('donors.manage')","'/admin/manufacturers',requireAuth,requirePermission('manufacturers.manage')","'/admin/delivery/providers',requireAuth,admin","'/delivery/quote',requireAuth","'/admin/reports/operations',requireAuth,admin"])assert.ok(s.includes(x));assert.ok(s.includes("where:{status:'ACTIVE'}"));assert.ok(s.includes("'/admin/integrations',requireAuth,admin"));});
test('product schema supports product image and promotional price',()=>{const s=read('../prisma/schema.prisma');for(const x of ['imageUrl','compareAtPrice','discountPercent'])assert.ok(s.includes(x));});
test('client and admin pages surface donor, manufacturer and delivery modules',()=>{const c=read('../../web/index.html'),a=read('../../web/admin-business.html');for(const x of ['إدارة المانحين','إدارة المصنعين'])assert.ok(c.includes(x));for(const x of ['donor-directory','manufacturers','delivery-ops','reports-ops','integrations-ops'])assert.ok(a.includes(x));});
