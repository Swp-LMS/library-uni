import { Router } from 'express';
import { UserController } from '@/modules/users/user.controller';
import { jwtAuthMiddleware } from '@/modules/auth/jwtAuthMiddleware';

const router = Router();
const controller = new UserController();

// Các endpoints liên quan đến current user
router.get('/stats', jwtAuthMiddleware, controller.getMyStats.bind(controller));

export default router;
