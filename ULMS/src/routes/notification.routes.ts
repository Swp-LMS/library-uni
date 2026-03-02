import { Router } from 'express';
import { NotificationController } from '@/modules/notifications/notification.controller';
import { jwtAuthMiddleware } from '@/modules/auth/jwtAuthMiddleware';

const router = Router();
const ctrl = new NotificationController();

router.get('/', jwtAuthMiddleware, ctrl.list.bind(ctrl));
router.patch('/:id/read', jwtAuthMiddleware, ctrl.markRead.bind(ctrl));
router.patch('/read-all', jwtAuthMiddleware, ctrl.markAllRead.bind(ctrl));

// ✅ test route: gọi notify librarian bằng tay
router.post('/reservation/:id', ctrl.notifyReservation.bind(ctrl));

export default router;
