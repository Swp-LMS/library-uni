/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express';
import { jwtAuthMiddleware } from '@/modules/auth/jwtAuthMiddleware';
import { authorizeRoles } from '@/middlewares/authorizeRoles';
import { UserRole } from '@/modules/users/enums/user.enum';

import {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
} from '@/modules/books/book.controller';
import { SettingsController } from '@/modules/settings/settings.controller';
import { BorrowRecordController } from '@/modules/borrowRecords/borrowRecord.controller';
import { AdminController } from '@/modules/admin/admin.controller';

const router = Router();
const adminCtrl = new AdminController();

/* -------------------------------------------------------
 * 🔒 Middleware: yêu cầu JWT + role Admin/Librarian
 * ------------------------------------------------------- */
router.use(jwtAuthMiddleware, authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN));

/* -------------------------------------------------------
 * 🧠 Chặn cache để tránh dữ liệu 304 cũ
 * ------------------------------------------------------- */
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

/* =======================================================
 * 📚 BOOKS MANAGEMENT (Admin + Librarian)
 * ======================================================= */
router.get('/books', getBooks);
router.get('/books/:id', getBookById);
router.post('/books', createBook);
router.put('/books/:id', updateBook);
router.patch('/books/:id', updateBook);
router.delete('/books/:id', deleteBook);

/* =======================================================
 * ⚙️ SETTINGS MANAGEMENT (Admin + Librarian)
 * ======================================================= */
router.get('/settings', SettingsController.getSettings);
router.patch('/settings', SettingsController.updateSettings);

/* =======================================================
 * 📊 DASHBOARD / STATISTICS (Admin + Librarian)
 * ======================================================= */
router.get('/overview', (req, res) => adminCtrl.overview(req, res));
router.get('/loans', (req, res) => adminCtrl.loans(req, res)); // ?status=&from=&to=&limit=
router.get('/top-books', (req, res) => adminCtrl.topBooks(req, res)); // ?limit=5
router.get('/stats/loans', (req, res) => adminCtrl.statsLoans(req, res)); // ?days=7

/* =======================================================
 * 💸 OVERDUE / PAYMENTS MANAGEMENT (Admin + Librarian)
 * ======================================================= */
router.get('/overdue', (req, res) => adminCtrl.overduePaged(req, res));
router.post('/payments', (req, res) => adminCtrl.recordPayment(req, res));
router.patch('/loans/:id/fine', (req, res) => adminCtrl.patchFine(req, res));
router.post('/loans/:id/remind', (req, res) => adminCtrl.remindLoan(req, res));
router.get('/payments/receipt', (req, res) => adminCtrl.receipt(req, res));

/* =======================================================
 * 📩 BORROW RECORD UTILITIES (Admin + Librarian)
 * ======================================================= */
router.post('/borrow-records/:id/remind', BorrowRecordController.sendReminder);

export default router;
