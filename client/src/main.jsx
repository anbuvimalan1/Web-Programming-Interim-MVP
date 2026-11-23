import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser } from './api.js';
import Layout from './Layout.jsx';
import Login from './pages/Login.jsx';
import Books from './pages/Books.jsx';
import BookDetail from './pages/BookDetail.jsx';
import Authors from './pages/Authors.jsx';
import Loans from './pages/Loans.jsx';
import Users from './pages/Users.jsx';
import './styles.css';

function Protected({ roles, children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/books" replace />;
  return <Layout>{children}</Layout>;
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/books" element={<Protected><Books /></Protected>} />
      <Route path="/books/:id" element={<Protected><BookDetail /></Protected>} />
      <Route path="/authors" element={<Protected roles={['librarian', 'admin']}><Authors /></Protected>} />
      <Route path="/loans" element={<Protected><Loans /></Protected>} />
      <Route path="/users" element={<Protected roles={['admin']}><Users /></Protected>} />
      <Route path="*" element={<Navigate to="/books" replace />} />
    </Routes>
  </BrowserRouter>
);
