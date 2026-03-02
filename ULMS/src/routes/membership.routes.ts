/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router, Request, Response, NextFunction } from 'express';
import { MembershipController } from '@/modules/memberships/membership.controller';
import { jwtAuthMiddleware } from '@/modules/auth/jwtAuthMiddleware';

const router = Router();
const controller = new MembershipController();

/**
 * Middleware: chỉ cho admin
 */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: admin only',
    });
  }
  return next();
}

// ========== PUBLIC / USER ==========

// Public – FE dùng để load list gói đang mở bán
// GET /api/memberships
router.get('/', controller.getPlans.bind(controller));

// User đã login: lấy danh sách gói + thông tin khuyến mãi 72h
// GET /api/memberships/user-plans
router.get('/user-plans', jwtAuthMiddleware, controller.getPlansForUser.bind(controller));

// User đã login: xem gói của chính mình
// GET /api/memberships/me
router.get('/me', jwtAuthMiddleware, controller.getMyPlan.bind(controller));

// User đã login: chọn / đổi gói
// POST /api/memberships/choose
router.post('/choose', jwtAuthMiddleware, controller.choosePlan.bind(controller));

// ========== ADMIN ==========

router.get('/admin', jwtAuthMiddleware, requireAdmin, controller.adminGetAll.bind(controller));

router.post('/admin', jwtAuthMiddleware, requireAdmin, controller.adminCreate.bind(controller));

router.put('/admin/:id', jwtAuthMiddleware, requireAdmin, controller.adminUpdate.bind(controller));

router.delete(
  '/admin/:id',
  jwtAuthMiddleware,
  requireAdmin,
  controller.adminDelete.bind(controller),
);

export default router;
