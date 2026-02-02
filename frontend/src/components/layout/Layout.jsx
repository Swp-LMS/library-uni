import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import '../styles/Layout.css';

const Layout = () => {
  return (
    <div className="layout">
      <Header />
      <div className="layout-container">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;
