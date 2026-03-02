import { Router } from 'express';
import { UserController } from '@/modules/users/user.controller';
import { jwtAuthMiddleware } from '@/modules/auth/jwtAuthMiddleware';
import { authorizeRoles } from '@/middlewares/authorizeRoles';
import { UserRole } from '@/modules/users/enums/user.enum';

const router = Router();
const controller = new UserController();

// Blacklist routes - PHẢI đặt trước /:id để tránh conflict
// Express sẽ match route cụ thể trước route có parameter
router.get(
  '/blacklist',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  controller.getBlacklist.bind(controller),
);

router.patch(
  '/:id/blacklist',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  controller.updateBlacklist.bind(controller),
);

// Chỉ admin & librarian được xem danh sách users
router.get(
  '/',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  controller.getAll.bind(controller),
);

router.get(
  '/:id',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  controller.getById.bind(controller),
);
router.put(
  '/:id',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  controller.update.bind(controller),
);
router.delete(
  '/:id',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  controller.delete.bind(controller),
);

router.post(
  '/',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  controller.create.bind(controller),
);

export default router;
