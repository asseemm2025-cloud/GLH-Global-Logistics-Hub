import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();
const id = z.string().min(1);
const clean = value => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).map(([k,v])=>[k,v === '' ? undefined : v])) : value;
const money = z.coerce.number().positive().max(1_000_000_000);
const audit = async (req, action, entity, entityId, details={}) => prisma.auditLog.create({data:{userId:req.user.id,action,entity,entityId,details}});
const adminOnly = (req,res,next) => ['ADMIN','OPS','FINANCE'].includes(req.user?.role) ? next() : res.status(403).json({error:'هذه الخدمة مخصصة للإدارة'});
const merchantOnly = (req,res,next) => req.user?.role === 'MERCHANT' ? next() : res.status(403).json({error:'هذه الخدمة متاحة لحسابات التجار المعتمدة فقط'});
const safeMerchant = p => ({id:p.id,businessName:p.businessName,businessType:p.businessType,businessCategory:p.businessCategory,legalForm:p.legalForm,productCategories:p.productCategories,estimatedMonthlyOrders:p.estimatedMonthlyOrders,hasCommercialRegistration:p.hasCommercialRegistration,shippingCapability:p.shippingCapability,returnPolicy:p.returnPolicy,status:p.status,country:p.country,city:p.city,registrationNumber:p.registrationNumber,reviewNote:p.reviewNote});

