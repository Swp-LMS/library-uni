import React from 'react';
import '../styles/Dashboard.css';

const StudentDashboard = () => {
  return (
    <div className="dashboard">
      <h1>Student Dashboard</h1>
      <div className="dashboard-content">
        <div className="card">
          <h2>My Books</h2>
          <p>View and manage your borrowed books</p>
        </div>
        <div className="card">
          <h2>Borrowing History</h2>
          <p>Check your borrowing history</p>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
