import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

export async function requireAuth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'يلزم تسجيل الدخول' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) return res.status(401).json({ error: 'الحساب غير فعال' });
    req.user = { id: user.id, username: user.username, role: user.role, fullName: user.fullName };
    next();
  } catch { return res.status(401).json({ error: 'جلسة الدخول غير صالحة أو منتهية' }); }
}

export function allowRoles(...roles) {
  return (req, res, next) => roles.includes(req.user?.role)
    ? next() : res.status(403).json({ error: 'ليست لديك صلاحية لتنفيذ هذا الإجراء' });
}

// Fine-grained permissions are stored in PostgreSQL. ADMIN retains full access;
// other roles are denied unless an explicit permission is granted.
export function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'ADMIN') return next();
      const { prisma } = await import('../db.js');
      const rule = await prisma.rolePermission.findUnique({
        where: { role_permission: { role: req.user.role, permission } }
      });
      if (rule?.allowed) return next();
      return res.status(403).json({ error: 'لا تملك الصلاحية المطلوبة', permission });
    } catch (error) { next(error); }
  };
}
