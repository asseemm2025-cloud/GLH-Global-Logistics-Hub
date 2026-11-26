import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { choosePartner } from '../services/routing.js';

const router = Router();
const audit = (req, action, entity, entityId, details = {}) => prisma.auditLog.create({
  data: { userId: req.user.id, action, entity, entityId, details }
});
const partnerInput = z.object({
  code: z.string().min(2).max(40).regex(/^[A-Z0-9_-]+$/),
  name: z.string().min(2).max(160),
  kind: z.enum(['BANK','PAYMENT_NETWORK','CARRIER','CUSTOMS','INSURER','WAREHOUSE','OTHER']),
  country: z.string().max(80).optional(),
  endpointUrl: z.string().url().optional(),
  capabilities: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

router.get('/', requireAuth, requirePermission('partners.view'), async (_req, res) => {
  const rows = await prisma.partner.findMany({
    select: { id:true,code:true,name:true,kind:true,status:true,country:true,endpointUrl:true,capabilities:true,isPrimaryBank:true,createdAt:true,updatedAt:true },
    orderBy: [{ kind:'asc' },{ name:'asc' }]
  });
  res.json(rows);
});

router.post('/', requireAuth, requirePermission('partners.manage'), async (req, res) => {
  const parsed = partnerInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error:'بيانات الشريك غير صحيحة', details:parsed.error.flatten() });
  const partner = await prisma.partner.create({ data: parsed.data });
  await audit(req, 'CREATE', 'Partner', partner.id, { code:partner.code, kind:partner.kind });
  res.status(201).json(partner);
});

router.patch('/:id/status', requireAuth, requirePermission('partners.manage'), async (req, res) => {
  const parsed = z.object({ status:z.enum(['DRAFT','UNDER_REVIEW','ACTIVE','SUSPENDED','DISABLED']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error:'حالة الشريك غير صحيحة' });
  const partner = await prisma.partner.update({ where:{ id:req.params.id }, data:parsed.data });
  if (partner.status !== 'ACTIVE' && partner.isPrimaryBank) {
    await prisma.partner.update({ where:{ id:partner.id }, data:{ isPrimaryBank:false } });
    partner.isPrimaryBank = false;
  }
  await audit(req, 'UPDATE_STATUS', 'Partner', partner.id, parsed.data);
  res.json(partner);
});

// Exactly one active bank can be designated primary. The operation is atomic.
router.put('/primary-bank/:id', requireAuth, requirePermission('partners.primary_bank'), async (req, res) => {
  const bank = await prisma.partner.findUnique({ where:{ id:req.params.id } });
  if (!bank || bank.kind !== 'BANK' || bank.status !== 'ACTIVE')
    return res.status(409).json({ error:'يجب اختيار بنك نشط ومسجل من نوع BANK' });
  const result = await prisma.$transaction(async tx => {
    await tx.partner.updateMany({ where:{ kind:'BANK', isPrimaryBank:true }, data:{ isPrimaryBank:false } });
    return tx.partner.update({ where:{ id:bank.id }, data:{ isPrimaryBank:true } });
  });
  await audit(req, 'SET_PRIMARY_BANK', 'Partner', result.id, { code:result.code });
  res.json({ primaryBank:result });
});

router.delete('/primary-bank', requireAuth, requirePermission('partners.primary_bank'), async (req, res) => {
  await prisma.partner.updateMany({ where:{ kind:'BANK', isPrimaryBank:true }, data:{ isPrimaryBank:false } });
  await audit(req, 'CLEAR_PRIMARY_BANK', 'Partner', null);
  res.json({ primaryBank:null, mode:'INDEPENDENT' });
});

router.post('/routing/preview', requireAuth, requirePermission('routing.preview'), async (req, res) => {
  const parsed = z.object({ operationType:z.string().min(2), requestedPartnerId:z.string().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error:'بيانات التوجيه غير صحيحة' });
  const [partners, rules] = await Promise.all([
    prisma.partner.findMany({ where:{ status:'ACTIVE' } }),
    prisma.routingRule.findMany({ where:{ enabled:true, operationType:parsed.data.operationType }, orderBy:{ priority:'asc' } })
  ]);
  let selected;
  try { selected = choosePartner({ partners, rules, ...parsed.data }); }
  catch (e) { return res.status(409).json({ error:e.message }); }
  res.json({ selectedPartner:selected ? { id:selected.id, code:selected.code, name:selected.name, kind:selected.kind } : null,
    requiresManualSelection:!selected, execution:'NOT_EXECUTED', notice:'هذه معاينة توجيه فقط ولا تنفذ دفعاً أو تحويلاً مالياً.' });
});

router.get('/routing/rules', requireAuth, requirePermission('routing.view'), async (_req,res) => {
  res.json(await prisma.routingRule.findMany({ include:{ partner:{ select:{ id:true,code:true,name:true,kind:true } } }, orderBy:[{priority:'asc'},{name:'asc'}] }));
});

router.post('/routing/rules', requireAuth, requirePermission('routing.manage'), async (req,res) => {
  const parsed = z.object({ name:z.string().min(2), operationType:z.string().min(2), mode:z.enum(['PRIMARY_BANK','PREFERRED_PROVIDER','LOWEST_FEE','MANUAL']), partnerId:z.string().nullable().optional(), priority:z.number().int().min(1).max(10000).default(100), conditions:z.record(z.any()).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error:'قاعدة التوجيه غير صحيحة', details:parsed.error.flatten() });
  const rule = await prisma.routingRule.create({ data:parsed.data });
  await audit(req,'CREATE','RoutingRule',rule.id,{ operationType:rule.operationType,mode:rule.mode });
  res.status(201).json(rule);
});

export default router;
