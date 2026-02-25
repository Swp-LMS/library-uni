const USER_ROLES = {
  STUDENT: 'student',
  LECTURER: 'lecturer',
  LIBRARIAN: 'librarian',
  ADMIN: 'admin'
};

const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
};

const BOOK_STATUS = {
  AVAILABLE: 'available',
  BORROWED: 'borrowed',
  MAINTENANCE: 'maintenance',
  ARCHIVED: 'archived'
};

const BORROWING_STATUS = {
  BORROWED: 'borrowed',
  RETURNED: 'returned',
  OVERDUE: 'overdue',
  LOST: 'lost'
};

module.exports = {
  USER_ROLES,
  USER_STATUS,
  BOOK_STATUS,
  BORROWING_STATUS
};
