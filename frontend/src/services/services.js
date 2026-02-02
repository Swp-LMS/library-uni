import api from './api';

export const authService = {
  register: (email, password, firstName, lastName) =>
    api.post('/auth/register', { email, password, firstName, lastName }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  logout: () =>
    api.post('/auth/logout'),
};

export const bookService = {
  getAll: () =>
    api.get('/books'),
  getById: (id) =>
    api.get(`/books/${id}`),
  create: (data) =>
    api.post('/books', data),
  update: (id, data) =>
    api.put(`/books/${id}`, data),
  delete: (id) =>
    api.delete(`/books/${id}`),
};

export const userService = {
  getAll: () =>
    api.get('/users'),
  getById: (id) =>
    api.get(`/users/${id}`),
  update: (id, data) =>
    api.put(`/users/${id}`, data),
  delete: (id) =>
    api.delete(`/users/${id}`),
};

export const borrowingService = {
  borrowBook: (bookId, dueDate) =>
    api.post('/borrowing/borrow', { bookId, dueDate }),
  returnBook: (recordId) =>
    api.post('/borrowing/return', { recordId }),
  getHistory: () =>
    api.get('/borrowing/history'),
  getAll: () =>
    api.get('/borrowing'),
};
