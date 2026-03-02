import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import meRoutes from './me.routes';
import bookRoutes from './book.routes';
import categoryRoutes from './category.routes';
import authorRoutes from './author.routes';
import publisherRoutes from './publisher.routes';
import reservationRoutes from './reservation.routes';
import borrowRecordRoutes from './borrowRecord.routes';
import notificationRoutes from './notification.routes';
import librarianRoutes from './librarian.routes';
import adminRoutes from './admin.routes';
import membershipRoutes from './membership.routes';
import reviewsRouter from './reviews.routes';
import borrowDetailRouter from './borrowDetail.route';
import paymentRoutes from './payment.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/users', userRoutes);
router.use('/books', bookRoutes);
router.use('/authors', authorRoutes);
router.use('/categories', categoryRoutes);
router.use('/publishers', publisherRoutes);
router.use('/reservations', reservationRoutes);
router.use('/borrow-records', borrowRecordRoutes);
router.use('/notifications', notificationRoutes);
router.use('/librarian', librarianRoutes);
router.use('/admin', adminRoutes);
router.use('/memberships', membershipRoutes);
router.use('/reviews', reviewsRouter);
router.use('/borrow-details', borrowDetailRouter);
router.use('/', paymentRoutes);

export default router;
