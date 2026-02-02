const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Book = sequelize.define('Book', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  author: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isbn: {
    type: DataTypes.STRING,
    unique: true
  },
  description: {
    type: DataTypes.TEXT
  },
  categoryId: {
    type: DataTypes.UUID,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  totalCopies: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  availableCopies: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  publisher: {
    type: DataTypes.STRING
  },
  publishedYear: {
    type: DataTypes.INTEGER
  },
  status: {
    type: DataTypes.ENUM('available', 'borrowed', 'maintenance', 'archived'),
    defaultValue: 'available'
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
  tableName: 'books',
  timestamps: true
});

module.exports = Book;
