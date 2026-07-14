import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { StatusBadge } from '../../components/StatusBadge';
import Dropdown from '../../components/Dropdown';

const STATUS_OPTIONS = [
  { value: 'BARU', label: 'Baru' },
  { value: 'DIPROSES', label: 'Diproses' },
  { value: 'SELESAI', label: 'Selesai' },
];

const ROLE_LABELS = {
  ADMIN: 'Admin', AKUNTAN: 'Akuntan', KEPALA_SPPG: 'Kepala SPPG',
  AHLI_GIZI: 'Ahli Gizi', ASLAP: 'Aslap', MITRA: 'Mitra',
};

export const LaporanBugPage = () => {
  const { request } = useApi();
  const toast = useToast();

  const [laporan, setLaporan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchLaporan = async () => {
    try {
      const res = await request('/laporan-bug');
      if (res.ok) setLaporan(await res.json());
    } catch {
      toast.error('Gagal memuat daftar laporan bug');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchLaporan(); }, []);

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      const res = await request(`/laporan-bug/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success('Status laporan berhasil diperbarui');
        setLaporan(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Gagal memperbarui status');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setUpdatingId(null);
    }
  };

  const columns = [
    {
      key: 'pelapor',
      header: 'Pelapor',
      render: (v) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px' }}>{v?.nama ?? '-'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{v?.username}</div>
        </div>
      ),
    },
    {
      key: 'rolePelapor',
      header: 'Role',
      render: (v) => (
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
          {ROLE_LABELS[v] ?? v}
        </span>
      ),
    },
    {
      key: 'judul',
      header: 'Judul',
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>{v}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.deskripsi}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => (
        <StatusBadge
          status={v === 'BARU' ? 'DIAJUKAN' : v === 'DIPROSES' ? 'DRAFT' : 'DISETUJUI'}
          label={v === 'BARU' ? 'Baru' : v === 'DIPROSES' ? 'Diproses' : 'Selesai'}
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Tanggal',
      render: (v) => (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Ubah Status',
      render: (id, row) => (
        <div style={{ minWidth: '140px' }}>
          <Dropdown
            options={STATUS_OPTIONS}
            value={row.status}
            onChange={(val) => handleStatusChange(id, val)}
            placeholder="Pilih status..."
            disabled={updatingId === id}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ margin: '0 0 24px 0', color: 'var(--text)' }}>Laporan Bug</h2>
      <section>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          Semua Laporan ({laporan.length})
        </h3>
        {loading
          ? <p style={{ color: 'var(--text-muted)' }}>Memuat data laporan...</p>
          : <Table columns={columns} data={laporan} emptyText="Belum ada laporan bug masuk." />
        }
      </section>
    </div>
  );
};
