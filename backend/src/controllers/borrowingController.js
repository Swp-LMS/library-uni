const BorrowingRecord = require('../models/BorrowingRecord');
const Book = require('../models/Book');

exports.borrowBook = async (req, res) => {
  try {
    const { bookId, dueDate } = req.body;
    const userId = req.user.id;

    const book = await Book.findByPk(bookId);
    if (!book || book.availableCopies <= 0) {
      return res.status(400).json({ message: 'Book not available' });
    }

    const record = await BorrowingRecord.create({
      userId,
      bookId,
      dueDate
    });

    await book.update({ availableCopies: book.availableCopies - 1 });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.returnBook = async (req, res) => {
  try {
    const { recordId } = req.body;

    const record = await BorrowingRecord.findByPk(recordId);
    if (!record) {
      return res.status(404).json({ message: 'Borrowing record not found' });
    }

    const book = await Book.findByPk(record.bookId);
    await book.update({ availableCopies: book.availableCopies + 1 });

    await record.update({
      returnDate: new Date(),
      status: 'returned'
    });

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBorrowingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const records = await BorrowingRecord.findAll({ where: { userId } });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllBorrowingRecords = async (req, res) => {
  try {
    const records = await BorrowingRecord.findAll();
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
