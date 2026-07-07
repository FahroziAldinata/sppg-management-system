import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sun,
  Moon,
  LogOut,
  Settings,
  Home,
  Calendar,
  BookOpen,
  FileText,
  Package,
  ShoppingCart,
  ClipboardCheck,
  FileSpreadsheet,
  TrendingUp,
  PlusCircle,
  RefreshCw,
  Award,
  BarChart2,
  CalendarRange,
  Users,
  CheckSquare
} from 'lucide-react';

export const Layout = () => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // Sidebar link rendering helper with matching icon
  const renderLink = (to, label, IconComponent) => {
    const active = isActive(to);
    return (
      <li>
        <Link
          to={to}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            textDecoration: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: active ? '700' : '500',
            color: active ? 'var(--color-primary)' : 'var(--text)',
            backgroundColor: active ? 'var(--color-primary-light)' : 'transparent',
            boxShadow: active ? '0 2px 8px rgba(7, 30, 73, 0.08)' : 'none',
            border: active ? '1px solid rgba(7, 30, 73, 0.1)' : '1px solid transparent',
            transition: 'all var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = 'var(--border)';
              e.currentTarget.style.borderRadius = '12px'; // subtle morph/blob radius shift on hover
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderRadius = 'var(--radius-md)';
            }
          }}
        >
          <IconComponent size={16} strokeWidth={active ? 2.5 : 2} style={{ color: active ? 'var(--color-primary)' : 'var(--text-muted)' }} />
          <span>{label}</span>
        </Link>
      </li>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      
      {/* Fixed Header Parent Container */}
      <div style={{
        position: 'fixed',
        top: 'var(--gap-outer)',
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 var(--gap-outer)',
        pointerEvents: 'none'
      }}>
        {/* Centered Pill Header */}
        <header className="glass-panel" style={{
          pointerEvents: 'auto',
          width: 'fit-content',
          height: 'var(--header-height)',
          borderRadius: '9999px',
          display: 'flex',
          alignItems: 'center',
          gap: '40px',
          padding: '0 24px',
          boxShadow: 'var(--shadow)',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={theme === 'dark' ? '/icons/logo-bgn-dark.png' : '/icons/logo-bgn-light.png'}
            alt="SIKOP-SPPG Logo"
            style={{
              height: '36px',
              objectFit: 'contain'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-0.5px', lineHeight: '1.2' }}>SIKOP-SPPG</strong>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '500', marginTop: '1px' }} title="Sistem Informasi Keuangan dan Operasional Pelayanan SPPG">
              Sistem Informasi Keuangan dan Operasional Pelayanan SPPG
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* User Display */}
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>{user?.nama}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>{user?.role}</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'light' ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--border)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; }}
          >
            {theme === 'light' ? <Moon size={18} strokeWidth={2} /> : <Sun size={18} strokeWidth={2} />}
          </button>

          {/* Logout Header Button */}
          <button
            onClick={handleLogout}
            title="Keluar"
            style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--color-danger)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
          >
            <LogOut size={14} strokeWidth={2.2} />
            <span>Keluar</span>
          </button>
        </div>
      </header>
    </div>

      {/* Fixed Sidebar */}
      <aside className="glass-panel" style={{
        position: 'fixed',
        top: 'calc(var(--header-height) + var(--gap-outer) * 2)',
        left: 'var(--gap-outer)',
        bottom: 'var(--gap-outer)',
        width: 'var(--sidebar-width)',
        padding: '24px var(--gap-outer)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        zIndex: 90,
        backgroundColor: 'var(--bg-elevated)'
      }}>
          <nav style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              
              {/* ASLAP Navigation */}
              {user?.role === 'ASLAP' && (
                <>
                  <li style={{ padding: '0 14px', marginBottom: '8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Menu Aslap
                  </li>
                  {renderLink('/aslap', 'Beranda / Dashboard', Home)}
                  {renderLink('/aslap/penerima-manfaat', 'Penerima Manfaat', Users)}
                </>
              )}

              {/* MITRA Navigation */}
              {user?.role === 'MITRA' && (
                <>
                  <li style={{ padding: '0 14px', marginBottom: '8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Menu Mitra
                  </li>
                  {renderLink('/mitra', 'Beranda / Dashboard', Home)}
                  {renderLink('/mitra/harga-bahan', 'Harga Bahan', BookOpen)}
                  {renderLink('/mitra/po', 'Nota Pesanan (PO)', ClipboardCheck)}
                </>
              )}

              {/* AHLI_GIZI Navigation */}
              {user?.role === 'AHLI_GIZI' && (
                <>
                  <li style={{ padding: '0 14px', marginBottom: '8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Menu Gizi
                  </li>
                  {renderLink('/gizi', 'Beranda / Dashboard', Home)}
                  {renderLink('/gizi/menu-harian', 'Menu Harian', FileSpreadsheet)}
                </>
              )}

              {/* AKUNTAN Navigation */}
              {user?.role === 'AKUNTAN' && (
                <>
                  <li style={{ padding: '0 14px', marginBottom: '8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Menu Akuntan
                  </li>
                  {renderLink('/akuntan', 'Beranda / Dashboard', Home)}
                  
                  <li style={{ padding: '8px 14px 4px 14px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
                    Operasional
                  </li>
                  {renderLink('/akuntan/laporan/periode-setup', 'Setup Periode', Calendar)}
                  {renderLink('/akuntan/jurnal', 'Jurnal Transaksi', BookOpen)}
                  {renderLink('/akuntan/rab-harian', 'RAB Harian', FileSpreadsheet)}
                  {renderLink('/akuntan/anggaran-harian', 'Anggaran Harian', TrendingUp)}
                  {renderLink('/akuntan/dokumen-resmi', 'Dokumen Resmi', Award)}
                  {renderLink('/akuntan/nominatif-upah', 'Nominatif Upah', Users)}

                  <li style={{ padding: '8px 14px 4px 14px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
                    Stok &amp; Gudang
                  </li>
                  {renderLink('/akuntan/saldo-awal-barang', 'Input Saldo Awal', PlusCircle)}
                  {renderLink('/akuntan/mutasi-stok', 'Mutasi Stok', RefreshCw)}
                  {renderLink('/akuntan/validasi-stok', 'Validasi Stok', ClipboardCheck)}

                  <li style={{ padding: '8px 14px 4px 14px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
                    Laporan
                  </li>
                  {renderLink('/akuntan/laporan', 'Laporan BKU', FileText)}
                  {renderLink('/akuntan/laporan/stock-barang', 'Stock Barang', Package)}
                  {renderLink('/akuntan/laporan/kebutuhan-belanja-bahan', 'Belanja Bahan', ShoppingCart)}
                  {renderLink('/akuntan/laporan/per-periode', 'Per Periode', BarChart2)}
                  {renderLink('/akuntan/laporan/per-bulan', 'Per Bulan', CalendarRange)}
                </>
              )}

              {/* KEPALA_SPPG Navigation */}
              {user?.role === 'KEPALA_SPPG' && (
                <>
                  <li style={{ padding: '0 14px', marginBottom: '8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Menu Kepala
                  </li>
                  {renderLink('/kepala', 'Beranda / Dashboard', Home)}
                  {renderLink('/kepala/approval', 'Approval / Persetujuan', CheckSquare)}
                </>
              )}

            </ul>
          </nav>

          {/* Footer Navigation Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            {/* Settings Tautan */}
            <Link
              to="/setting"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                textDecoration: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: isActive('/setting') ? '700' : '500',
                color: isActive('/setting') ? 'var(--color-primary)' : 'var(--text)',
                backgroundColor: isActive('/setting') ? 'var(--color-primary-light)' : 'transparent',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/setting')) {
                  e.currentTarget.style.backgroundColor = 'var(--border)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/setting')) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Settings size={16} strokeWidth={isActive('/setting') ? 2.5 : 2} style={{ color: isActive('/setting') ? 'var(--color-primary)' : 'var(--text-muted)' }} />
              <span>Pengaturan Profil</span>
            </Link>

            {/* Logout Tautan */}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                width: '100%',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--color-danger)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <LogOut size={16} strokeWidth={2} style={{ color: 'var(--color-danger)' }} />
              <span>Keluar (Logout)</span>
            </button>
          </div>
      </aside>

      {/* Main Content Area (Offset for Fixed Header and Sidebar) */}
      <main style={{
        marginLeft: 'calc(var(--sidebar-width) + var(--gap-outer) * 2)',
        paddingTop: 'calc(var(--header-height) + var(--gap-outer) * 2)',
        paddingLeft: '40px',
        paddingRight: '40px',
        paddingBottom: '40px',
        minHeight: '100vh'
      }}>
        <Outlet />
      </main>
    </div>
  );
};
