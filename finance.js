import {Router} from 'express';import {z} from 'zod';import {prisma} from '../db.js';import {requireAuth,allowRoles} from '../middleware/auth.js';
const router=Router();
router.post('/applications',requireAuth,async(req,res)=>{
 const p=z.object({financeProductId:z.string(),orderId:z.string().optional(),requestedAmount:z.number().positive(),currency:z.string().default('USD'),termMonths:z.number().int().positive(),purpose:z.string().min(5)}).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'بيانات طلب التمويل غير مكتملة'});
 const product=await prisma.financeProduct.findUnique({where:{id:p.data.financeProductId}});if(!product||!product.enabled)return res.status(404).json({error:'منتج التمويل غير متاح'});
 if(p.data.requestedAmount<Number(product.minAmount)||p.data.requestedAmount>Number(product.maxAmount))return res.status(400).json({error:'المبلغ خارج حدود منتج التمويل'});
 const app=await prisma.financeApplication.create({data:{...p.data,userId:req.user.id,applicationNo:`FIN-${Date.now()}`}});res.status(201).json(app);
});
router.get('/applications/mine',requireAuth,async(req,res)=>res.json(await prisma.financeApplication.findMany({where:{userId:req.user.id},include:{financeProduct:true,order:true},orderBy:{createdAt:'desc'}})));
router.get('/applications',requireAuth,allowRoles('ADMIN','FINANCE'),async(_req,res)=>res.json(await prisma.financeApplication.findMany({include:{user:{select:{fullName:true,username:true,phone:true}},financeProduct:true,order:true},orderBy:{createdAt:'desc'}})));
router.patch('/applications/:id/status',requireAuth,allowRoles('ADMIN','FINANCE'),async(req,res)=>{
 const p=z.object({status:z.enum(['SUBMITTED','UNDER_REVIEW','NEED_INFO','APPROVED','REJECTED','DISBURSED','CLOSED']),adminNotes:z.string().optional()}).safeParse(req.body);if(!p.success)return res.status(400).json({error:'حالة غير صحيحة'});
 res.json(await prisma.financeApplication.update({where:{id:req.params.id},data:p.data}));
});
router.post('/products',requireAuth,allowRoles('ADMIN','FINANCE'),async(req,res)=>{
 const p=z.object({name:z.string().min(2),category:z.string(),description:z.string().optional(),minAmount:z.number().nonnegative(),maxAmount:z.number().positive(),currency:z.string().default('USD'),termMonths:z.number().int().positive(),profitRate:z.number().nonnegative(),enabled:z.boolean().default(true)}).safeParse(req.body);if(!p.success)return res.status(400).json({error:'بيانات منتج التمويل غير صحيحة'});
 res.status(201).json(await prisma.financeProduct.create({data:p.data}));
});
export default router;
