export enum NotiType {
  // 📚 Liên quan đến mượn/trả
  BOOK_DUE_REMINDER = 'book_due_reminder', // nhắc trả sách
  BOOK_BORROWED = 'book_borrowed', // đã mượn sách
  BOOK_RETURNED = 'book_returned', // đã trả sách
  FINE = 'fine', // có khoản phạt

  // 📖 Liên quan đến đặt chỗ
  RESERVATION_CREATED = 'reservation_created', // reader đặt chỗ
  RESERVATION_APPROVED = 'reservation_approved', // librarian duyệt
  RESERVATION_REJECTED = 'reservation_rejected', // librarian từ chối
  RESERVATION_EXPIRED = 'reservation_expired', // hết hạn giữ chỗ
  BORROW_CONFIRMED = 'borrow_confirmed', //xác nhận tạo phiếu thành công
  BORROW_REMINDER = 'borrow_reminder',

  // ⚙️ Hệ thống / quản trị
  SYSTEM = 'system',
}
