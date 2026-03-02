// src/routes/upload.routes.ts
import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../cloudinary/upload.controller';
import { jwtAuthMiddleware } from '@/modules/auth/jwtAuthMiddleware';
import { authorizeRoles } from '@/middlewares/authorizeRoles';
import { UserRole } from '@/modules/users/enums/user.enum';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * ✅ Tất cả routes upload yêu cầu đăng nhập (Admin hoặc Librarian)
 */
router.use(jwtAuthMiddleware);

// Upload ảnh cho sách
router.post(
  '/books/:id/images',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  upload.single('file'),
  UploadController.uploadBookImage,
);

// Upload ảnh generic (book, user, author, category, other)
router.post(
  '/upload/:relatedType/:relatedId',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  upload.single('file'),
  UploadController.uploadGeneric,
);

// ✅ Xóa ảnh
router.delete(
  '/images/:imageId',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  UploadController.deleteImage,
);

export default router;
