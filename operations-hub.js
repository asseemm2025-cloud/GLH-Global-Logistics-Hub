import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const r = Router();
const staff = [ 'ADMIN', 'OPS', 'FINANCE', 'SUPPORT', 'COMPLIANCE' ];
const moduleKey = z.string().regex(/^[a-z][a-z0-9_-]{1,49}$/);
const ref = () => `GLH-OP-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
const audit = (userId, action, entity, entityId, details={}) => prisma.auditLog.create({data:{userId,action,entity,entityId,details}});

// Public, read-only directory for records explicitly published by staff. Internal fields are never returned.
r.get('/public-records', async (req,res) => {
  const allowed = ['donors','donor-programs','manufacturers','manufacturer-catalog'];
  const parsed = moduleKey.safeParse(req.query.module);
  if (!parsed.success || !allowed.includes(parsed.data)) return res.status(400).json({error:'الوحدة العامة غير متاحة'});
  const rows = await prisma.operationalRecord.findMany({where:{moduleKey:parsed.data},orderBy:{updatedAt:'desc'},take:500});
  const visible = rows.filter(x => ['نشط','منشور','معتمد'].includes(String(x.data?.status||'')));
  const fields = {
    donors:['name','organizationType','country','city','website','focusAreas','fundingTypes','targetRegions','beneficiaryTypes','eligibilityCriteria','status'],
    'donor-programs':['name','donorName','programCode','sector','targetRegions','budget','currency','openDate','deadline','eligibility','documents','status'],
    manufacturers:['name','legalName','country','city','website','categories','productLines','certifications','qualityStandards','exportMarkets','productionCapacity','capacityUnit','minimumOrder','currency','leadTimeDays','paymentTerms','incoterms','samplesAvailable','privateLabel','status'],
    'manufacturer-catalog':['name','manufacturerName','sku','category','description','unit','unitPrice','currency','minimumOrder','availableQuantity','leadTimeDays','certifications','status']
  }[parsed.data];
  res.json(visible.map(x => Object.fromEntries(fields.filter(k => x.data?.[k] !== undefined).map(k => [k,x.data[k]]))));
});

// Generic CRUD for operational workspaces. All records are persisted centrally in PostgreSQL.
r.get('/records', requireAuth, allowRoles(...staff), async (req,res) => {
  const parsed = moduleKey.safeParse(req.query.module);
  if (!parsed.success) return res.status(400).json({error:'رمز الوحدة غير صحيح'});
  const rows = await prisma.operationalRecord.findMany({where:{moduleKey:parsed.data},orderBy:{updatedAt:'desc'},take:1000});
  res.json(rows.map(x=>({id:x.id,...x.data,createdAt:x.createdAt,updatedAt:x.updatedAt})));
});
r.post('/records', requireAuth, allowRoles(...staff), async (req,res) => {
  const p=z.object({moduleKey,data:z.record(z.any())}).safeParse(req.body);
  if(!p.success || !moduleKey.safeParse(p.data?.moduleKey).success) return res.status(400).json({error:'بيانات السجل غير صحيحة'});
  const x=await prisma.operationalRecord.create({data:{moduleKey:p.data.moduleKey,data:p.data.data,createdBy:req.user.id,updatedBy:req.user.id}});
  await audit(req.user.id,'CREATE_OPERATIONAL_RECORD','OperationalRecord',x.id,{moduleKey:x.moduleKey});
  res.status(201).json({id:x.id,...x.data,createdAt:x.createdAt,updatedAt:x.updatedAt});
});
r.patch('/records/:id', requireAuth, allowRoles(...staff), async (req,res) => {
  const p=z.object({data:z.record(z.any())}).safeParse(req.body); if(!p.success)return res.status(400).json({error:'بيانات التحديث غير صحيحة'});
  const x=await prisma.operationalRecord.update({where:{id:req.params.id},data:{data:p.data.data,updatedBy:req.user.id}});
  await audit(req.user.id,'UPDATE_OPERATIONAL_RECORD','OperationalRecord',x.id,{moduleKey:x.moduleKey}); res.json({id:x.id,...x.data,createdAt:x.createdAt,updatedAt:x.updatedAt});
});
r.delete('/records/:id', requireAuth, allowRoles('ADMIN','OPS'), async(req,res)=>{
  const x=await prisma.operationalRecord.delete({where:{id:req.params.id}}); await audit(req.user.id,'DELETE_OPERATIONAL_RECORD','OperationalRecord',x.id,{moduleKey:x.moduleKey}); res.json({ok:true,id:x.id});
});

// Client submits to a selected operational department; staff review the same database record.
r.post('/requests', requireAuth, async(req,res)=>{
  const p=z.object({moduleKey,subject:z.string().trim().min(3).max(180),message:z.string().max(5000).optional(),payload:z.record(z.any()).default({}),assignedDepartment:z.string().max(100).optional()}).safeParse(req.body);
  if(!p.success)return res.status(400).json({error:'بيانات الطلب غير مكتملة',details:p.error.flatten()});
  const x=await prisma.operationalRequest.create({data:{reference:ref(),userId:req.user.id,...p.data,history:{create:{actorId:req.user.id,action:'SUBMITTED',toStatus:'SUBMITTED'}}}});
  await audit(req.user.id,'SUBMIT_OPERATIONAL_REQUEST','OperationalRequest',x.id,{moduleKey:x.moduleKey,reference:x.reference}); res.status(201).json(x);
});
r.get('/requests/mine', requireAuth, async(req,res)=>res.json(await prisma.operationalRequest.findMany({where:{userId:req.user.id},include:{history:{orderBy:{createdAt:'asc'}}},orderBy:{createdAt:'desc'}})));
r.get('/requests', requireAuth, allowRoles(...staff), async(req,res)=>{
  const where={...(req.query.module?{moduleKey:String(req.query.module)}:{}),...(req.query.status?{status:String(req.query.status)}:{})};
  res.json(await prisma.operationalRequest.findMany({where,include:{user:{select:{id:true,fullName:true,username:true,phone:true,email:true}},history:{orderBy:{createdAt:'asc'}}},orderBy:{createdAt:'desc'},take:1000}));
});
r.patch('/requests/:id', requireAuth, allowRoles(...staff), async(req,res)=>{
  const p=z.object({status:z.enum(['UNDER_REVIEW','NEED_INFO','APPROVED','REJECTED','IN_PROGRESS','COMPLETED','CANCELLED']),adminNote:z.string().max(5000).optional(),assignedDepartment:z.string().max(100).optional()}).safeParse(req.body);
  if(!p.success)return res.status(400).json({error:'بيانات تحديث الطلب غير صحيحة'});
  const before=await prisma.operationalRequest.findUnique({where:{id:req.params.id}}); if(!before)return res.status(404).json({error:'الطلب غير موجود'});
  const x=await prisma.operationalRequest.update({where:{id:req.params.id},data:{...p.data,reviewedBy:req.user.id,reviewedAt:new Date(),history:{create:{actorId:req.user.id,action:'STATUS_CHANGED',fromStatus:before.status,toStatus:p.data.status,note:p.data.adminNote}}},include:{user:{select:{id:true,fullName:true,username:true}},history:{orderBy:{createdAt:'asc'}}}});
  await audit(req.user.id,'UPDATE_OPERATIONAL_REQUEST','OperationalRequest',x.id,{from:before.status,to:x.status}); res.json(x);
});
export default r;
