import {Router} from 'express';import {z} from 'zod';import {prisma} from '../db.js';import {requireAuth,allowRoles} from '../middleware/auth.js';
const router=Router();
router.get('/',requireAuth,allowRoles('ADMIN','OPS','FINANCE'),async(_req,res)=>res.json(await prisma.swiftRecord.findMany({include:{order:true},orderBy:{createdAt:'desc'}})));
router.post('/',requireAuth,allowRoles('ADMIN','FINANCE'),async(req,res)=>{
 const p=z.object({reference:z.string().min(3),orderId:z.string().optional(),messageType:z.enum(['MT103','MT202','MT700','MT760','MT799','OTHER']),senderBic:z.string().optional(),receiverBic:z.string().optional(),amount:z.number().nonnegative().optional(),currency:z.string().default('USD'),status:z.enum(['DRAFT','UNDER_REVIEW','APPROVED_INTERNAL','REJECTED','COMPLETED']).default('DRAFT'),notes:z.string().optional()}).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'تحقق من بيانات سجل SWIFT'});
 res.status(201).json(await prisma.swiftRecord.create({data:p.data}));
});
export default router;
