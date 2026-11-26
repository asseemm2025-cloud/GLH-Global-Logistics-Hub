import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { DEPARTMENTS, PERMISSIONS, ROLES, DEFAULT_GRANTS } from '../security/permission-catalog.js';
const router=Router();
const admin=(req,res,next)=>req.user?.role==='ADMIN'?next():res.status(403).json({error:'إدارة الأدوار والصلاحيات متاحة لمدير النظام العام فقط'});
router.get('/catalog',requireAuth,requirePermission('permissions.view'),(_req,res)=>res.json({departments:DEPARTMENTS,roles:ROLES,permissions:PERMISSIONS,defaultGrants:DEFAULT_GRANTS}));
router.get('/matrix',requireAuth,requirePermission('permissions.view'),async(_req,res)=>{
 const rows=await prisma.rolePermission.findMany({orderBy:[{role:'asc'},{permission:'asc'}]});
 const matrix={}; for(const role of ROLES.map(x=>x.key))matrix[role]={};
 for(const row of rows){matrix[row.role]??={};matrix[row.role][row.permission]=row.allowed;}
 res.json({roles:ROLES,permissions:PERMISSIONS,matrix});
});
router.put('/matrix',requireAuth,admin,async(req,res)=>{
 const parsed=z.object({changes:z.array(z.object({role:z.enum(['OPS','FINANCE','SUPPORT','COMPLIANCE','MERCHANT','CLIENT']),permission:z.string().min(3).max(100),allowed:z.boolean()})).min(1).max(1000)}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'بيانات مصفوفة الصلاحيات غير صحيحة',details:parsed.error.flatten()});
 const valid=new Set(PERMISSIONS.map(x=>x.key));
 if(parsed.data.changes.some(x=>!valid.has(x.permission)))return res.status(400).json({error:'تحتوي الطلبات على صلاحية غير معرّفة'});
 await prisma.$transaction(parsed.data.changes.map(x=>prisma.rolePermission.upsert({where:{role_permission:{role:x.role,permission:x.permission}},update:{allowed:x.allowed},create:{role:x.role,permission:x.permission,allowed:x.allowed}})));
 await prisma.auditLog.create({data:{userId:req.user.id,action:'UPDATE_PERMISSION_MATRIX',entity:'RolePermission',entityId:'matrix',details:{count:parsed.data.changes.length}}});
 res.json({updated:parsed.data.changes.length,message:'تم تحديث مصفوفة الصلاحيات'});
});
router.get('/organization',requireAuth,requirePermission('workspace.view'),async(_req,res)=>{
 const setting=await prisma.platformSetting.findUnique({where:{key:'admin.organization'}});
 res.json(setting?.value??{departments:DEPARTMENTS.map(d=>({...d,manager:null,active:true})),positions:[]});
});
router.put('/organization',requireAuth,admin,async(req,res)=>{
 const parsed=z.object({departments:z.array(z.object({code:z.string().min(2).max(20),nameAr:z.string().min(2).max(100),manager:z.string().max(120).nullable().optional(),active:z.boolean().default(true),functions:z.array(z.string().max(160)).default([])})).max(50),positions:z.array(z.object({code:z.string().min(2).max(30),nameAr:z.string().min(2).max(100),departmentCode:z.string().min(2).max(20),description:z.string().max(300).optional()})).max(200)}).safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:'الهيكل الإداري غير صحيح',details:parsed.error.flatten()});
 const saved=await prisma.platformSetting.upsert({where:{key:'admin.organization'},update:{value:parsed.data,updatedBy:req.user.id},create:{key:'admin.organization',value:parsed.data,updatedBy:req.user.id}});
 await prisma.auditLog.create({data:{userId:req.user.id,action:'UPDATE_ORGANIZATION_STRUCTURE',entity:'PlatformSetting',entityId:'admin.organization'}});
 res.json(saved.value);
});
router.get('/my-permissions',requireAuth,async(req,res)=>{
 if(req.user.role==='ADMIN')return res.json({role:'ADMIN',all:true,permissions:PERMISSIONS.map(x=>x.key)});
 const rows=await prisma.rolePermission.findMany({where:{role:req.user.role,allowed:true},select:{permission:true}});
 res.json({role:req.user.role,all:false,permissions:rows.map(x=>x.permission)});
});
export default router;
