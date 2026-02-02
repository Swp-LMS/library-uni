import React from 'react';
import '../styles/Dashboard.css';

const Home = () => {
  return (
    <div className="dashboard">
      <h1>Welcome to LibraryUni</h1>
      <div className="dashboard-content">
        <div className="card">
          <h2>Library Management System</h2>
          <p>A comprehensive solution for managing university library resources</p>
        </div>
        <div className="card">
          <h2>Features</h2>
          <p>Book management, borrowing tracking, and user management</p>
        </div>
        <div className="card">
          <h2>Role-Based Access</h2>
          <p>Student, Lecturer, Librarian, and Admin roles with specific permissions</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
