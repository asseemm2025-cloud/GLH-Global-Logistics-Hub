import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = Router();
const typeSchema = z.enum(['INVESTMENT','DONATION','DEBT_REVIEW']);
const statusSchema = z.enum(['SUBMITTED','UNDER_REVIEW','NEED_INFO','APPROVED','REJECTED','CLOSED']);
const ref = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
router.post('/', requireAuth, async (req,res) => {
 const parsed = z.object({type:typeSchema,subject:z.string().trim().min(3).max(160),message:z.string().max(3000).optional(),payload:z.record(z.any()).default({})}).safeParse(req.body);
 if(!parsed.success) return res.status(400).json({error:'تحقق من بيانات الطلب',details:parsed.error.flatten()});
 const {type,payload}=parsed.data;
 if(type==='DEBT_REVIEW'){
   const debtReference = z.string().min(3).safeParse(payload.debtReference);
   if(!debtReference.success) return res.status(400).json({error:'أدخل مرجع المديونية للتحقق'});
   const debt = await prisma.debtAccount.findFirst({where:{reference:debtReference.data,debtorUserId:req.user.id},select:{id:true,reference:true,currency:true,status:true}});
   if(!debt) return res.status(404).json({error:'لم يتم العثور على مديونية مرتبطة بحسابك'});
   payload.debtReference = debt.reference;
 }
 if(type==='INVESTMENT'){
   if(payload.opportunityId){
     const opportunity=await prisma.investmentOpportunity.findUnique({where:{id:String(payload.opportunityId)},select:{id:true,status:true}});
     if(!opportunity || opportunity.status!=='ACTIVE') return res.status(400).json({error:'الفرصة الاستثمارية غير متاحة حالياً'});
   }
   if(payload.requestedAmount!==undefined && (!Number.isFinite(Number(payload.requestedAmount)) || Number(payload.requestedAmount)<=0)) return res.status(400).json({error:'قيمة الاستثمار المقترحة غير صحيحة'});
 }
 if(type==='DONATION' && payload.amount!==undefined && (!Number.isFinite(Number(payload.amount)) || Number(payload.amount)<=0)) return res.status(400).json({error:'قيمة التبرع المقترحة غير صحيحة'});
 const item=await prisma.clientServiceRequest.create({data:{reference:ref(type),userId:req.user.id,type,subject:parsed.data.subject,message:parsed.data.message,payload}});
 await prisma.auditLog.create({data:{userId:req.user.id,action:'CREATE',entity:'ClientServiceRequest',entityId:item.id,details:{type}}});
 res.status(201).json(item);
});
router.get('/mine', requireAuth, async(req,res)=>{
 const items=await prisma.clientServiceRequest.findMany({where:{userId:req.user.id},orderBy:{createdAt:'desc'}}); res.json(items);
});
router.get('/', requireAuth, allowRoles('ADMIN','OPS','FINANCE','SUPPORT','COMPLIANCE'), async(req,res)=>{
 const where={}; if(req.query.type && typeSchema.safeParse(req.query.type).success) where.type=req.query.type;
 if(req.query.status && statusSchema.safeParse(req.query.status).success) where.status=req.query.status;
 const items=await prisma.clientServiceRequest.findMany({where,include:{user:{select:{id:true,fullName:true,username:true,phone:true,email:true}}},orderBy:{createdAt:'desc'},take:500}); res.json(items);
});
router.patch('/:id/status', requireAuth, allowRoles('ADMIN','OPS','FINANCE','SUPPORT','COMPLIANCE'), async(req,res)=>{
 const parsed=z.object({status:statusSchema,adminNote:z.string().max(3000).optional()}).safeParse(req.body);
 if(!parsed.success) return res.status(400).json({error:'حالة الطلب أو الملاحظة غير صحيحة'});
 const item=await prisma.clientServiceRequest.update({where:{id:req.params.id},data:{status:parsed.data.status,adminNote:parsed.data.adminNote,reviewedBy:req.user.id,reviewedAt:new Date()}});
 await prisma.auditLog.create({data:{userId:req.user.id,action:'UPDATE_STATUS',entity:'ClientServiceRequest',entityId:item.id,details:{status:item.status}}}); res.json(item);
});
export default router;
