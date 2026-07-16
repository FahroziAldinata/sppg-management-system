import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';
import { Users, Shield, BookOpen, FileSpreadsheet, Home, Settings } from 'lucide-react';

export const AdminDashboard = () => {
  const { request } = useApi();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await request('/admin/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error("Gagal mengambil data user:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Banner Skeleton */}
        <Skeleton height="120px" borderRadius="var(--radius-md)" />
        
        {/* 3 Main Stats Cards Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <Skeleton height="110px" borderRadius="var(--radius-md)" />
          <Skeleton height="110px" borderRadius="var(--radius-md)" />
          <Skeleton height="110px" borderRadius="var(--radius-md)" />
        </div>

        {/* 6 Role Cards Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
          {[...Array(6)].map((_, idx) => (
            <Skeleton key={idx} height="100px" borderRadius="var(--radius-md)" />
          ))}
        </div>

        {/* Quick Actions Panel Skeleton */}
        <Skeleton height="100px" borderRadius="var(--radius-md)" />
      </div>
    );
  }

  // Aggregating counts in frontend (YAGNI)
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.aktif).length;
  const inactiveUsers = totalUsers - activeUsers;

  const countByRole = (role) => users.filter(u => u.role === role).length;

  const adminCount = countByRole('ADMIN');
  const akuntanCount = countByRole('AKUNTAN');
  const kepalaCount = countByRole('KEPALA_SPPG');
  const giziCount = countByRole('AHLI_GIZI');
  const aslapCount = countByRole('ASLAP');
  const mitraCount = countByRole('MITRA');

  return (
    <div style={{ padding: '10px' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white',
        padding: '24px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '25px',
        boxShadow: 'var(--shadow)'
      }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700' }}>Halo, Administrator SIKOP!</h2>
        <p style={{ margin: '0', opacity: '0.85', fontSize: '14px', lineHeight: '1.5' }}>
          Selamat datang di panel administrasi. Anda memiliki hak akses penuh untuk melakukan pengelolaan pengguna, verifikasi status akun, dan konfigurasi sistem.
        </p>
      </div>

      {/* Main Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', borderLeft: '5px solid var(--color-primary)', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Pengguna Terdaftar</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '5px 0', color: 'var(--text)' }}>
            {totalUsers}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{activeUsers} Aktif / {inactiveUsers} Nonaktif</div>
        </Card>

        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', borderLeft: '5px solid var(--color-success)', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Pengguna Aktif</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '5px 0', color: 'var(--color-success)' }}>
            {activeUsers}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Dapat melakukan login ke sistem</div>
        </Card>

        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', borderLeft: '5px solid var(--color-danger)', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Pengguna Nonaktif</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '5px 0', color: 'var(--color-danger)' }}>
            {inactiveUsers}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Akses masuk diblokir sementara</div>
        </Card>
      </div>

      {/* Breakdown per Role */}
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text)' }}>Distribusi Role Pengguna</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '30px' }}>
        {[
          { label: 'Admin', count: adminCount, color: '#6366f1' },
          { label: 'Akuntan', count: akuntanCount, color: '#0ea5e9' },
          { label: 'Kepala SPPG', count: kepalaCount, color: '#10b981' },
          { label: 'Ahli Gizi', count: giziCount, color: '#f59e0b' },
          { label: 'Aslap', count: aslapCount, color: '#ec4899' },
          { label: 'Mitra', count: mitraCount, color: '#8b5cf6' }
        ].map((item, idx) => (
          <Card key={idx} style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            backgroundColor: 'var(--bg-elevated)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: item.color,
              marginBottom: '4px'
            }} />
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)' }}>{item.count}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>{item.label}</div>
          </Card>
        ))}
      </div>

      {/* Quick Actions Panel */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', backgroundColor: 'var(--bg-elevated)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>Pintasan Aksi Cepat</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/admin/users')}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            Kelola Pengguna
          </button>
          <button
            onClick={() => navigate('/setting')}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            Pengaturan Akun
          </button>
        </div>
      </div>
    </div>
  );
};
