import { Router } from 'express';
import { LibrarianController } from '../modules/librarian/librarian.controller';
import { jwtAuthMiddleware } from '@/modules/auth/jwtAuthMiddleware';
import { authorizeRoles } from '@/middlewares/authorizeRoles';
import { UserRole } from '@/modules/users/enums/user.enum';

const router = Router();

/**
 * ✅ Tất cả routes librarian yêu cầu đăng nhập (Admin hoặc Librarian)
 */
router.use(jwtAuthMiddleware);

// Get stats for librarian dashboard
router.get(
  '/stats',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  LibrarianController.getStats,
);

export default router;
