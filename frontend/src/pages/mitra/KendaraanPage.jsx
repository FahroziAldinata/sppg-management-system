import React, { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table, renderStatus } from '../../components/Table';
import { FieldButton } from '../../components/FieldButton';

export const KendaraanPage = () => {
  const { request } = useApi();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ namaKendaraan: '', platNomor: '', aktif: true });

  const load = async () => {
    setError('');
    const res = await request('/mitra/kendaraan');
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Gagal memuat kendaraan' }));
      setError(data.error || 'Gagal memuat kendaraan');
      return;
    }
    setItems(await res.json());
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ namaKendaraan: '', platNomor: '', aktif: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.namaKendaraan.trim()) {
      setError('Nama kendaraan wajib diisi');
      return;
    }

    const res = await request(editing ? `/mitra/kendaraan/${editing.id}` : '/mitra/kendaraan', {
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify({
        namaKendaraan: form.namaKendaraan.trim(),
        platNomor: form.platNomor.trim() || undefined,
        aktif: form.aktif
      })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Gagal menyimpan kendaraan' }));
      setError(data.error || 'Gagal menyimpan kendaraan');
      return;
    }

    toast.success(editing ? 'Kendaraan berhasil diperbarui.' : 'Kendaraan berhasil ditambahkan.');
    resetForm();
    load();
  };

  const startEdit = (row) => {
    setError('');
    setEditing(row);
    setForm({
      namaKendaraan: row.namaKendaraan || '',
      platNomor: row.platNomor || '',
      aktif: row.aktif !== undefined ? row.aktif : true
    });
  };

  const remove = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus kendaraan ini?')) return;
    setError('');
    const res = await request(`/mitra/kendaraan/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Gagal menghapus kendaraan' }));
      setError(data.error || 'Gagal menghapus kendaraan');
      return;
    }
    toast.success('Kendaraan berhasil dihapus.');
    if (editing?.id === id) resetForm();
    load();
  };

  const columns = [
    { key: 'namaKendaraan', header: 'Nama Kendaraan' },
    { key: 'platNomor', header: 'Plat Nomor', render: (val) => val || '-' },
    { key: 'aktif', header: 'Status', render: (val) => renderStatus(val ? 'AKTIF' : 'PENDING', val ? 'Aktif' : 'Nonaktif') },
    {
      key: 'aksi',
      header: 'Aksi',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <FieldButton onPress={() => startEdit(row)} title="Edit kendaraan">
            <Pencil size={14} />
          </FieldButton>
          <FieldButton onPress={() => remove(row.id)} title="Hapus kendaraan">
            <Trash2 size={14} className="text-red-600" />
          </FieldButton>
        </div>
      )
    }
  ];

  return (
    <div>
      <h2 style={{ color: 'var(--text)', marginBottom: 20 }}>Kendaraan Operasional</h2>
      {error && (
        <div style={{
          color: 'var(--color-danger)',
          margin: '10px 0',
          padding: 10,
          border: '1px solid var(--color-danger)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(239, 68, 68, 0.05)'
        }}>
          {error}
        </div>
      )}

      <section style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 24,
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow)',
        marginBottom: 24
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: 'var(--text)' }}>
          {editing ? 'Edit Kendaraan' : 'Tambah Kendaraan'}
        </h3>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(180px, 1fr) auto auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Nama Kendaraan
            </label>
            <input
              className="form-field"
              value={form.namaKendaraan}
              onChange={e => setForm(prev => ({ ...prev, namaKendaraan: e.target.value }))}
              placeholder="Contoh: Mobil Box 1"
              required
            />
          </div>
          <div>
            <label style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Plat Nomor
            </label>
            <input
              className="form-field"
              value={form.platNomor}
              onChange={e => setForm(prev => ({ ...prev, platNomor: e.target.value }))}
              placeholder="Opsional"
            />
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, color: 'var(--text)' }}>
            <input
              type="checkbox"
              checked={form.aktif}
              onChange={e => setForm(prev => ({ ...prev, aktif: e.target.checked }))}
            />
            Aktif
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ padding: '10px 16px', border: 'none', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', cursor: 'pointer', fontWeight: 700 }}>
              {editing ? 'Simpan' : 'Tambah'}
            </button>
            {editing && (
              <button type="button" onClick={resetForm} style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>
                Batal
              </button>
            )}
          </div>
        </form>
      </section>

      <Table columns={columns} data={items} emptyText="Belum ada kendaraan operasional." />
    </div>
  );
};
