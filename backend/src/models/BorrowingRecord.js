const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BorrowingRecord = sequelize.define('BorrowingRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    references: {
      model: 'users',
      key: 'id'
    },
    allowNull: false
  },
  bookId: {
    type: DataTypes.UUID,
    references: {
      model: 'books',
      key: 'id'
    },
    allowNull: false
  },
  borrowDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  returnDate: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.ENUM('borrowed', 'returned', 'overdue', 'lost'),
    defaultValue: 'borrowed'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'borrowing_records',
  timestamps: true
});

module.exports = BorrowingRecord;
