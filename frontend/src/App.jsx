import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Layout } from './components/Layout';
import { AslapDashboard } from './pages/aslap/AslapDashboard';
import { MitraDashboard } from './pages/mitra/MitraDashboard';
import { MenuHarianList } from './pages/gizi/MenuHarianList';
import { AkuntanDashboard } from './pages/akuntan/AkuntanDashboard';
import { KepalaDashboard } from './pages/kepala/KepalaDashboard';
import { LaporanPage } from './pages/akuntan/laporan/LaporanPage';
import { StockBarangPage } from './pages/akuntan/laporan/StockBarangPage';
import { KebutuhanBelanjaBahanPage } from './pages/akuntan/laporan/KebutuhanBelanjaBahanPage';
import { LaporanPerPeriodePage } from './pages/akuntan/laporan/LaporanPerPeriodePage';
import { LaporanPerBulanPage } from './pages/akuntan/laporan/LaporanPerBulanPage';
import { PeriodeSetupPage } from './pages/akuntan/laporan/PeriodeSetupPage';
import { useAuth } from './context/AuthContext';

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ASLAP') return <Navigate to="/aslap" replace />;
  if (user.role === 'MITRA') return <Navigate to="/mitra" replace />;
  if (user.role === 'AHLI_GIZI') return <Navigate to="/gizi/menu-harian" replace />;
  if (user.role === 'AKUNTAN') return <Navigate to="/akuntan" replace />;
  if (user.role === 'KEPALA_SPPG') return <Navigate to="/kepala" replace />;
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
            <Route
              path="mitra"
              element={
                <ProtectedRoute allowedRoles={['MITRA']}>
                  <MitraDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="gizi/menu-harian"
              element={
                <ProtectedRoute allowedRoles={['AHLI_GIZI']}>
                  <MenuHarianList />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <AkuntanDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <LaporanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/stock-barang"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <StockBarangPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/kebutuhan-belanja-bahan"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <KebutuhanBelanjaBahanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/per-periode"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <LaporanPerPeriodePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/per-bulan"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <LaporanPerBulanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/laporan/periode-setup"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <PeriodeSetupPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="kepala"
              element={
                <ProtectedRoute allowedRoles={['KEPALA_SPPG']}>
                  <KepalaDashboard />
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
