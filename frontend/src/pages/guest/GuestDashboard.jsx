import React from 'react';
import '../../styles/Dashboard.css';

const GuestDashboard = () => {
  return (
    <div className="dashboard">
      <h1>Guest Dashboard</h1>
      <div className="dashboard-content">
        <div className="card">
          <h2>Browse Books</h2>
          <p>Search and view available books in the library</p>
        </div>
        <div className="card">
          <h2>Library Information</h2>
          <p>Learn more about our library services</p>
        </div>
      </div>
    </div>
  );
};

export default GuestDashboard;
