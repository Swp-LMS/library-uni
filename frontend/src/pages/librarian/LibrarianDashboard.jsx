import React from 'react';
import '../../styles/Dashboard.css';

const LibrarianDashboard = () => {
  return (
    <div className="dashboard">
      <h1>Librarian Dashboard</h1>
      <div className="dashboard-content">
        <div className="card">
          <h2>Manage Books</h2>
          <p>Add, edit, or remove books from the library</p>
        </div>
        <div className="card">
          <h2>Borrowing Records</h2>
          <p>Monitor all borrowing activities</p>
        </div>
      </div>
    </div>
  );
};

export default LibrarianDashboard;
