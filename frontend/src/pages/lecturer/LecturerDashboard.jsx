import React from 'react';
import '../../styles/Dashboard.css';

const LecturerDashboard = () => {
  return (
    <div className="dashboard">
      <h1>Lecturer Dashboard</h1>
      <div className="dashboard-content">
        <div className="card">
          <h2>My Books</h2>
          <p>View and manage your resources</p>
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboard;
