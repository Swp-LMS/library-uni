const express = require('express');
const router = express.Router();
const borrowingController = require('../controllers/borrowingController');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

router.post('/borrow', authenticateToken, borrowingController.borrowBook);
router.post('/return', authenticateToken, borrowingController.returnBook);
router.get('/history', authenticateToken, borrowingController.getBorrowingHistory);
router.get('/', authenticateToken, authorizeRole('admin', 'librarian'), borrowingController.getAllBorrowingRecords);

module.exports = router;
