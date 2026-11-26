import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = Router();

router.post('/register', async (req, res) => {
  const parsed = z.object({
    username:z.string().min(4).max(40), password:z.string().min(10), fullName:z.string().min(2),
    phone:z.string().optional(), email:z.string().email().optional(), country:z.string().optional(), city:z.string().optional(),
    accountType:z.enum(['CLIENT','MERCHANT']).default('CLIENT'),
    merchant:z.object({businessName:z.string().min(2),businessType:z.string().min(2),businessCategory:z.string().optional(),legalForm:z.string().optional(),productCategories:z.array(z.string().max(80)).max(30).optional(),estimatedMonthlyOrders:z.coerce.number().int().nonnegative().max(1000000).optional(),hasCommercialRegistration:z.boolean().default(false),shippingCapability:z.string().max(500).optional(),returnPolicy:z.string().max(1000).optional(),registrationNumber:z.string().optional(),taxNumber:z.string().optional(),contactPerson:z.string().min(2),businessPhone:z.string().min(5),businessEmail:z.string().email().optional(),country:z.string().min(2),city:z.string().min(2),address:z.string().min(4),website:z.string().url().optional(),description:z.string().max(3000).optional()}).optional()
  }).superRefine((v,ctx)=>{if(v.accountType==='MERCHANT'&&!v.merchant)ctx.addIssue({code:z.ZodIssueCode.custom,path:['merchant'],message:'بيانات النشاط التجاري مطلوبة للتسجيل كتاجر'});}).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error:'تحقق من البيانات؛ اسم المستخدم 4 أحرف وكلمة المرور 10 أحرف على الأقل، وبيانات النشاط مطلوبة للتاجر', details:parsed.error.flatten() });
  const data = parsed.data;
  try {
    const passwordHash=await bcrypt.hash(data.password,12);
    const user=await prisma.$transaction(async tx=>{
      const created=await tx.user.create({data:{username:data.username,email:data.email,fullName:data.fullName,phone:data.phone,country:data.country,city:data.city,passwordHash,role:data.accountType},select:{id:true,username:true,fullName:true,role:true}});
      if(data.accountType==='MERCHANT') await tx.merchantProfile.create({data:{userId:created.id,...data.merchant}});
      return created;
    });
    res.status(201).json({ user, merchantApprovalRequired:data.accountType==='MERCHANT', message:data.accountType==='MERCHANT'?'تم إنشاء حساب التاجر وإرسال بيانات النشاط للمراجعة. لن تتمكن من إضافة المنتجات حتى اعتماد الحساب.':'تم إنشاء حساب العميل بنجاح.' });
  } catch (error) { res.status(409).json({ error:'اسم المستخدم أو البريد مستخدم مسبقاً' }); }
});

router.post('/login', async (req,res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({error:'أدخل اسم المستخدم وكلمة المرور'});
  const user = await prisma.user.findUnique({ where:{username} });
  if (!user || !user.active || !(await bcrypt.compare(password,user.passwordHash))) return res.status(401).json({error:'بيانات الدخول غير صحيحة'});
  const token = jwt.sign({sub:user.id,role:user.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN || '8h'});
  const merchantProfile = user.role === 'MERCHANT' ? await prisma.merchantProfile.findUnique({where:{userId:user.id},select:{status:true,businessName:true}}) : null;
  res.json({ token, user:{id:user.id,username:user.username,fullName:user.fullName,role:user.role,mustChangePassword:user.mustChangePassword,merchantProfile} });
});

router.post('/change-password', requireAuth, allowRoles('ADMIN'), async (req,res) => {
  const parsed = z.object({ currentPassword:z.string().min(1), newPassword:z.string().min(12).max(128) }).safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({error:'كلمة المرور الجديدة يجب أن تكون 12 حرفاً على الأقل'});
  const user = await prisma.user.findUnique({where:{id:req.user.id}});
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword,user.passwordHash))) return res.status(401).json({error:'كلمة المرور الحالية غير صحيحة'});
  if (parsed.data.currentPassword === parsed.data.newPassword) return res.status(400).json({error:'اختر كلمة مرور مختلفة عن الحالية'});
  await prisma.user.update({where:{id:user.id},data:{passwordHash:await bcrypt.hash(parsed.data.newPassword,12),mustChangePassword:false}});
  res.json({ok:true,message:'تم تغيير كلمة المرور بنجاح'});
});

export default router;
