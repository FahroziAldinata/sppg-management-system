import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Layout } from './components/Layout';

// Landing Dashboards
import { AslapDashboard } from './pages/aslap/AslapDashboard';
import { MitraDashboard } from './pages/mitra/MitraDashboard';
import { GiziDashboard } from './pages/gizi/GiziDashboard';
import { AkuntanDashboard } from './pages/akuntan/AkuntanDashboard';
import { KepalaDashboard } from './pages/kepala/KepalaDashboard';

// Sub-pages / CRUD Pages
import { PenerimaManfaatPage } from './pages/aslap/PenerimaManfaatPage';
import { HargaBahanPage } from './pages/mitra/HargaBahanPage';
import { MitraPoPage } from './pages/mitra/MitraPoPage';
import { MenuHarianPage } from './pages/gizi/MenuHarianPage';
import { ApprovalPage } from './pages/kepala/ApprovalPage';
import { SettingPage } from './pages/shared/SettingPage';

// Akuntan — Halaman Terpisah
import { JurnalTransaksiPage } from './pages/akuntan/JurnalTransaksiPage';
import { ValidasiStokPage } from './pages/akuntan/ValidasiStokPage';
import { RabHarianPage } from './pages/akuntan/RabHarianPage';
import { AnggaranHarianPage } from './pages/akuntan/AnggaranHarianPage';
import { SaldoAwalBarangPage } from './pages/akuntan/SaldoAwalBarangPage';
import { MutasiStokPage } from './pages/akuntan/MutasiStokPage';
import { DokumenResmiPage } from './pages/akuntan/DokumenResmiPage';
import { NominatifUpahPage } from './pages/akuntan/NominatifUpahPage';

// Akuntan — Laporan
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
  if (user.role === 'AHLI_GIZI') return <Navigate to="/gizi" replace />;
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

            {/* ===== ASLAP Routes ===== */}
            <Route
              path="aslap"
              element={
                <ProtectedRoute allowedRoles={['ASLAP']}>
                  <AslapDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="aslap/penerima-manfaat"
              element={
                <ProtectedRoute allowedRoles={['ASLAP']}>
                  <PenerimaManfaatPage />
                </ProtectedRoute>
              }
            />

            {/* ===== MITRA Routes ===== */}
            <Route
              path="mitra"
              element={
                <ProtectedRoute allowedRoles={['MITRA']}>
                  <MitraDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="mitra/harga-bahan"
              element={
                <ProtectedRoute allowedRoles={['MITRA']}>
                  <HargaBahanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="mitra/po"
              element={
                <ProtectedRoute allowedRoles={['MITRA']}>
                  <MitraPoPage />
                </ProtectedRoute>
              }
            />

            {/* ===== AHLI_GIZI Routes ===== */}
            <Route
              path="gizi"
              element={
                <ProtectedRoute allowedRoles={['AHLI_GIZI']}>
                  <GiziDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="gizi/menu-harian"
              element={
                <ProtectedRoute allowedRoles={['AHLI_GIZI']}>
                  <MenuHarianPage />
                </ProtectedRoute>
              }
            />

            {/* ===== AKUNTAN Routes ===== */}
            <Route
              path="akuntan"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <AkuntanDashboard />
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
              path="akuntan/jurnal"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <JurnalTransaksiPage />
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
              path="akuntan/validasi-stok"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <ValidasiStokPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/rab-harian"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <RabHarianPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/anggaran-harian"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <AnggaranHarianPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/saldo-awal-barang"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <SaldoAwalBarangPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/mutasi-stok"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <MutasiStokPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="akuntan/dokumen-resmi"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <DokumenResmiPage />
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
              path="akuntan/nominatif-upah"
              element={
                <ProtectedRoute allowedRoles={['AKUNTAN']}>
                  <NominatifUpahPage />
                </ProtectedRoute>
              }
            />

            {/* ===== KEPALA Routes ===== */}
            <Route
              path="kepala"
              element={
                <ProtectedRoute allowedRoles={['KEPALA_SPPG']}>
                  <KepalaDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="kepala/approval"
              element={
                <ProtectedRoute allowedRoles={['KEPALA_SPPG']}>
                  <ApprovalPage />
                </ProtectedRoute>
              }
            />

            {/* ===== SHARED Routes ===== */}
            <Route
              path="setting"
              element={
                <ProtectedRoute>
                  <SettingPage />
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
