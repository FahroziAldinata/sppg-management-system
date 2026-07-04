import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Layout } from './components/Layout';
import { AslapDashboard } from './pages/aslap/AslapDashboard';
import { useAuth } from './context/AuthContext';

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ASLAP') return <Navigate to="/aslap" replace />;
  return <div>Selamat datang, {user.nama} ({user.role}). Halaman modul Anda belum diimplementasikan.</div>;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RoleRedirect />} />
            <Route
              path="aslap"
              element={
                <ProtectedRoute allowedRoles={['ASLAP']}>
                  <AslapDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<div>Halaman tidak ditemukan</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
