import { Router } from 'express';
import { BorrowRecordController } from '@/modules/borrowRecords/borrowRecord.controller';
import { jwtAuthMiddleware } from '@/modules/auth/jwtAuthMiddleware';
import { authorizeRoles } from '@/middlewares/authorizeRoles';
import { UserRole } from '@/modules/users/enums/user.enum';

const router = Router();

/**
 * ✅ Tất cả routes borrow-records yêu cầu đăng nhập
 */
router.use(jwtAuthMiddleware);

/**
 * ⚠️ ĐẶT /cron LÊN TRÊN /:id ĐỂ KHÔNG BỊ NUỐT NHẦM
 */
router.post(
  '/cron/reminders',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  BorrowRecordController.runDueTomorrowReminders,
);

router.post(
  '/cron/fines',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  BorrowRecordController.runProcessOverdueFines,
);

router.post(
  '/cron/blacklist-check',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  BorrowRecordController.checkAndBlacklistOverdueUsers,
);

/**
 * 🔹 Librarian xác nhận mượn sách từ reservation
 * POST /api/borrow-records/confirm/:reservationId
 */
router.post(
  '/confirm/:reservationId',
  authorizeRoles(UserRole.LIBRARIAN, UserRole.ADMIN),
  async (req, res) => {
    const librarianId = req.user?.sub;
    req.body.librarianId = librarianId;
    return BorrowRecordController.confirmBorrow(req, res);
  },
);

/**
 * 🔹 (OPTIONAL) Recent loans cho dashboard / trang khác
 */
// router.get('/recent',
//   authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
//   BorrowRecordController.recentForDashboard,
// );

/**
 * 🔹 (OPTIONAL) Loans due trong 7 ngày tới
 */
// router.get('/due-in-7-days',
//   authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
//   BorrowRecordController.dueIn7DaysForDashboard,
// );

/**
 * 🔹 Tạo phiếu mượn mới (cho phép Admin/Librarian tạo thủ công)
 */
router.post('/', authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN), BorrowRecordController.create);

/**
 * 🔹 Danh sách Borrow Records
 *    ✅ Cho phép cả READERS để FE gọi lấy phiếu mượn của chính mình
 */
router.get(
  '/',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN, UserRole.READERS),
  BorrowRecordController.list,
);

/**
 * 🔹 Lấy 1 Borrow Record
 */
router.get(
  '/:id',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN, UserRole.READERS),
  BorrowRecordController.getById,
);

/**
 * 🔹 Cập nhật Borrow Record
 */
router.patch(
  '/:id',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  BorrowRecordController.update,
);

/**
 * 🔹 Xóa Borrow Record
 */
router.delete('/:id', authorizeRoles(UserRole.ADMIN), BorrowRecordController.remove);

/**
 * 🔹 Đánh dấu đã trả (Mark returned) – dùng cho status = BORROWED
 */
router.post(
  '/:id/return',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  BorrowRecordController.markReturned,
);

router.post(
  '/:id/cancel',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  BorrowRecordController.cancelOne,
);

/**
 * 🔹 Thanh toán phiếu phạt (status = LATE)
 */
router.post(
  '/:id/pay',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  BorrowRecordController.payFine,
);

/**
 * 🔹 Gửi thông báo nhắc nhở quá hạn (manual)
 */
router.post('/:id/remind', authorizeRoles(UserRole.LIBRARIAN), BorrowRecordController.sendReminder);

/**
 * 🔹 Lấy tổng tiền phạt
 */

router.get(
  '/:id/total-fine',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN, UserRole.READERS),
  BorrowRecordController.getTotalFine,
);

/**
 * 🔹 Thêm 1 copy vào phiếu mượn đang mở
 */
router.post(
  '/:id/add-copy',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  BorrowRecordController.addCopyToBorrowRecord,
);

/**
 * 🔹 Thanh toán tiền cọc (deposit) cho BorrowRecord
 */
router.post(
  '/:id/pay-deposit',
  authorizeRoles(UserRole.ADMIN, UserRole.LIBRARIAN),
  BorrowRecordController.payDeposit,
);

router.post(
  '/:id/extend-due-date',
  authorizeRoles(UserRole.READERS),
  BorrowRecordController.extendDueDate,
);

export default router;
