import { Router } from 'express';
import multer from 'multer';
import {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  importBooks,
} from '../modules/books/book.controller';
import { jwtAuthMiddleware } from '@/modules/auth/jwtAuthMiddleware';
import { authorizeRoles } from '@/middlewares/authorizeRoles';
import { UserRole } from '@/modules/users/enums/user.enum';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Public routes - Không cần authentication
 * Người dùng có thể xem danh sách và chi tiết sách
 */

router.get('/', getBooks); // GET /api/books
router.get('/:id', getBookById); // GET /api/books/:id

/**
 * Protected routes - cần login + role
 */

// Tạo 1 book
router.post('/', jwtAuthMiddleware, authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN), createBook);

// Update book
router.put(
  '/:id',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  updateBook,
);

// Delete book
router.delete('/:id', jwtAuthMiddleware, authorizeRoles(UserRole.ADMIN), deleteBook);

// 📥 Import nhiều book từ file CSV/Excel
router.post(
  '/import',
  jwtAuthMiddleware,
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  upload.single('file'),
  importBooks,
);

export default router;
