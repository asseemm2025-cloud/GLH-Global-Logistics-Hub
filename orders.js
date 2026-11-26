import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router=Router();
const itemSchema=z.object({name:z.string().min(1),supplier:z.string().optional(),unitPrice:z.number().nonnegative(),quantity:z.number().positive(),unit:z.string().optional()});
router.post('/',requireAuth,async(req,res)=>{
 const schema=z.object({type:z.enum(['LOCAL','INTERNATIONAL']),originCountry:z.string().min(2),originCity:z.string().optional(),destinationCountry:z.string().min(2),destinationCity:z.string().optional(),items:z.array(itemSchema).min(1),shippingMethod:z.string().optional(),shippingCompany:z.string().optional(),shippingCost:z.number().nonnegative().optional(),deliveryProviderId:z.string().optional(),deliveryDistanceKm:z.number().nonnegative().default(0),deliveryWeightKg:z.number().nonnegative().default(0),deliveryZone:z.string().optional(),currency:z.string().default('USD'),paymentMethod:z.string().optional(),transferType:z.string().optional(),insuranceNeeded:z.boolean().default(false),insuranceCompany:z.string().optional(),insuredValue:z.number().nonnegative().optional(),insuranceCost:z.number().nonnegative().optional(),notes:z.string().optional(),financeProductId:z.string().optional(),requestedAmount:z.number().positive().optional(),termMonths:z.number().int().positive().optional(),financePurpose:z.string().optional()});
 const p=schema.safeParse(req.body);if(!p.success)return res.status(400).json({error:'تحقق من بيانات الطلب',details:p.error.flatten()});
 if(p.data.type==='INTERNATIONAL'&&!p.data.transferType&&!p.data.paymentMethod)return res.status(400).json({error:'حدد وسيلة الدفع أو نوع التحويل للطلب الدولي'});
 if(p.data.paymentMethod==='FINANCING'){
   if(!p.data.financeProductId||!p.data.requestedAmount||!p.data.termMonths||!p.data.financePurpose)return res.status(400).json({error:'أكمل منتج التمويل والمبلغ والمدة والغرض'});
   const fp=await prisma.financeProduct.findUnique({where:{id:p.data.financeProductId}});
   if(!fp||!fp.enabled)return res.status(400).json({error:'منتج التمويل غير متاح'});
   if(p.data.requestedAmount<Number(fp.minAmount)||p.data.requestedAmount>Number(fp.maxAmount))return res.status(400).json({error:'المبلغ خارج حدود منتج التمويل'});
 }
 const {financeProductId,requestedAmount,termMonths,financePurpose,deliveryDistanceKm,deliveryWeightKg,deliveryZone,...orderFields}=p.data;
 let deliveryQuote=null;
 if(p.data.deliveryProviderId){const provider=await prisma.deliveryProvider.findFirst({where:{id:p.data.deliveryProviderId,active:true}});if(!provider)return res.status(400).json({error:'جهة التوصيل غير متاحة'});if(provider.currency!==p.data.currency)return res.status(400).json({error:'عملة الطلب لا تطابق عملة تسعيرة التوصيل'});const zoneFee=Number(provider.settings?.zoneFees?.[deliveryZone||'']||0);const fee=Number(provider.baseFee)+Number(provider.perKmFee)*deliveryDistanceKm+Number(provider.perKgFee)*deliveryWeightKg+zoneFee;deliveryQuote={providerId:provider.id,providerName:provider.name,deliveryFee:Number(fee.toFixed(2)),distanceKm:deliveryDistanceKm,weightKg:deliveryWeightKg,zone:deliveryZone||null,currency:provider.currency};orderFields.shippingCost=deliveryQuote.deliveryFee;orderFields.deliveryProviderId=provider.id;orderFields.deliveryQuote=deliveryQuote;orderFields.shippingCompany=provider.name;}

 const result=await prisma.$transaction(async(tx)=>{
   const order=await tx.order.create({data:{...orderFields,customerId:req.user.id,orderNo:`GLH-${Date.now()}`}});
   const productSubtotal=Number(order.items.reduce((sum,it)=>sum+Number(it.unitPrice)*Number(it.quantity),0).toFixed(2));
   const deliveryFee=Number(order.shippingCost||0);
   const totalWithDelivery=Number((productSubtotal+deliveryFee).toFixed(2));
   let financeApplication=null;
   if(order.paymentMethod==='FINANCING') financeApplication=await tx.financeApplication.create({data:{applicationNo:`FIN-${Date.now()}`,userId:req.user.id,orderId:order.id,financeProductId,requestedAmount,currency:order.currency,termMonths,purpose:financePurpose}});
   const ecommerceReport=await tx.ecommerceOrderReport.create({data:{reference:`ECOM-${order.orderNo}`,orderId:order.id,customerId:req.user.id,productSubtotal,deliveryFee,totalAmount:totalWithDelivery,currency:order.currency,financeRequested:!!financeApplication,deliveryRequested:!!deliveryQuote,financeDetails:financeApplication?{applicationId:financeApplication.id,applicationNo:financeApplication.applicationNo,financeProductId,requestedAmount,termMonths,purpose:financePurpose}:null,deliveryDetails:deliveryQuote,status:'SUBMITTED'}});
   await tx.auditLog.create({data:{userId:req.user.id,action:'CREATE',entity:'Order',entityId:order.id,details:{ecommerceReportId:ecommerceReport.id,productSubtotal,deliveryFee,totalWithDelivery}}});
   return {order,financeApplication,deliveryQuote,ecommerceReport,productSubtotal,totalWithDelivery};
 });
 res.status(201).json(result);
});
router.get('/mine',requireAuth,async(req,res)=>res.json(await prisma.order.findMany({where:{customerId:req.user.id},include:{attachments:true,financeApps:true},orderBy:{createdAt:'desc'}})));
router.get('/',requireAuth,allowRoles('ADMIN','OPS','FINANCE'),async(req,res)=>res.json(await prisma.order.findMany({include:{customer:{select:{fullName:true,username:true,phone:true,country:true}},attachments:true},orderBy:{createdAt:'desc'}})));
router.get('/reports/ecommerce',requireAuth,allowRoles('ADMIN','OPS','FINANCE'),async(req,res)=>{
 const department=String(req.query.department||'ALL').toUpperCase();
 if(!['ALL','ECOMMERCE','FINANCE','DELIVERY'].includes(department))return res.status(400).json({error:'الإدارة المطلوبة غير صحيحة'});
 const from=req.query.from?new Date(String(req.query.from)):undefined;const to=req.query.to?new Date(String(req.query.to)):undefined;
 if((from&&!Number.isFinite(from.getTime()))||(to&&!Number.isFinite(to.getTime())))return res.status(400).json({error:'نطاق التاريخ غير صحيح'});
 const where={...(from||to?{createdAt:{...(from?{gte:from}:{}),...(to?{lte:to}:{})}}:{}),...(req.query.status?{status:String(req.query.status)}:{}),...(req.query.currency?{currency:String(req.query.currency).toUpperCase()}:{}),...(department==='FINANCE'?{financeRequested:true}:{}),...(department==='DELIVERY'?{deliveryRequested:true}:{})};
 const rows=await prisma.ecommerceOrderReport.findMany({where,orderBy:{createdAt:'desc'},take:500});
 res.json({department,filters:{from:req.query.from||null,to:req.query.to||null,status:req.query.status||null,currency:req.query.currency||null},count:rows.length,totals:rows.reduce((a,x)=>({productSubtotal:Number((a.productSubtotal+Number(x.productSubtotal)).toFixed(2)),deliveryFee:Number((a.deliveryFee+Number(x.deliveryFee)).toFixed(2)),totalAmount:Number((a.totalAmount+Number(x.totalAmount)).toFixed(2))}),{productSubtotal:0,deliveryFee:0,totalAmount:0}),rows});
});
router.patch('/:id/status',requireAuth,allowRoles('ADMIN','OPS'),async(req,res)=>{
 const status=z.enum(['SUBMITTED','UNDER_REVIEW','QUOTED','APPROVED','IN_PROGRESS','SHIPPED','DELIVERED','REJECTED','CANCELLED']).safeParse(req.body.status);
 if(!status.success)return res.status(400).json({error:'حالة غير معتمدة'});
 const order=await prisma.order.update({where:{id:req.params.id},data:{status:status.data}});
 await prisma.auditLog.create({data:{userId:req.user.id,action:'UPDATE_STATUS',entity:'Order',entityId:order.id,details:{status:status.data}}});res.json(order);
});
export default router;
