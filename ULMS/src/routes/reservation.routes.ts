/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express';
import { ReservationController } from '@/modules/reservations/reservation.controller';
import { jwtAuthMiddleware } from '@/modules/auth/jwtAuthMiddleware';
import { authorizeRoles } from '@/middlewares/authorizeRoles';
import { UserRole } from '@/modules/users/enums/user.enum';

const router = Router();
const controller = new ReservationController();

/**
 * 📋 [GET] /api/reservations
 * => Admin / Librarian xem toàn bộ danh sách đặt chỗ
 */
router.get(
  '/',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  controller.getAllReservations.bind(controller),
);

/**
 * 👤 [GET] /api/reservations/me
 * => Reader xem danh sách đặt chỗ của chính mình
 */
router.get('/me', jwtAuthMiddleware, controller.getMyReservations.bind(controller));

/**
 * 🟢 [POST] /api/reservations/:bookId
 * => Reader tạo yêu cầu đặt chỗ
 */
router.post('/:bookId', jwtAuthMiddleware, controller.create.bind(controller));

/**
 * ❌ [PATCH] /api/reservations/:id/cancel
 * => Reader tự hủy (hoặc Librarian hủy thay)
 */
router.patch('/:id/cancel', jwtAuthMiddleware, controller.cancel.bind(controller));

/**
 * ✅ [PATCH] /api/reservations/:id/approve
 * => Librarian duyệt yêu cầu đặt chỗ (hiệu lực 3 ngày)
 */
router.patch(
  '/:id/approve',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.LIBRARIAN),
  controller.approve.bind(controller),
);

/**
 * 🚫 [PATCH] /api/reservations/:id/reject
 * => Librarian từ chối yêu cầu đặt chỗ
 */
router.patch(
  '/:id/reject',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.LIBRARIAN),
  controller.reject.bind(controller),
);

/**
 * 📗 [PATCH] /api/reservations/:id/confirm-borrow
 * => Librarian xác nhận mượn (gọi qua BorrowRecordService)
 */
router.patch(
  '/:id/confirm-borrow',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.LIBRARIAN),
  controller.confirmBorrow.bind(controller),
);

/**
 * ⏰ [PATCH] /api/reservations/expire-check
 * => Cron / Admin / Librarian kiểm tra & hủy tự động các đặt chỗ quá hạn
 */
router.patch(
  '/expire-check',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  controller.expireCheck.bind(controller),
);

/**
 * 🗑️ [DELETE] /api/reservations/:id
 * => Admin xóa hoàn toàn đặt chỗ khỏi hệ thống
 */
router.delete(
  '/:id',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.ADMIN),
  controller.delete.bind(controller),
);

export default router;
