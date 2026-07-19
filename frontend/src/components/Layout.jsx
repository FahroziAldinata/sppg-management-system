import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
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
  Truck,
  TrendingUp,
  PlusCircle,
  RefreshCw,
  Award,
  BarChart2,
  CalendarRange,
  Users,
  CheckSquare,
  Bell,
  Bug
} from 'lucide-react';


export const Layout = () => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const api = useApi();
  const toast = useToast();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifikasi, setNotifikasi] = useState([]);
  const [loading, setLoading] = useState(false);
  const notifContainerRef = useRef(null);

  // Bug report form state
  const [bugFormOpen, setBugFormOpen] = useState(false);
  const [bugForm, setBugForm] = useState({ judul: '', deskripsi: '' });
  const [bugSubmitting, setBugSubmitting] = useState(false);

  const handleSubmitBug = async (e) => {
    e.preventDefault();
    if (!bugForm.judul.trim() || !bugForm.deskripsi.trim()) return;
    setBugSubmitting(true);
    try {
      const res = await api.request('/laporan-bug/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bugForm),
      });
      if (res.ok) {
        toast.success('Laporan bug berhasil dikirim. Terima kasih!');
        setBugFormOpen(false);
        setBugForm({ judul: '', deskripsi: '' });
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Gagal mengirim laporan bug');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setBugSubmitting(false);
    }
  };

  const fetchNotifikasi = async () => {
    if (!user || (user.role !== 'AKUNTAN' && user.role !== 'AHLI_GIZI' && user.role !== 'KEPALA_SPPG' && user.role !== 'ADMIN')) return;
    setLoading(true);
    try {
      const res = await api.request('/notifikasi');
      if (res.ok) {
        const data = await res.json();
        setNotifikasi(data);
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const toggleNotif = async () => {
    if (!notifOpen) {
      await fetchNotifikasi();
      // mark all as read di backend
      api.request('/notifikasi/mark-read', { method: 'PATCH' }).catch(() => {});
      // update state lokal langsung biar badge instant ilang
      setNotifikasi(prev => prev.map(n => ({ ...n, dibaca: true })));
    }
    setNotifOpen(!notifOpen);
  };

  const handleNotificationClick = (notif) => {
    setNotifOpen(false);

    if (user?.role === 'KEPALA_SPPG') {
      navigate('/kepala/approval');
      return;
    }

    const paths = {
      MENU: '/gizi/menu-harian',
      RAB: '/akuntan/rab-harian',
      BUG: '/admin/laporan-bug',
    };

    const targetPath = paths[notif.entityType];
    if (targetPath) {
      navigate(targetPath);
    }
  };

  useEffect(() => {
    if (user?.role === 'AKUNTAN' || user?.role === 'AHLI_GIZI' || user?.role === 'KEPALA_SPPG' || user?.role === 'ADMIN') {
      fetchNotifikasi();
      const interval = setInterval(fetchNotifikasi, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    function onClickOutside(e) {
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const PAGE_TITLES = {
    '/aslap': 'Beranda Aslap',
    '/aslap/penerima-manfaat': 'Penerima Manfaat',
    '/mitra': 'Beranda Mitra',
    '/mitra/harga-bahan': 'Harga Bahan',
    '/mitra/po': 'Nota Pesanan',
    '/akuntan/po': 'Nota Pesanan (PO)',
    '/aslap/po': 'Verifikasi PO',
    '/mitra/kendaraan': 'Kendaraan Operasional',
    '/gizi': 'Beranda Gizi',
    '/gizi/menu-harian': 'Menu Harian',
    '/akuntan': 'Beranda Akuntan',
    '/akuntan/jurnal': 'Jurnal Transaksi',
    '/akuntan/anggaran-harian': 'RAB & Anggaran Harian',
    '/akuntan/dokumen-resmi': 'Dokumen Resmi',
    '/akuntan/nominatif-upah': 'Nominatif Upah',
    '/akuntan/saldo-awal-barang': 'Saldo Awal Barang',
    '/akuntan/mutasi-stok': 'Mutasi Stok',
    '/akuntan/validasi-stok': 'Validasi Stok',
    '/akuntan/laporan': 'Laporan BKU',
    '/akuntan/laporan/stock-barang': 'Stock Barang',
    '/akuntan/laporan/kebutuhan-belanja-bahan': 'Belanja Bahan',
    '/akuntan/laporan/per-periode': 'Laporan Per Periode',
    '/akuntan/laporan/per-bulan': 'Laporan Per Bulan',
    '/akuntan/laporan/periode-setup': 'Setup Periode',
    '/kepala': 'Beranda Kepala',
    '/kepala/approval': 'Approval',
    '/admin': 'Beranda Admin',
    '/admin/users': 'Kelola User',
    '/admin/laporan-bug': 'Laporan Bug',
    '/setting': 'Pengaturan Profil',
  };
  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] || 'SIKOP-SPPG';
    document.title = `${title} — SIKOP-SPPG`;
  }, [location.pathname]);
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
            transition: 'all var(--transition-fast), transform 0.2s ease-out'
          }}
          onMouseEnter={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = 'var(--border)';
              e.currentTarget.style.borderRadius = '12px'; // subtle morph/blob radius shift on hover
              e.currentTarget.style.transform = 'translateX(4px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderRadius = 'var(--radius-md)';
              e.currentTarget.style.transform = 'translateX(0)';
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

            {/* Notification Bell Button & Popover */}
            {(user?.role === 'AKUNTAN' || user?.role === 'AHLI_GIZI' || user?.role === 'KEPALA_SPPG' || user?.role === 'ADMIN') && (
              <div ref={notifContainerRef} style={{ position: 'relative' }}>
                <button
                  onClick={toggleNotif}
                  title="Notifikasi"
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
                    color: 'var(--text)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--border)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; }}
                >
                  <Bell size={18} strokeWidth={2} />
                  {notifikasi.filter(n => !n.dibaca).length > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: 'var(--color-danger)',
                      color: 'white',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--bg-elevated)'
                    }}>
                      {notifikasi.filter(n => !n.dibaca).length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '320px',
                    maxHeight: '360px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-hover)',
                    zIndex: 101,
                    overflowY: 'auto',
                    padding: '12px',
                    animation: 'dropdown-open 150ms ease forwards',
                    transformOrigin: 'top right'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '13px' }}>Notifikasi Terbaru</strong>
                      {notifikasi.filter(n => !n.dibaca).length > 0 && (
                        <span style={{ fontSize: '10px', color: 'var(--color-danger)', fontWeight: 'bold' }}>
                          {notifikasi.filter(n => !n.dibaca).length} baru
                        </span>
                      )}
                    </div>

                    {loading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[1, 2, 3].map(i => (
                          <div key={i} className="skeleton-shimmer" style={{ height: '50px', borderRadius: 'var(--radius-sm)' }} />
                        ))}
                      </div>
                    ) : notifikasi.length === 0 ? (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        Tidak ada notifikasi
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {notifikasi.map(n => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border)',
                              backgroundColor: n.dibaca ? 'transparent' : 'rgba(7, 30, 73, 0.03)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              textAlign: 'left',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)' }}>
                                {n.judul}
                              </span>
                              {!n.dibaca && (
                                <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-primary)', borderRadius: '50%', flexShrink: 0, marginTop: '4px' }} />
                              )}
                            </div>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                              {n.pesan}
                            </p>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', alignSelf: 'flex-end' }}>
                              {new Date(n.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
        {/* Static Header & Home Link for Akuntan (Outside Scroll Area) */}
        {user?.role === 'AKUNTAN' && (
          <div style={{ marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <div style={{ padding: '0 14px', marginBottom: '8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Menu Akuntan
            </div>
            <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
              {renderLink('/akuntan', 'Beranda / Dashboard', Home)}
            </ul>
          </div>
        )}

        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>

            {/* ASLAP Navigation */}
            {user?.role === 'ASLAP' && (
              <>
                <li style={{ padding: '0 14px', marginBottom: '8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Menu Aslap
                </li>
                {renderLink('/aslap', 'Beranda / Dashboard', Home)}
                {renderLink('/aslap/penerima-manfaat', 'Penerima Manfaat', Users)}
                {renderLink('/aslap/po', 'Verifikasi PO', ClipboardCheck)}
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
                {renderLink('/mitra/kendaraan', 'Kendaraan Operasional', Truck)}
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

            {/* AKUNTAN Navigation (Beranda dipindah ke atas nav scroll area) */}
            {user?.role === 'AKUNTAN' && (
              <>
                <li style={{ padding: '0 14px 4px 14px', fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Operasional
                </li>
                {renderLink('/akuntan/laporan/periode-setup', 'Setup Periode', Calendar)}
                {renderLink('/akuntan/jurnal', 'Jurnal Transaksi', BookOpen)}
                {renderLink('/akuntan/po', 'Nota Pesanan (PO)', ShoppingCart)}
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

            {/* ADMIN Navigation */}
            {user?.role === 'ADMIN' && (
              <>
                <li style={{ padding: '0 14px', marginBottom: '8px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Menu Admin
                </li>
                {renderLink('/admin', 'Beranda / Dashboard', Home)}
                {renderLink('/admin/users', 'Kelola User', Users)}
                {renderLink('/admin/laporan-bug', 'Laporan Bug', Bug)}
              </>
            )}

          </ul>
        </nav>

        {/* Footer Navigation Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          {/* Laporkan Bug — visible semua role */}
          <button
            onClick={() => setBugFormOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              width: '100%',
              background: 'none',
              border: '1px solid transparent',
              textAlign: 'left',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: '500',
              color: 'var(--text)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--border)';
              e.currentTarget.style.borderRadius = '12px';
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderRadius = 'var(--radius-md)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <Bug size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
            <span>Laporkan Bug</span>
          </button>

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

      {/* Bug Report Overlay Form */}
      {bugFormOpen && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 10000,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setBugFormOpen(false); }}
        >
          <div style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '28px',
            width: '90%',
            maxWidth: '480px',
            boxShadow: 'var(--shadow-hover)',
            display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bug size={18} strokeWidth={2} />
              Laporkan Bug
            </h3>
            <form onSubmit={handleSubmitBug} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Judul Bug
                </label>
                <input
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  placeholder="Contoh: Tombol simpan tidak berfungsi"
                  value={bugForm.judul}
                  onChange={(e) => setBugForm(f => ({ ...f, judul: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Deskripsi
                </label>
                <textarea
                  rows={4}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
                  placeholder="Jelaskan langkah yang menyebabkan bug, pesan error, dsb."
                  value={bugForm.deskripsi}
                  onChange={(e) => setBugForm(f => ({ ...f, deskripsi: e.target.value }))}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => { setBugFormOpen(false); setBugForm({ judul: '', deskripsi: '' }); }}
                  style={{ padding: '8px 20px', fontWeight: 600, fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent', color: 'var(--text)', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={bugSubmitting}
                  style={{ padding: '8px 20px', fontWeight: 700, fontSize: '13px', border: 'none', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', cursor: bugSubmitting ? 'not-allowed' : 'pointer', opacity: bugSubmitting ? 0.7 : 1 }}
                >
                  {bugSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
