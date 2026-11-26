import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { z } from 'zod';
const router = Router();
router.get('/products', async (_req,res)=>res.json(await prisma.product.findMany({where:{published:true,moderationStatus:'APPROVED'},include:{store:{select:{name:true,country:true}}},orderBy:{createdAt:'desc'}})));
router.get('/finance-products', async (_req,res)=>res.json(await prisma.financeProduct.findMany({where:{enabled:true},orderBy:{name:'asc'}})));
router.post('/products',requireAuth,allowRoles('ADMIN','OPS'),async(req,res)=>{
 const p=z.object({name:z.string().min(2),description:z.string().optional(),category:z.string().optional(),price:z.coerce.number().nonnegative(),currency:z.string().default('USD'),stock:z.coerce.number().int().nonnegative().default(0),published:z.boolean().default(false)}).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:'بيانات المنتج غير مكتملة'});
 const item=await prisma.product.create({data:{...p.data,moderationStatus:p.data.published?'APPROVED':'DRAFT'}});res.status(201).json(item);
});
export default router;