// Public catalogue: only approved and published products are visible to customers.
router.get('/marketplace/products', async (req,res) => {
  const q=String(req.query.q||'').trim().slice(0,100);
  const category=String(req.query.category||'').trim().slice(0,80);
  const rows=await prisma.product.findMany({where:{published:true,moderationStatus:'APPROVED',store:{status:'ACTIVE'},...(category?{category}:{}),...(q?{OR:[{name:{contains:q,mode:'insensitive'}},{description:{contains:q,mode:'insensitive'}},{category:{contains:q,mode:'insensitive'}}]}:{})},include:{store:{select:{id:true,name:true,country:true,city:true}}},orderBy:{createdAt:'desc'},take:100});
  res.json(rows);
});
router.get('/marketplace/products/:id', async (req,res) => {
  const x=await prisma.product.findFirst({where:{id:req.params.id,published:true,moderationStatus:'APPROVED',store:{status:'ACTIVE'}},include:{store:{select:{id:true,name:true,country:true,city:true,description:true}}}});
  if(!x)return res.status(404).json({error:'المنتج غير متاح'}); res.json(x);
});
router.post('/marketplace/products/:id/inquiries',requireAuth,async(req,res)=>{
  if(req.user.role!=='CLIENT')return res.status(403).json({error:'تقديم استفسار شراء متاح لحساب العميل'});
  const p=z.object({quantity:z.coerce.number().int().min(1).max(100000),message:z.string().max(2000).optional()}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات الاستفسار غير صحيحة'});
  const product=await prisma.product.findFirst({where:{id:req.params.id,published:true,moderationStatus:'APPROVED',store:{status:'ACTIVE'}},include:{store:true}});
  if(!product)return res.status(404).json({error:'المنتج غير متاح'});
  const inquiry=await prisma.merchantInquiry.create({data:{reference:`GLHI-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,productId:product.id,customerId:req.user.id,merchantUserId:product.store.ownerId,...p.data}});
  await audit(req,'CREATE_MARKETPLACE_INQUIRY','MerchantInquiry',inquiry.id,{productId:product.id});
  res.status(201).json({inquiry,message:'تم إرسال استفسارك إلى التاجر'});
});
router.get('/marketplace/inquiries/mine',requireAuth,async(req,res)=>res.json(await prisma.merchantInquiry.findMany({where:{customerId:req.user.id},include:{product:{select:{name:true,price:true,currency:true}},merchant:{select:{fullName:true}}},orderBy:{createdAt:'desc'}})));

// Merchant onboarding and connection to the GLH marketplace.
router.get('/merchant/me', requireAuth, merchantOnly, async (req,res) => {
  const profile = await prisma.merchantProfile.findUnique({where:{userId:req.user.id}});
  if (!profile) return res.status(404).json({error:'ملف التاجر غير موجود'});
  res.json(safeMerchant(profile));
});
router.get('/merchant/connections', requireAuth, merchantOnly, async (req,res) => res.json(await prisma.merchantConnection.findMany({where:{merchantUserId:req.user.id},orderBy:{createdAt:'desc'}})));
router.post('/merchant/connections', requireAuth, merchantOnly, async (req,res) => {
  const p=z.object({externalStoreUrl:z.string().url().optional(),integrationType:z.enum(['GLH_STORE','EXTERNAL_STORE','API']).default('GLH_STORE'),requestedScopes:z.array(z.enum(['PRODUCT_READ','PRODUCT_WRITE','ORDER_READ','ORDER_UPDATE','INVENTORY_READ'])).default(['PRODUCT_READ','PRODUCT_WRITE'])}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات الربط غير صحيحة',details:p.error.flatten()});
  const profile=await prisma.merchantProfile.findUnique({where:{userId:req.user.id}});
  if(!profile || profile.status!=='APPROVED')return res.status(403).json({error:'يجب اعتماد ملف التاجر أولاً'});
  const x=await prisma.merchantConnection.create({data:{merchantUserId:req.user.id,...p.data}});
  await audit(req,'REQUEST_CONNECTION','MerchantConnection',x.id);
  res.status(201).json(x);
});

// Platform-admin controls for merchant store integrations and product-upload permission.
router.patch('/admin/stores/:id/permissions',requireAuth,requirePermission('merchant.connections.manage'),async(req,res)=>{
 const p=z.object({merchantCanAddProducts:z.boolean(),connectionEnabled:z.boolean().optional(),externalStoreUrl:z.string().url().optional().or(z.literal('')),externalPlatform:z.string().max(80).optional(),externalIntegrationId:z.string().optional(),externalSyncEnabled:z.boolean().optional()}).safeParse(clean(req.body));
 if(!p.success)return res.status(400).json({error:'إعدادات المتجر غير صحيحة'});
 if(p.data.externalIntegrationId){const i=await prisma.integrationEndpoint.findUnique({where:{id:p.data.externalIntegrationId}});if(!i)return res.status(400).json({error:'جهة التكامل غير موجودة'});}
 const x=await prisma.store.update({where:{id:req.params.id},data:p.data});await audit(req,'UPDATE_STORE_PERMISSIONS','Store',x.id,p.data);res.json(x);
});
router.get('/admin/stores',requireAuth,requirePermission('merchant.connections.view'),async(_req,res)=>res.json(await prisma.store.findMany({include:{owner:{select:{fullName:true,username:true}},_count:{select:{products:true}}},orderBy:{createdAt:'desc'}})));

router.get('/merchant/stores',requireAuth,merchantOnly,async(req,res)=>res.json(await prisma.store.findMany({where:{ownerId:req.user.id},orderBy:{createdAt:'desc'}})));
router.post('/merchant/stores', requireAuth, merchantOnly, async(req,res)=>{
  const p=z.object({name:z.string().min(2).max(120),country:z.string().min(2),city:z.string().optional(),description:z.string().optional()}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات المتجر غير صحيحة'});
  const profile=await prisma.merchantProfile.findUnique({where:{userId:req.user.id}});
  if(profile?.status!=='APPROVED')return res.status(403).json({error:'لا يمكن إنشاء متجر قبل اعتماد التاجر'});
  const x=await prisma.store.create({data:{ownerId:req.user.id,name:p.data.name,country:p.data.country,city:p.data.city,description:p.data.description,status:'ACTIVE',connectionEnabled:true}});
  await audit(req,'CREATE_STORE','Store',x.id);
  res.status(201).json(x);
});
router.get('/merchant/products',requireAuth,merchantOnly,async(req,res)=>res.json(await prisma.product.findMany({where:{store:{ownerId:req.user.id}},include:{store:{select:{name:true}}},orderBy:{createdAt:'desc'}})));
router.post('/merchant/products',requireAuth,merchantOnly,async(req,res)=>{
  const p=z.object({storeId:id,name:z.string().min(2).max(180),description:z.string().max(4000).optional(),category:z.string().max(100).optional(),price:money,currency:z.string().length(3).default('USD'),stock:z.coerce.number().int().min(0).default(0)}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات المنتج غير صحيحة',details:p.error.flatten()});
  const profile=await prisma.merchantProfile.findUnique({where:{userId:req.user.id}});
  if(profile?.status!=='APPROVED')return res.status(403).json({error:'حساب التاجر بانتظار الاعتماد أو غير معتمد'});
  const store=await prisma.store.findFirst({where:{id:p.data.storeId,ownerId:req.user.id,status:'ACTIVE'}});
  if(!store)return res.status(404).json({error:'المتجر غير موجود أو غير تابع لحسابك'});
  if(!store.merchantCanAddProducts)return res.status(403).json({error:'صلاحية إضافة المنتجات غير مفعلة لهذا المتجر'});
  const x=await prisma.product.create({data:{...p.data,published:false,moderationStatus:'PENDING'}});
  await audit(req,'SUBMIT_PRODUCT','Product',x.id,{storeId:store.id});
  res.status(201).json({product:x,message:'تم إرسال المنتج للمراجعة ولن يظهر للعملاء قبل الموافقة'});
});
router.post('/merchant/portals',requireAuth,merchantOnly,async(req,res)=>{
  const p=z.object({storeId:id,name:z.string().min(2).max(120),slug:z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),branding:z.record(z.any()).optional(),settings:z.record(z.any()).optional()}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات البوابة المصغرة غير صحيحة'});
  const profile=await prisma.merchantProfile.findUnique({where:{userId:req.user.id}});
  if(profile?.status!=='APPROVED')return res.status(403).json({error:'يجب اعتماد التاجر أولاً'});
  const store=await prisma.store.findFirst({where:{id:p.data.storeId,ownerId:req.user.id}});
  if(!store)return res.status(404).json({error:'المتجر غير تابع لك'});
  const portal=await prisma.merchantPortal.create({data:{...p.data,merchantUserId:req.user.id,status:'PENDING'}});
  await audit(req,'CREATE_MERCHANT_PORTAL','MerchantPortal',portal.id);
  res.status(201).json({portal,message:'تم إنشاء طلب البوابة المصغرة وإرساله للموافقة'});
});
router.get('/merchant/portals',requireAuth,merchantOnly,async(req,res)=>res.json(await prisma.merchantPortal.findMany({where:{merchantUserId:req.user.id},orderBy:{createdAt:'desc'}})));

router.get('/merchant/inquiries',requireAuth,merchantOnly,async(req,res)=>res.json(await prisma.merchantInquiry.findMany({where:{merchantUserId:req.user.id},include:{product:{select:{name:true,price:true,currency:true}},customer:{select:{fullName:true,phone:true,email:true}}},orderBy:{createdAt:'desc'}})));
router.patch('/merchant/inquiries/:id/respond',requireAuth,merchantOnly,async(req,res)=>{
 const p=z.object({status:z.enum(['IN_PROGRESS','RESPONDED','CLOSED']),merchantReply:z.string().max(2000).optional()}).safeParse(clean(req.body));
 if(!p.success)return res.status(400).json({error:'بيانات الرد غير صحيحة'});
 const old=await prisma.merchantInquiry.findFirst({where:{id:req.params.id,merchantUserId:req.user.id}});
 if(!old)return res.status(404).json({error:'الاستفسار غير موجود'});
 const x=await prisma.merchantInquiry.update({where:{id:old.id},data:p.data}); await audit(req,'RESPOND_MARKETPLACE_INQUIRY','MerchantInquiry',x.id,{status:x.status}); res.json(x);
});
router.get('/admin/marketplace/inquiries',requireAuth,requirePermission('products.view'),async(_req,res)=>res.json(await prisma.merchantInquiry.findMany({include:{product:{select:{name:true}},customer:{select:{fullName:true}},merchant:{select:{fullName:true}}},orderBy:{createdAt:'desc'},take:500})));
router.get('/admin/summary',requireAuth,requirePermission('workspace.view'),async(_req,res)=>{
 const [merchantsPending,productsPending,connectionsPending,portalsPending,inquiriesNew,organizations,paymentMethods,providersPending]=await Promise.all([
 prisma.merchantProfile.count({where:{status:'PENDING'}}),prisma.product.count({where:{moderationStatus:'PENDING'}}),prisma.merchantConnection.count({where:{status:'PENDING'}}),prisma.merchantPortal.count({where:{status:'PENDING'}}),prisma.merchantInquiry.count({where:{status:'NEW'}}),prisma.organization.count(),prisma.paymentMethod.count({where:{enabled:true}}),prisma.professionalProvider.count({where:{status:'PENDING'}})]);
 res.json({merchantsPending,productsPending,connectionsPending,portalsPending,inquiriesNew,organizations,paymentMethods,providersPending});
});

// Administrative moderation and merchant approval.
router.get('/admin/merchants',requireAuth,requirePermission('merchants.review'),async(req,res)=>res.json(await prisma.merchantProfile.findMany({include:{user:{select:{id:true,username:true,fullName:true,email:true,phone:true}}},orderBy:{createdAt:'desc'}})));
router.patch('/admin/merchants/:id/review',requireAuth,requirePermission('merchants.review'),async(req,res)=>{
  const p=z.object({status:z.enum(['APPROVED','REJECTED','SUSPENDED']),reviewNote:z.string().max(2000).optional()}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'قرار المراجعة غير صحيح'});
  const x=await prisma.merchantProfile.update({where:{id:req.params.id},data:{...p.data,reviewedBy:req.user.id,reviewedAt:new Date()}});
  await prisma.user.update({where:{id:x.userId},data:{role:'MERCHANT'}});
  await audit(req,'REVIEW_MERCHANT','MerchantProfile',x.id,p.data);
  res.json(safeMerchant(x));
});
router.get('/admin/products/pending',requireAuth,requirePermission('products.moderate'),async(_req,res)=>res.json(await prisma.product.findMany({where:{moderationStatus:'PENDING'},include:{store:{select:{name:true,owner:{select:{fullName:true}}}},},orderBy:{createdAt:'asc'}})));
router.patch('/admin/products/:id/review',requireAuth,requirePermission('products.moderate'),async(req,res)=>{
  const p=z.object({decision:z.enum(['APPROVED','REJECTED']),note:z.string().max(2000).optional()}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'قرار نشر المنتج غير صحيح'});
  const x=await prisma.product.update({where:{id:req.params.id},data:{moderationStatus:p.data.decision,published:p.data.decision==='APPROVED',moderationNote:p.data.note||null}});
  await audit(req,'MODERATE_PRODUCT','Product',x.id,p.data);
  res.json(x);
});
router.get('/admin/connections',requireAuth,requirePermission('merchant.connections.view'),async(_req,res)=>res.json(await prisma.merchantConnection.findMany({orderBy:{createdAt:'desc'}})));
router.patch('/admin/connections/:id/approve',requireAuth,requirePermission('merchant.connections.approve'),async(req,res)=>{
  const p=z.object({approvedScopes:z.array(z.string()).default([]),status:z.enum(['APPROVED','REJECTED','SUSPENDED'])}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات اعتماد الربط غير صحيحة'});
  const x=await prisma.merchantConnection.update({where:{id:req.params.id},data:{status:p.data.status,approvedScopes:p.data.approvedScopes,approvedBy:req.user.id,approvedAt:new Date()}});
  await audit(req,'REVIEW_MERCHANT_CONNECTION','MerchantConnection',x.id,p.data);
  res.json(x);
});
router.get('/admin/portals',requireAuth,requirePermission('merchant.portals.view'),async(_req,res)=>res.json(await prisma.merchantPortal.findMany({include:{store:{select:{name:true}},},orderBy:{createdAt:'desc'}})));
router.patch('/admin/portals/:id/review',requireAuth,requirePermission('merchant.portals.approve'),async(req,res)=>{
  const p=z.object({status:z.enum(['ACTIVE','REJECTED','SUSPENDED'])}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'الحالة غير صحيحة'});
  const x=await prisma.merchantPortal.update({where:{id:req.params.id},data:p.data});
  await audit(req,'REVIEW_PORTAL','MerchantPortal',x.id,p.data);
  res.json(x);
});

// ERP: organizations, departments, staff and assets.
router.get('/organizations',requireAuth,requirePermission('enterprise.view'),async(_req,res)=>res.json(await prisma.organization.findMany({include:{_count:{select:{units:true,employees:true,assets:true}}},orderBy:{createdAt:'desc'}})));
router.post('/organizations',requireAuth,requirePermission('enterprise.manage'),async(req,res)=>{
  const p=z.object({name:z.string().min(2),legalName:z.string().optional(),organizationType:z.string().min(2),registrationNumber:z.string().optional(),taxNumber:z.string().optional(),country:z.string().min(2),city:z.string().optional(),address:z.string().optional(),email:z.string().email().optional(),phone:z.string().optional(),website:z.string().url().optional(),currency:z.string().length(3).default('USD')}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات الجهة غير صحيحة'});
  const x=await prisma.organization.create({data:p.data}); await audit(req,'CREATE','Organization',x.id); res.status(201).json(x);
});
router.get('/organizations/:id',requireAuth,requirePermission('enterprise.view'),async(req,res)=>{
  const x=await prisma.organization.findUnique({where:{id:req.params.id},include:{units:true,employees:true,assets:true}});
  if(!x)return res.status(404).json({error:'الجهة غير موجودة'}); res.json(x);
});
for (const [pathName,model,fields] of [
  ['units','organizationUnit',z.object({organizationId:id,parentId:z.string().optional(),name:z.string().min(2),unitType:z.string().min(2),managerName:z.string().optional(),email:z.string().email().optional(),phone:z.string().optional(),location:z.string().optional(),budget:z.coerce.number().nonnegative().optional()})],
  ['employees','organizationEmployee',z.object({organizationId:id,employeeNo:z.string().optional(),fullName:z.string().min(2),jobTitle:z.string().optional(),department:z.string().optional(),email:z.string().email().optional(),phone:z.string().optional(),employmentType:z.string().optional(),salary:z.coerce.number().nonnegative().optional()})],
  ['assets','enterpriseAsset',z.object({organizationId:id,assetCode:z.string().optional(),name:z.string().min(2),assetType:z.string().min(2),serialNumber:z.string().optional(),location:z.string().optional(),purchaseCost:z.coerce.number().nonnegative().optional(),currency:z.string().length(3).default('USD')})]
]) {
  router.post(`/organizations/:id/${pathName}`,requireAuth,requirePermission('enterprise.manage'),async(req,res)=>{
    const parsed=fields.safeParse({...req.body,organizationId:req.params.id}); if(!parsed.success)return res.status(400).json({error:'البيانات غير صحيحة'});
    const org=await prisma.organization.findUnique({where:{id:req.params.id}}); if(!org)return res.status(404).json({error:'الجهة غير موجودة'});
    const x=await prisma[model].create({data:parsed.data}); await audit(req,'CREATE',model,x.id); res.status(201).json(x);
  });
}

// Payment methods and transaction ledger. No live charge is made by these endpoints.
router.get('/payment-methods',async(_req,res)=>res.json(await prisma.paymentMethod.findMany({where:{enabled:true},select:{id:true,code:true,nameAr:true,nameEn:true,type:true,providerName:true,country:true,currencies:true,feeFixed:true,feePercent:true,minAmount:true,maxAmount:true,settlementPeriod:true,instructions:true},orderBy:{type:'asc'}})));
router.get('/admin/payment-methods',requireAuth,requirePermission('payments.methods.manage'),async(_req,res)=>res.json(await prisma.paymentMethod.findMany({orderBy:[{enabled:'desc'},{type:'asc'},{nameAr:'asc'}]})));
router.post('/admin/payment-methods',requireAuth,requirePermission('payments.methods.manage'),async(req,res)=>{
  const p=z.object({code:z.string().min(2).max(40).regex(/^[A-Z0-9_-]+$/),nameAr:z.string().min(2),nameEn:z.string().optional(),type:z.enum(['CASH','BANK_TRANSFER','CARD','MOBILE_WALLET','QR','PAYMENT_LINK','DIRECT_DEBIT','CASH_ON_DELIVERY','ESCROW','OTHER']),providerName:z.string().optional(),country:z.string().optional(),currencies:z.array(z.string().length(3)).default(['USD']),feeFixed:z.coerce.number().nonnegative().optional(),feePercent:z.coerce.number().nonnegative().optional(),minAmount:z.coerce.number().nonnegative().optional(),maxAmount:z.coerce.number().positive().optional(),settlementPeriod:z.string().optional(),instructions:z.string().optional(),enabled:z.boolean().default(true)}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات وسيلة الدفع غير صحيحة'});
  const x=await prisma.paymentMethod.create({data:p.data}); await audit(req,'CREATE','PaymentMethod',x.id); res.status(201).json(x);
});
router.patch('/admin/payment-methods/:id',requireAuth,requirePermission('payments.methods.manage'),async(req,res)=>{
  const p=z.object({enabled:z.boolean().optional(),instructions:z.string().optional(),feeFixed:z.coerce.number().nonnegative().optional(),feePercent:z.coerce.number().nonnegative().optional(),settlementPeriod:z.string().optional()}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات التحديث غير صحيحة'}); const x=await prisma.paymentMethod.update({where:{id:req.params.id},data:p.data}); await audit(req,'UPDATE','PaymentMethod',x.id,p.data); res.json(x);
});
router.post('/payment-transactions',requireAuth,async(req,res)=>{
  const p=z.object({paymentMethodId:id,relatedEntityType:z.string().optional(),relatedEntityId:z.string().optional(),amount:money,currency:z.string().length(3).default('USD'),idempotencyKey:z.string().min(8).max(100)}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات عملية الدفع غير صحيحة'});
  const method=await prisma.paymentMethod.findFirst({where:{id:p.data.paymentMethodId,enabled:true}}); if(!method)return res.status(404).json({error:'وسيلة الدفع غير متاحة'});
  const prior=await prisma.paymentTransaction.findUnique({where:{idempotencyKey:p.data.idempotencyKey}}); if(prior)return res.json(prior);
  const x=await prisma.paymentTransaction.create({data:{...p.data,userId:req.user.id,reference:`GLHP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`}});
  await audit(req,'INITIATE_PAYMENT','PaymentTransaction',x.id,{amount:p.data.amount,currency:p.data.currency});
  res.status(201).json({transaction:x,execution:'NOT_CHARGED',message:'تم إنشاء سجل عملية الدفع فقط؛ يلزم ربط مزود الدفع المعتمد لتنفيذ الخصم الفعلي'});
});
router.get('/payment-transactions/mine',requireAuth,async(req,res)=>res.json(await prisma.paymentTransaction.findMany({where:{userId:req.user.id},include:{paymentMethod:{select:{nameAr:true,type:true}}},orderBy:{createdAt:'desc'}})));
router.get('/admin/payment-transactions',requireAuth,requirePermission('payments.transactions.view'),async(_req,res)=>res.json(await prisma.paymentTransaction.findMany({include:{paymentMethod:{select:{nameAr:true,type:true}}},orderBy:{createdAt:'desc'},take:500})));

// Professional service directory: investors, donors, lenders, collectors, lawyers, China-market brokers.
router.get('/providers',async(req,res)=>{
  const category=z.enum(['INVESTOR','DONOR','LENDER','DEBT_COLLECTOR','LAWYER','CHINA_MARKET_BROKER']).optional().safeParse(req.query.category);
  if(!category.success)return res.status(400).json({error:'تصنيف مقدم الخدمة غير صحيح'});
  res.json(await prisma.professionalProvider.findMany({where:{status:'VERIFIED',...(category.data?{category:category.data}:{})},select:{id:true,providerNo:true,category:true,name:true,organizationName:true,country:true,city:true,serviceAreas:true,specialties:true,languages:true,contactName:true,email:true,phone:true,website:true,rating:true},orderBy:{name:'asc'}}));
});
router.get('/admin/providers',requireAuth,requirePermission('providers.manage'),async(_req,res)=>res.json(await prisma.professionalProvider.findMany({orderBy:{createdAt:'desc'}})));
router.post('/admin/providers',requireAuth,requirePermission('providers.manage'),async(req,res)=>{
  const p=z.object({category:z.enum(['INVESTOR','DONOR','LENDER','DEBT_COLLECTOR','LAWYER','CHINA_MARKET_BROKER']),name:z.string().min(2),organizationName:z.string().optional(),country:z.string().optional(),city:z.string().optional(),serviceAreas:z.array(z.string()).default([]),specialties:z.array(z.string()).default([]),languages:z.array(z.string()).default([]),contactName:z.string().optional(),email:z.string().email().optional(),phone:z.string().optional(),website:z.string().url().optional(),licenseNumber:z.string().optional()}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات مقدم الخدمة غير صحيحة'});
  const x=await prisma.professionalProvider.create({data:{...p.data,providerNo:`GLHPRO-${crypto.randomBytes(5).toString('hex').toUpperCase()}`}}); await audit(req,'CREATE','ProfessionalProvider',x.id); res.status(201).json(x);
});
router.patch('/admin/providers/:id/status',requireAuth,requirePermission('providers.manage'),async(req,res)=>{
  const p=z.object({status:z.enum(['PENDING','VERIFIED','SUSPENDED','REJECTED'])}).safeParse(clean(req.body)); if(!p.success)return res.status(400).json({error:'الحالة غير صحيحة'});
  const x=await prisma.professionalProvider.update({where:{id:req.params.id},data:p.data}); await audit(req,'UPDATE_STATUS','ProfessionalProvider',x.id,p.data); res.json(x);
});
router.post('/admin/providers/:id/engagements',requireAuth,requirePermission('providers.manage'),async(req,res)=>{
  const p=z.object({clientName:z.string().min(2),serviceType:z.string().min(2),description:z.string().optional(),agreedAmount:z.coerce.number().nonnegative().optional(),currency:z.string().length(3).default('USD'),dueDate:z.coerce.date().optional()}).safeParse(clean(req.body)); if(!p.success)return res.status(400).json({error:'بيانات التكليف غير صحيحة'});
  const x=await prisma.providerEngagement.create({data:{...p.data,providerId:req.params.id}}); await audit(req,'CREATE','ProviderEngagement',x.id); res.status(201).json(x);
});

// Donation campaigns and debt repayment tracking.
router.get('/donation-campaigns',async(_req,res)=>res.json(await prisma.donationCampaign.findMany({where:{status:'ACTIVE'},orderBy:{createdAt:'desc'}})));
router.post('/admin/donation-campaigns',requireAuth,requirePermission('donations.manage'),async(req,res)=>{
  const p=z.object({code:z.string().min(3).max(40).regex(/^[A-Z0-9_-]+$/),title:z.string().min(3),description:z.string().optional(),beneficiaryName:z.string().optional(),targetAmount:z.coerce.number().positive().optional(),currency:z.string().length(3).default('USD'),startDate:z.coerce.date().optional(),endDate:z.coerce.date().optional(),status:z.enum(['DRAFT','ACTIVE','CLOSED']).default('DRAFT')}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات حملة التبرع غير صحيحة'}); const x=await prisma.donationCampaign.create({data:p.data}); await audit(req,'CREATE','DonationCampaign',x.id); res.status(201).json(x);
});
router.patch('/admin/donation-campaigns/:id',requireAuth,requirePermission('donations.manage'),async(req,res)=>{
  const p=z.object({status:z.enum(['DRAFT','ACTIVE','CLOSED']),description:z.string().max(5000).optional(),endDate:z.coerce.date().nullable().optional()}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات تحديث الحملة غير صحيحة'});
  const x=await prisma.donationCampaign.update({where:{id:req.params.id},data:p.data}); await audit(req,'UPDATE_DONATION_CAMPAIGN','DonationCampaign',x.id,p.data); res.json(x);
});
router.post('/donations',async(req,res)=>{
  const p=z.object({campaignId:id,donorName:z.string().optional(),amount:money,currency:z.string().length(3).default('USD'),anonymous:z.boolean().default(false),notes:z.string().optional()}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات التبرع غير صحيحة'}); const campaign=await prisma.donationCampaign.findFirst({where:{id:p.data.campaignId,status:'ACTIVE'}}); if(!campaign)return res.status(404).json({error:'الحملة غير متاحة'});
  const x=await prisma.donation.create({data:{...p.data,donorUserId:req.user?.id||null,reference:`GLHD-${crypto.randomBytes(8).toString('hex').toUpperCase()}`}});
  res.status(201).json({donation:x,paymentRequired:true,message:'تم تسجيل تعهد التبرع؛ لا يعتبر المبلغ مستلماً قبل تأكيد التحصيل'});
});
router.get('/admin/donations',requireAuth,requirePermission('donations.manage'),async(_req,res)=>res.json(await prisma.donation.findMany({include:{campaign:true},orderBy:{createdAt:'desc'}})));
router.patch('/admin/donations/:id/status',requireAuth,requirePermission('donations.manage'),async(req,res)=>{
  const p=z.object({status:z.enum(['PLEDGED','RECEIVED','ALLOCATED','CANCELLED']),receiptNumber:z.string().optional()}).safeParse(clean(req.body)); if(!p.success)return res.status(400).json({error:'حالة التبرع غير صحيحة'});
  const prior=await prisma.donation.findUnique({where:{id:req.params.id}}); if(!prior)return res.status(404).json({error:'التبرع غير موجود'});if(prior.status==='RECEIVED'&&p.data.status!=='ALLOCATED')return res.status(409).json({error:'التبرع المستلم لا يمكن إرجاعه إلى حالة سابقة'});if(prior.status==='ALLOCATED'&&p.data.status!=='ALLOCATED')return res.status(409).json({error:'تم تخصيص التبرع ولا يمكن تغيير حالته إلى الوراء'});
  const x=await prisma.$transaction(async tx=>{const updated=await tx.donation.update({where:{id:req.params.id},data:p.data});if(p.data.status==='RECEIVED'&&prior.status!=='RECEIVED')await tx.donationCampaign.update({where:{id:prior.campaignId},data:{receivedAmount:{increment:prior.amount}}});return updated;});
  await audit(req,'UPDATE_DONATION','Donation',x.id,p.data); res.json(x);
});
router.get('/debts/mine',requireAuth,async(req,res)=>res.json(await prisma.debtAccount.findMany({where:{debtorUserId:req.user.id},include:{payments:true},orderBy:{createdAt:'desc'}})));
router.post('/debts/:id/payment-intents',requireAuth,async(req,res)=>{
  const p=z.object({amount:money,currency:z.string().length(3).default('USD'),paymentMethod:z.string().optional(),notes:z.string().max(1000).optional()}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات طلب سداد الدين غير صحيحة'});
  const debt=await prisma.debtAccount.findFirst({where:{id:req.params.id,debtorUserId:req.user.id}});if(!debt)return res.status(404).json({error:'الدين غير مرتبط بحسابك'});
  const outstanding=Number(debt.principalAmount)-Number(debt.paidAmount);if(p.data.amount>outstanding)return res.status(409).json({error:'المبلغ يتجاوز الرصيد المتبقي',outstanding});
  const x=await prisma.debtPayment.create({data:{...p.data,debtId:debt.id,reference:`GLHDP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,status:'PENDING'}});
  res.status(201).json({payment:x,execution:'PENDING_CONFIRMATION',message:'تم تسجيل طلب السداد. لا يتغير رصيد الدين حتى تأكيد استلام المبلغ من الإدارة أو مزود الدفع.'});
});
router.patch('/admin/debt-payments/:id/confirm',requireAuth,requirePermission('debts.manage'),async(req,res)=>{
  const p=z.object({status:z.enum(['RECEIVED','REJECTED']),receiptNumber:z.string().optional()}).safeParse(clean(req.body));if(!p.success)return res.status(400).json({error:'حالة طلب السداد غير صحيحة'});
  const prior=await prisma.debtPayment.findUnique({where:{id:req.params.id},include:{debt:true}});if(!prior)return res.status(404).json({error:'طلب السداد غير موجود'});
  if(prior.status!=='PENDING')return res.status(409).json({error:'لا يمكن تعديل طلب السداد بعد مراجعته'});
  const result=await prisma.$transaction(async tx=>{const payment=await tx.debtPayment.update({where:{id:prior.id},data:{status:p.data.status,receiptNumber:p.data.receiptNumber}});let updatedDebt=await tx.debtAccount.findUnique({where:{id:prior.debtId}});if(p.data.status==='RECEIVED'){const outstanding=Number(updatedDebt.principalAmount)-Number(updatedDebt.paidAmount);if(Number(prior.amount)>outstanding)throw Object.assign(new Error('مبلغ طلب السداد يتجاوز الرصيد المتبقي'),{code:'OVERPAYMENT'});const paid=Number(updatedDebt.paidAmount)+Number(prior.amount);updatedDebt=await tx.debtAccount.update({where:{id:prior.debtId},data:{paidAmount:paid,status:paid>=Number(updatedDebt.principalAmount)?'SETTLED':'PARTIALLY_PAID'}});}return {payment,debt:updatedDebt};},{isolationLevel:'Serializable'}).catch(error=>{if(error.code==='OVERPAYMENT')return {error:error.message};throw error;});
  if(result.error)return res.status(409).json({error:result.error});
  await audit(req,'CONFIRM_DEBT_PAYMENT','DebtPayment',prior.id,p.data);res.json(result);
});
router.post('/admin/debts',requireAuth,requirePermission('debts.manage'),async(req,res)=>{
  const p=z.object({debtorName:z.string().min(2),debtorUserId:z.string().optional(),debtorPhone:z.string().optional(),debtorEmail:z.string().email().optional(),creditorName:z.string().min(2),description:z.string().optional(),principalAmount:money,currency:z.string().length(3).default('USD'),dueDate:z.coerce.date().optional(),assignedCollectorId:z.string().optional(),legalProviderId:z.string().optional(),agreement:z.record(z.any()).optional()}).safeParse(clean(req.body));
  if(!p.success)return res.status(400).json({error:'بيانات الدين غير صحيحة'}); const x=await prisma.debtAccount.create({data:{...p.data,reference:`GLHDEBT-${crypto.randomBytes(5).toString('hex').toUpperCase()}`}}); await audit(req,'CREATE','DebtAccount',x.id); res.status(201).json(x);
});
router.get('/admin/debts',requireAuth,requirePermission('debts.manage'),async(_req,res)=>res.json(await prisma.debtAccount.findMany({include:{payments:true},orderBy:{createdAt:'desc'}})));
router.get('/admin/debt-payments',requireAuth,requirePermission('debts.manage'),async(_req,res)=>res.json(await prisma.debtPayment.findMany({include:{debt:true},orderBy:{paymentDate:'desc'},take:500})));
router.post('/admin/debts/:id/payments',requireAuth,requirePermission('debts.manage'),async(req,res)=>{
  const p=z.object({amount:money,currency:z.string().length(3).default('USD'),paymentMethod:z.string().optional(),receiptNumber:z.string().optional(),notes:z.string().optional()}).safeParse(clean(req.body)); if(!p.success)return res.status(400).json({error:'بيانات سداد الدين غير صحيحة'});
  const debt=await prisma.debtAccount.findUnique({where:{id:req.params.id}}); if(!debt)return res.status(404).json({error:'الدين غير موجود'});
  const result=await prisma.$transaction(async tx=>{const current=await tx.debtAccount.findUnique({where:{id:debt.id}});const outstanding=Number(current.principalAmount)-Number(current.paidAmount);if(p.data.amount>outstanding)throw Object.assign(new Error('مبلغ السداد أكبر من الرصيد المتبقي'),{code:'OVERPAYMENT',outstanding});const payment=await tx.debtPayment.create({data:{...p.data,debtId:debt.id,status:'RECEIVED',reference:`GLHDP-${crypto.randomBytes(5).toString('hex').toUpperCase()}`}});const paid=Number(current.paidAmount)+p.data.amount;const updated=await tx.debtAccount.update({where:{id:debt.id},data:{paidAmount:paid,status:paid>=Number(current.principalAmount)?'SETTLED':'PARTIALLY_PAID'}});return {payment,debt:updated};},{isolationLevel:'Serializable'}).catch(error=>{if(error.code==='OVERPAYMENT')return {error:error.message,outstanding:error.outstanding};throw error;});
  if(result.error)return res.status(409).json(result);
  await audit(req,'RECORD_DEBT_PAYMENT','DebtAccount',debt.id,{amount:p.data.amount}); res.status(201).json(result);
});


// Expanded investor workflow: published opportunities and customer applications.
router.get('/investment-opportunities',async(_req,res)=>res.json(await prisma.investmentOpportunity.findMany({where:{status:'OPEN'},orderBy:{createdAt:'desc'}})));
router.post('/investment-opportunities/:id/applications',requireAuth,async(req,res)=>{
 const p=z.object({requestedAmount:money,currency:z.string().length(3).default('USD'),notes:z.string().max(3000).optional()}).safeParse(clean(req.body)); if(!p.success)return res.status(400).json({error:'بيانات طلب الاستثمار غير صحيحة'});
 const opportunity=await prisma.investmentOpportunity.findFirst({where:{id:req.params.id,status:'OPEN'}}); if(!opportunity)return res.status(404).json({error:'الفرصة الاستثمارية غير متاحة'}); if(opportunity.minimumAmount&&p.data.requestedAmount<Number(opportunity.minimumAmount))return res.status(400).json({error:'المبلغ أقل من الحد الأدنى للاستثمار'});
 const x=await prisma.investmentApplication.create({data:{...p.data,opportunityId:opportunity.id,applicantId:req.user.id}}); res.status(201).json({application:x,message:'تم إرسال طلب الاستثمار للمراجعة، ولا يمثل ذلك قبولاً أو ضماناً للعائد'});
});
router.get('/investment-applications/mine',requireAuth,async(req,res)=>res.json(await prisma.investmentApplication.findMany({where:{applicantId:req.user.id},include:{opportunity:true},orderBy:{createdAt:'desc'}})));
router.get('/admin/investment-opportunities',requireAuth,requirePermission('providers.manage'),async(_req,res)=>res.json(await prisma.investmentOpportunity.findMany({include:{_count:{select:{applications:true}}},orderBy:{createdAt:'desc'}})));
router.post('/admin/investment-opportunities',requireAuth,requirePermission('providers.manage'),async(req,res)=>{const p=z.object({code:z.string().min(3).max(40),title:z.string().min(3),sector:z.string().min(2),description:z.string().optional(),location:z.string().optional(),targetAmount:money,minimumAmount:z.coerce.number().positive().optional(),currency:z.string().length(3).default('USD'),expectedReturnPercent:z.coerce.number().min(0).max(1000).optional(),durationMonths:z.coerce.number().int().positive().optional(),riskLevel:z.string().optional(),status:z.enum(['DRAFT','OPEN','CLOSED']).default('DRAFT'),closingDate:z.coerce.date().optional()}).safeParse(clean(req.body));if(!p.success)return res.status(400).json({error:'بيانات الفرصة غير صحيحة',details:p.error.flatten()});const x=await prisma.investmentOpportunity.create({data:p.data});await audit(req,'CREATE_INVESTMENT_OPPORTUNITY','InvestmentOpportunity',x.id);res.status(201).json(x)});
router.patch('/admin/investment-applications/:id/review',requireAuth,requirePermission('providers.manage'),async(req,res)=>{const p=z.object({status:z.enum(['UNDER_REVIEW','APPROVED','REJECTED','NEED_INFO']),reviewNote:z.string().max(3000).optional()}).safeParse(clean(req.body));if(!p.success)return res.status(400).json({error:'قرار المراجعة غير صحيح'});const x=await prisma.investmentApplication.update({where:{id:req.params.id},data:p.data});await audit(req,'REVIEW_INVESTMENT_APPLICATION','InvestmentApplication',x.id,p.data);res.json(x)});
router.get('/admin/investment-applications',requireAuth,requirePermission('providers.manage'),async(_req,res)=>res.json(await prisma.investmentApplication.findMany({include:{opportunity:true,applicant:{select:{fullName:true,email:true,phone:true}}},orderBy:{createdAt:'desc'}})));

// Donation allocation ledger: separate pledge/receipt from allocation and disbursement.
router.get('/admin/donation-allocations',requireAuth,requirePermission('donations.manage'),async(_req,res)=>res.json(await prisma.donationAllocation.findMany({include:{campaign:true,donation:true},orderBy:{createdAt:'desc'}})));
router.post('/admin/donation-allocations',requireAuth,requirePermission('donations.manage'),async(req,res)=>{const p=z.object({campaignId:id,donationId:id.optional(),beneficiaryName:z.string().min(2),purpose:z.string().min(3),amount:money,currency:z.string().length(3).default('USD'),notes:z.string().max(2000).optional()}).safeParse(clean(req.body));if(!p.success)return res.status(400).json({error:'بيانات التخصيص غير صحيحة'});const campaign=await prisma.donationCampaign.findUnique({where:{id:p.data.campaignId}});if(!campaign)return res.status(404).json({error:'الحملة غير موجودة'});if(p.data.donationId){const d=await prisma.donation.findFirst({where:{id:p.data.donationId,campaignId:campaign.id,status:{in:['RECEIVED','ALLOCATED']}}});if(!d)return res.status(400).json({error:'يجب اختيار تبرع مستلم من الحملة'});}const x=await prisma.donationAllocation.create({data:p.data});await audit(req,'CREATE_DONATION_ALLOCATION','DonationAllocation',x.id);res.status(201).json(x)});
router.patch('/admin/donation-allocations/:id/disburse',requireAuth,requirePermission('donations.manage'),async(req,res)=>{const p=z.object({receiptReference:z.string().min(2),notes:z.string().max(2000).optional()}).safeParse(clean(req.body));if(!p.success)return res.status(400).json({error:'مرجع الصرف مطلوب'});const a=await prisma.donationAllocation.findUnique({where:{id:req.params.id}});if(!a)return res.status(404).json({error:'التخصيص غير موجود'});if(a.status==='DISBURSED')return res.status(409).json({error:'تم صرف هذا التخصيص مسبقاً'});const x=await prisma.donationAllocation.update({where:{id:a.id},data:{status:'DISBURSED',approvedBy:req.user.id,disbursedAt:new Date(),receiptReference:p.data.receiptReference,notes:p.data.notes}});await audit(req,'DISBURSE_DONATION_ALLOCATION','DonationAllocation',x.id);res.json(x)});

// Debt installment schedules and collection diary.
router.get('/admin/debts/:id/installments',requireAuth,requirePermission('debts.manage'),async(req,res)=>res.json(await prisma.debtInstallment.findMany({where:{debtId:req.params.id},orderBy:{installmentNo:'asc'}})));
router.post('/admin/debts/:id/installments',requireAuth,requirePermission('debts.manage'),async(req,res)=>{const p=z.object({installments:z.array(z.object({installmentNo:z.coerce.number().int().positive(),dueDate:z.coerce.date(),amount:money,notes:z.string().optional()})).min(1).max(120)}).safeParse(clean(req.body));if(!p.success)return res.status(400).json({error:'جدول الأقساط غير صحيح'});const debt=await prisma.debtAccount.findUnique({where:{id:req.params.id}});if(!debt)return res.status(404).json({error:'الدين غير موجود'});const total=p.data.installments.reduce((a,x)=>a+x.amount,0);if(total>Number(debt.principalAmount))return res.status(400).json({error:'مجموع الأقساط يتجاوز أصل الدين'});const rows=await prisma.$transaction(p.data.installments.map(x=>prisma.debtInstallment.create({data:{...x,debtId:debt.id}})));await audit(req,'CREATE_DEBT_SCHEDULE','DebtAccount',debt.id,{count:rows.length,total});res.status(201).json(rows)});
router.get('/admin/debts/:id/collection-activities',requireAuth,requirePermission('debts.manage'),async(req,res)=>res.json(await prisma.debtCollectionActivity.findMany({where:{debtId:req.params.id},orderBy:{contactDate:'desc'}})));
router.post('/admin/debts/:id/collection-activities',requireAuth,requirePermission('debts.manage'),async(req,res)=>{const p=z.object({activityType:z.enum(['CALL','VISIT','MESSAGE','LEGAL_NOTICE','PROMISE_TO_PAY','OTHER']),contactDate:z.coerce.date().optional(),result:z.string().optional(),nextFollowUp:z.coerce.date().optional(),assignedTo:z.string().optional(),notes:z.string().max(3000).optional()}).safeParse(clean(req.body));if(!p.success)return res.status(400).json({error:'بيانات متابعة التحصيل غير صحيحة'});const debt=await prisma.debtAccount.findUnique({where:{id:req.params.id}});if(!debt)return res.status(404).json({error:'الدين غير موجود'});const x=await prisma.debtCollectionActivity.create({data:{...p.data,debtId:debt.id}});await audit(req,'CREATE_COLLECTION_ACTIVITY','DebtCollectionActivity',x.id);res.status(201).json(x)});

export default router;
