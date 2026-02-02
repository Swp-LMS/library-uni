import React from 'react';
import '../../styles/Dashboard.css';

const AdminDashboard = () => {
  return (
    <div className="dashboard">
      <h1>Admin Dashboard</h1>
      <div className="dashboard-content">
        <div className="card">
          <h2>Users Management</h2>
          <p>Manage all users in the system</p>
        </div>
        <div className="card">
          <h2>Books Management</h2>
          <p>Manage library inventory</p>
        </div>
        <div className="card">
          <h2>Reports</h2>
          <p>View system reports and statistics</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
