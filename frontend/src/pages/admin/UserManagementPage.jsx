import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import Dropdown from '../../components/Dropdown';
import { Skeleton } from '../../components/Skeleton';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'AKUNTAN', label: 'Akuntan' },
  { value: 'KEPALA_SPPG', label: 'Kepala SPPG' },
  { value: 'AHLI_GIZI', label: 'Ahli Gizi' },
  { value: 'ASLAP', label: 'Aslap' },
  { value: 'MITRA', label: 'Mitra' },
];

const EMPTY_FORM = { nama: '', username: '', password: '', role: '' };
const EMPTY_EDIT = { nama: '', role: '', password: '' };

export const UserManagementPage = () => {
  const { request } = useApi();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // { id, nama, role, aktif }
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Toggle aktif confirm state
  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null); // { id, nama, aktif }

  const fetchUsers = async () => {
    try {
      const res = await request('/admin/users');
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      toast.error('Gagal memuat daftar user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── CREATE ──────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.nama || !form.username || !form.password || !form.role) {
      toast.error('Semua field wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const res = await request('/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('User berhasil dibuat');
        setForm(EMPTY_FORM);
        fetchUsers();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Gagal membuat user');
      }
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan koneksi');
    } finally {
      setSubmitting(false);
    }
  };

  // ── EDIT ─────────────────────────────────────────────────────────────────
  const openEdit = (user) => {
    setEditTarget(user);
    setEditForm({ nama: user.nama, role: user.role, password: '' });
    setEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editForm.nama || !editForm.role) {
      toast.error('Nama dan Role wajib diisi');
      return;
    }
    setEditSubmitting(true);
    try {
      const payload = { nama: editForm.nama, role: editForm.role };
      if (editForm.password.trim() !== '') payload.password = editForm.password;

      const res = await request(`/admin/users/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('User berhasil diperbarui');
        setEditOpen(false);
        setEditTarget(null);
        fetchUsers();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Gagal memperbarui user');
      }
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan koneksi');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── TOGGLE AKTIF ─────────────────────────────────────────────────────────
  const openToggle = (user) => {
    setToggleTarget(user);
    setToggleOpen(true);
  };

  const handleToggle = async () => {
    setToggleOpen(false);
    if (!toggleTarget) return;
    try {
      let res;
      if (toggleTarget.aktif) {
        // Nonaktifkan — DELETE endpoint (soft delete)
        res = await request(`/admin/users/${toggleTarget.id}`, { method: 'DELETE' });
      } else {
        // Aktifkan kembali — PUT endpoint
        res = await request(`/admin/users/${toggleTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aktif: true }),
        });
      }
      if (res.ok) {
        toast.success(toggleTarget.aktif ? `${toggleTarget.nama} berhasil dinonaktifkan` : `${toggleTarget.nama} berhasil diaktifkan kembali`);
        fetchUsers();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Gagal mengubah status user');
      }
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan koneksi');
    } finally {
      setToggleTarget(null);
    }
  };

  // ── TABLE COLUMNS ─────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'nama',
      header: 'Nama',
      render: (v) => <span style={{ fontWeight: 600, color: 'var(--text)' }}>{v}</span>
    },
    { key: 'username', header: 'Username' },
    {
      key: 'role',
      header: 'Role',
      render: (v) => {
        const label = ROLE_OPTIONS.find(r => r.value === v)?.label ?? v;
        return <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>;
      }
    },
    {
      key: 'aktif',
      header: 'Status',
      render: (v) => <StatusBadge status={v ? 'AKTIF' : 'DITOLAK'} label={v ? 'Aktif' : 'Nonaktif'} />
    },
    {
      key: 'id',
      header: 'Aksi',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => openEdit(row)}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg)',
              color: 'var(--text)',
              cursor: 'pointer'
            }}
          >
            Edit
          </button>
          <button
            onClick={() => openToggle(row)}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 600,
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: row.aktif ? 'var(--color-danger)' : 'var(--color-success)',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {row.aktif ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
        </div>
      )
    }
  ];

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '6px',
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 24px 0', color: 'var(--text)' }}>Kelola Pengguna</h2>

      {/* ── CREATE FORM ───────────────────────────────────────────────────── */}
      <section style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow)',
        marginBottom: '32px',
      }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          Tambah Pengguna Baru
        </h3>
        <form onSubmit={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Nama Lengkap</label>
              <input
                style={inputStyle}
                placeholder="Nama lengkap pengguna"
                value={form.nama}
                onChange={(e) => setForm(f => ({ ...f, nama: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Username</label>
              <input
                style={inputStyle}
                placeholder="Username untuk login"
                value={form.username}
                onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                style={inputStyle}
                placeholder="Min. 6 karakter"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <Dropdown
                options={ROLE_OPTIONS}
                value={form.role}
                onChange={(val) => setForm(f => ({ ...f, role: val }))}
                placeholder="Pilih role..."
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '9px 24px',
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Menyimpan...' : 'Tambah Pengguna'}
          </button>
        </form>
      </section>

      {/* ── USER TABLE ────────────────────────────────────────────────────── */}
      <section>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          Daftar Pengguna ({users.length})
        </h3>
        {loading
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Skeleton height="40px" />
              <Skeleton height="40px" />
              <Skeleton height="40px" />
              <Skeleton height="40px" />
              <Skeleton height="40px" />
            </div>
          )
          : <Table columns={columns} data={users} emptyText="Belum ada pengguna terdaftar." />
        }
      </section>

      {/* ── EDIT MODAL ────────────────────────────────────────────────────── */}
      {editOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 10000,
        }}>
          <div style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '28px',
            width: '90%',
            maxWidth: '440px',
            boxShadow: 'var(--shadow-hover)',
            display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
              Edit Pengguna: {editTarget?.username}
            </h3>
            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Nama Lengkap</label>
                <input
                  style={inputStyle}
                  value={editForm.nama}
                  onChange={(e) => setEditForm(f => ({ ...f, nama: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <Dropdown
                  options={ROLE_OPTIONS}
                  value={editForm.role}
                  onChange={(val) => setEditForm(f => ({ ...f, role: val }))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Password Baru (kosongkan jika tidak diubah)</label>
                <input
                  type="password"
                  style={inputStyle}
                  placeholder="Biarkan kosong untuk tidak mengubah"
                  value={editForm.password}
                  onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setEditOpen(false); setEditTarget(null); }}
                  style={{
                    padding: '8px 20px', fontWeight: 600, fontSize: '13px',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'transparent', color: 'var(--text)', cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  style={{
                    padding: '8px 20px', fontWeight: 700, fontSize: '13px',
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
                    cursor: editSubmitting ? 'not-allowed' : 'pointer',
                    opacity: editSubmitting ? 0.7 : 1,
                  }}
                >
                  {editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TOGGLE AKTIF CONFIRM ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={toggleOpen}
        title={toggleTarget?.aktif ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'}
        message={
          toggleTarget?.aktif
            ? `User "${toggleTarget?.nama}" akan dinonaktifkan dan tidak bisa login. Lanjutkan?`
            : `User "${toggleTarget?.nama}" akan diaktifkan kembali dan bisa login. Lanjutkan?`
        }
        onConfirm={handleToggle}
        onCancel={() => { setToggleOpen(false); setToggleTarget(null); }}
      />
    </div>
  );
};
