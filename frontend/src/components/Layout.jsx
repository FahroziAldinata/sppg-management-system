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
      <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>Sistem SPPG</strong> | Halo, {user?.nama} ({user?.role})
        </div>
        <div>
          <button onClick={handleLogout} style={{ padding: '4px 10px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>
      <hr style={{ margin: '0' }} />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 50px)' }}>
        {/* Navigation Sidebar */}
        <div style={{ width: '220px', padding: '15px', borderRight: '1px solid #ddd', backgroundColor: '#fdfdfd' }}>
          <nav>
            <ul style={{ listStyleType: 'none', padding: '0', margin: '0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              {/* ASLAP Navigation */}
              {user?.role === 'ASLAP' && (
                <>
                  <li style={{ fontWeight: 'bold', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Menu Aslap</li>
                  <li>
                    <Link to="/aslap" style={{ textDecoration: 'none', color: '#007bff' }}>Beranda / Dashboard</Link>
                  </li>
                  <li>
                    <Link to="/aslap/penerima-manfaat" style={{ textDecoration: 'none', color: '#333' }}>Penerima Manfaat</Link>
                  </li>
                </>
              )}

              {/* MITRA Navigation */}
              {user?.role === 'MITRA' && (
                <>
                  <li style={{ fontWeight: 'bold', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Menu Mitra</li>
                  <li>
                    <Link to="/mitra" style={{ textDecoration: 'none', color: '#28a745' }}>Beranda / Dashboard</Link>
                  </li>
                  <li>
                    <Link to="/mitra/harga-bahan" style={{ textDecoration: 'none', color: '#333' }}>Harga Bahan</Link>
                  </li>
                  <li>
                    <Link to="/mitra/po" style={{ textDecoration: 'none', color: '#333' }}>Nota Pesanan (PO)</Link>
                  </li>
                </>
              )}

              {/* AHLI_GIZI Navigation */}
              {user?.role === 'AHLI_GIZI' && (
                <>
                  <li style={{ fontWeight: 'bold', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Menu Gizi</li>
                  <li>
                    <Link to="/gizi" style={{ textDecoration: 'none', color: '#fd7e14' }}>Beranda / Dashboard</Link>
                  </li>
                  <li>
                    <Link to="/gizi/menu-harian" style={{ textDecoration: 'none', color: '#333' }}>Menu Harian</Link>
                  </li>
                </>
              )}

              {/* AKUNTAN Navigation */}
              {user?.role === 'AKUNTAN' && (
                <>
                  <li style={{ fontWeight: 'bold', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Menu Akuntan</li>
                  <li>
                    <Link to="/akuntan" style={{ textDecoration: 'none', color: '#6f42c1', fontWeight: 'bold' }}>Beranda / Dashboard</Link>
                  </li>
                  <li style={{ margin: '5px 0 2px 0', fontSize: '11px', color: '#999', borderTop: '1px solid #eee', paddingTop: '4px' }}>OPERASIONAL</li>
                  <li>
                    <Link to="/akuntan/laporan/periode-setup" style={{ textDecoration: 'none', color: '#555' }}>Setup Periode</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/jurnal" style={{ textDecoration: 'none', color: '#555' }}>Jurnal Transaksi</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/rab-harian" style={{ textDecoration: 'none', color: '#555' }}>RAB Harian</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/anggaran-harian" style={{ textDecoration: 'none', color: '#555' }}>Anggaran Harian</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/dokumen-resmi" style={{ textDecoration: 'none', color: '#555' }}>Dokumen Resmi</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/nominatif-upah" style={{ textDecoration: 'none', color: '#555' }}>Nominatif Upah</Link>
                  </li>
                  <li style={{ margin: '5px 0 2px 0', fontSize: '11px', color: '#999', borderTop: '1px solid #eee', paddingTop: '4px' }}>STOK &amp; GUDANG</li>
                  <li>
                    <Link to="/akuntan/saldo-awal-barang" style={{ textDecoration: 'none', color: '#555' }}>Input Saldo Awal</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/mutasi-stok" style={{ textDecoration: 'none', color: '#555' }}>Mutasi Stok</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/validasi-stok" style={{ textDecoration: 'none', color: '#555' }}>Validasi Stok</Link>
                  </li>
                  <li style={{ margin: '5px 0 2px 0', fontSize: '11px', color: '#999', borderTop: '1px solid #eee', paddingTop: '4px' }}>LAPORAN</li>
                  <li>
                    <Link to="/akuntan/laporan" style={{ textDecoration: 'none', color: '#555' }}>Laporan BKU</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/laporan/stock-barang" style={{ textDecoration: 'none', color: '#555' }}>Stock Barang</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/laporan/kebutuhan-belanja-bahan" style={{ textDecoration: 'none', color: '#555' }}>Belanja Bahan</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/laporan/per-periode" style={{ textDecoration: 'none', color: '#555' }}>Per Periode</Link>
                  </li>
                  <li>
                    <Link to="/akuntan/laporan/per-bulan" style={{ textDecoration: 'none', color: '#555' }}>Per Bulan</Link>
                  </li>
                </>
              )}

              {/* KEPALA_SPPG Navigation */}
              {user?.role === 'KEPALA_SPPG' && (
                <>
                  <li style={{ fontWeight: 'bold', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Menu Kepala</li>
                  <li>
                    <Link to="/kepala" style={{ textDecoration: 'none', color: '#007bff' }}>Beranda / Dashboard</Link>
                  </li>
                  <li>
                    <Link to="/kepala/approval" style={{ textDecoration: 'none', color: '#333' }}>Approval / Persetujuan</Link>
                  </li>
                </>
              )}

              {/* SHARED SETTING & LOGOUT AT BOTTOM */}
              <li style={{ borderTop: '2px solid #ddd', marginTop: '15px', paddingTop: '10px' }}>
                <Link to="/setting" style={{ textDecoration: 'none', color: '#495057', display: 'block', fontWeight: '500' }}>
                  ⚙️ Pengaturan Profil
                </Link>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    padding: '0',
                    color: '#dc3545',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontFamily: 'inherit',
                    fontSize: 'inherit'
                  }}
                >
                  🚪 Keluar (Logout)
                </button>
              </li>

            </ul>
          </nav>
        </div>
        {/* Main Content Area */}
        <div style={{ flex: '1', padding: '20px' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};
