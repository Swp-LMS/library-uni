import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './routes/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/student/StudentDashboard';
import LecturerDashboard from './pages/lecturer/LecturerDashboard';
import LibrarianDashboard from './pages/librarian/LibrarianDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route
              path="/student/*"
              element={<ProtectedRoute role="student" component={StudentDashboard} />}
            />
            <Route
              path="/lecturer/*"
              element={<ProtectedRoute role="lecturer" component={LecturerDashboard} />}
            />
            <Route
              path="/librarian/*"
              element={<ProtectedRoute role="librarian" component={LibrarianDashboard} />}
            />
            <Route
              path="/admin/*"
              element={<ProtectedRoute role="admin" component={AdminDashboard} />}
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
