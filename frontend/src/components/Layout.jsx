import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <div>
        <strong>Sistem SPPG</strong> | Halo, {user?.nama} ({user?.role}) | 
        <button onClick={handleLogout}>Logout</button>
      </div>
      <hr />
      <div style={{ display: 'flex' }}>
        <div style={{ width: '200px', paddingRight: '20px' }}>
          <nav>
            <ul>
              {user?.role === 'ASLAP' && (
                <li>
                  <Link to="/aslap">Penerima Manfaat</Link>
                </li>
              )}
              {user?.role === 'MITRA' && (
                <>
                  <li>
                    <Link to="/mitra">Harga Bahan</Link>
                  </li>
                  <li>
                    <Link to="/mitra/po">Nota Pesanan (PO)</Link>
                  </li>
                </>
              )}
              {user?.role === 'AKUNTAN' && (
                <>
                  <li>
                    <Link to="/akuntan/laporan/periode-setup">Setup Periode</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/jurnal">Jurnal Transaksi</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/laporan">Laporan</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/laporan/stock-barang">Stock Barang</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/laporan/kebutuhan-belanja-bahan">Belanja Bahan</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/validasi-stok">Validasi Stok</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/rab-harian">RAB Harian</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/anggaran-harian">Anggaran Harian</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/saldo-awal-barang">Input Saldo Awal</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/mutasi-stok">Mutasi Stok</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/dokumen-resmi">Dokumen Resmi</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/laporan/per-periode">Per Periode</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/laporan/per-bulan">Per Bulan</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/nominatif-upah">Nominatif Upah</Link>
                  </li>
                </>
              )}
              {user?.role === 'KEPALA_SPPG' && (
                <li>
                  <Link to="/kepala">Approval</Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
};
