import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import '../../styles/Sidebar.css';

const Sidebar = () => {
  const { user } = useContext(AuthContext);

  const getMenuItems = () => {
    if (!user) {
      return [];
    }

    switch (user.role) {
      case 'student':
        return [
          { label: 'Dashboard', path: '/student' },
          { label: 'My Books', path: '/student/books' },
          { label: 'Borrowing History', path: '/student/history' },
        ];
      case 'lecturer':
        return [
          { label: 'Dashboard', path: '/lecturer' },
          { label: 'My Books', path: '/lecturer/books' },
        ];
      case 'librarian':
        return [
          { label: 'Dashboard', path: '/librarian' },
          { label: 'Manage Books', path: '/librarian/books' },
          { label: 'Borrowing Records', path: '/librarian/records' },
        ];
      case 'admin':
        return [
          { label: 'Dashboard', path: '/admin' },
          { label: 'Users', path: '/admin/users' },
          { label: 'Books', path: '/admin/books' },
          { label: 'Reports', path: '/admin/reports' },
        ];
      default:
        return [];
    }
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {getMenuItems().map((item) => (
          <Link key={item.path} to={item.path} className="nav-item">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
