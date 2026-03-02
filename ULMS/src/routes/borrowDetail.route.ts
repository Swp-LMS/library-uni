import { Router } from 'express';
import { BorrowDetailController } from '@/modules/borrowDetails/borrowDetail.controller';
import { jwtAuthMiddleware } from '@/modules/auth/jwtAuthMiddleware';
import { authorizeRoles } from '@/middlewares/authorizeRoles';
import { UserRole } from '@/modules/users/enums/user.enum';

const router = Router();

/**
 * ⛔ Tất cả route borrow-details yêu cầu login trước
 */
router.use(jwtAuthMiddleware);

/**
 * 🔹 Trả 1 cuốn sách (BorrowDetail)
 *      POST /api/borrow-details/:id/return
 *
 *  Cho phép: ADMIN + LIBRARIAN
 */
router.post(
  '/:id/return',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  BorrowDetailController.returnOneDetail,
);

export default router;
