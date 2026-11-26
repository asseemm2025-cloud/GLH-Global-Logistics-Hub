import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('v0.6.x Prisma schema includes merchant moderation and mini portals',()=>{
 const s=read('server/prisma/schema.prisma');
 for(const name of ['MerchantProfile','MerchantConnection','MerchantPortal','ProductModerationStatus','Organization','OrganizationUnit','OrganizationEmployee','EnterpriseAsset']) assert.ok(s.includes(`model ${name} `)||s.includes(`enum ${name} `),`missing ${name}`);
 assert.match(s,/moderationStatus\s+ProductModerationStatus/);
});

test('registration distinguishes clients and merchants with required merchant details',()=>{
 const s=read('server/src/routes/auth.js');
 assert.match(s,/accountType:z\.enum\(\['CLIENT','MERCHANT'\]\)/);
 assert.match(s,/merchantApprovalRequired/);
 assert.match(s,/merchantProfile\.create/);
});

test('merchant product creation is protected and requires approved merchant and owned store',()=>{
 const s=read('server/src/routes/business.js');
 assert.match(s,/router\.post\('\/merchant\/products',requireAuth,merchantOnly/);
 assert.match(s,/profile\?\.status!=='APPROVED'/);
 assert.match(s,/ownerId:req\.user\.id,status:'ACTIVE'/);
 assert.match(s,/moderationStatus:'PENDING'/);
});

test('admin moderation, ERP, payments, providers, donations and debts routes exist',()=>{
 const s=read('server/src/routes/business.js');
 for(const route of ['/admin/merchants','/admin/products/pending','/organizations','/admin/payment-methods','/admin/providers','/admin/donation-campaigns','/admin/debts','/admin/debt-payments']) assert.ok(s.includes(route),`missing ${route}`);
});

test('customer and administration pages are shipped and linked',()=>{
 for(const f of ['web/merchant.html','web/admin-business.html','web/community.html']) assert.ok(fs.existsSync(path.join(root,f)),`missing ${f}`);
 const html=read('web/index.html');
 assert.ok(html.includes('/merchant.html')&&html.includes('/admin-business.html'));
});
