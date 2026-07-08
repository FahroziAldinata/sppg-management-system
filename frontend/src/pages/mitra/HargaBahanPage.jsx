import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Table } from '../../components/Table';

export const HargaBahanPage = () => {
  const { request } = useApi();

  const [periods, setPeriods] = useState([]);
  const [bahanList, setBahanList] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [items, setItems] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [formBahanId, setFormBahanId] = useState('');
  const [formHarga, setFormHarga] = useState('');
  const [formIsFallback, setFormIsFallback] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load master data
  useEffect(() => {
    const loadMaster = async () => {
      try {
        const [resP, resB] = await Promise.all([
          request('/aslap/periode'),
          request('/mitra/bahan-pokok')
        ]);
        if (!resP.ok || !resB.ok) {
          setError('Gagal memuat data master.');
          return;
        }
        const dataP = await resP.json();
        const dataB = await resB.json();
        setPeriods(dataP);
        setBahanList(dataB);
        if (dataP.length > 0) {
          setSelectedPeriodId(dataP[0].id);
          setFormBahanId(dataB[0]?.id || '');
        }
      } catch (err) {
        console.error(err);
        setError('Koneksi ke server gagal saat memuat data master.');
      }
    };
    loadMaster();
  }, []);

  const fetchList = async (periodeId) => {
    if (!periodeId) return;
    try {
      const res = await request(`/mitra/harga-bahan?periodeId=${periodeId}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Gagal mengambil daftar harga bahan.');
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi ke server gagal.');
    }
  };

  useEffect(() => {
    if (selectedPeriodId) {
      fetchList(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const resetForm = () => {
    setEditingId(null);
    setFormBahanId(bahanList[0]?.id || '');
    setFormHarga('');
    setFormIsFallback(false);
    setError('');
  };

  const handleEditClick = (row) => {
    setEditingId(row.id);
    setFormBahanId(row.bahanPokokId);
    setFormHarga(String(row.harga));
    setFormIsFallback(row.isFallback);
    setError('');
    setSuccess('');
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Yakin hapus harga bahan ini?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await request(`/mitra/harga-bahan/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Data berhasil dihapus.');
        fetchList(selectedPeriodId);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Gagal menghapus data.');
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi ke server gagal.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = editingId
      ? { bahanPokokId: formBahanId, harga: parseFloat(formHarga), isFallback: formIsFallback }
      : { periodeId: selectedPeriodId, bahanPokokId: formBahanId, harga: parseFloat(formHarga), isFallback: formIsFallback };

    try {
      const url = editingId ? `/mitra/harga-bahan/${editingId}` : '/mitra/harga-bahan';
      const method = editingId ? 'PUT' : 'POST';

      const res = await request(url, { method, body: JSON.stringify(payload) });
      const data = await res.json();

      if (res.ok) {
        setSuccess(editingId ? 'Harga berhasil diperbarui.' : 'Harga berhasil ditambahkan.');
        resetForm();
        fetchList(selectedPeriodId);
      } else {
        setError(data.error || 'Terjadi kesalahan pada input.');
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi ke server gagal.');
    }
  };

  return (
    <div>
      <h2>Pengelolaan Daftar Harga Bahan Periode</h2>
      
      {error && <div style={{ color: 'red', margin: '10px 0', padding: '8px', border: '1px solid red' }}>Error: {error}</div>}
      {success && <div style={{ color: 'green', margin: '10px 0', padding: '8px', border: '1px solid green' }}>{success}</div>}

      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="period-select" style={{ fontWeight: '500' }}>Pilih Periode: </label>
        <select
          id="period-select"
          value={selectedPeriodId}
          onChange={(e) => { setSelectedPeriodId(e.target.value); resetForm(); }}
        >
          {periods.map(p => (
            <option key={p.id} value={p.id}>
              {p.tanggalMulai} - {p.tanggalSelesai}
            </option>
          ))}
        </select>
      </div>

      <hr />

      <form onSubmit={handleSubmit} style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
          {editingId ? 'Edit Harga Bahan' : 'Tambah Harga Bahan Baru'}
        </h3>
        
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{
              textTransform: 'uppercase',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.07em',
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '6px'
            }}>
              Bahan Pokok
            </label>
            <select
              value={formBahanId}
              onChange={(e) => setFormBahanId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--input-border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">-- Pilih Bahan --</option>
              {bahanList.map(b => (
                <option key={b.id} value={b.id}>{b.nama} ({b.satuan})</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <label style={{
              textTransform: 'uppercase',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.07em',
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '6px'
            }}>
              Harga Satuan (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formHarga}
              onChange={(e) => setFormHarga(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--input-border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div>
          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            color: 'var(--text)'
          }}>
            <input
              type="checkbox"
              checked={formIsFallback}
              onChange={(e) => setFormIsFallback(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Jadikan harga fallback
          </label>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button type="submit" style={{
            padding: '10px 20px',
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px'
          }}>
            {editingId ? 'Simpan Perubahan' : 'Simpan Data'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} style={{
              padding: '10px 20px',
              backgroundColor: 'var(--btn-cancel-bg)',
              border: '1px solid var(--btn-cancel-border)',
              color: 'var(--btn-cancel-text)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}>
              Batal Edit
            </button>
          )}
        </div>
      </form>

      <hr style={{ margin: '20px 0' }} />

      <Table
        columns={[
          { key: 'bahanPokok', header: 'Bahan Pokok', render: (val) => val?.nama || '—' },
          { key: 'satuan', header: 'Satuan', align: 'center', width: '100px', render: (_, row) => row.bahanPokok?.satuan || '—' },
          {
            key: 'harga',
            header: 'Harga Satuan',
            align: 'right',
            render: (val) => (
              <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                Rp{Number(val).toLocaleString('id-ID')}
              </strong>
            )
          },
          {
            key: 'isFallback',
            header: 'Fallback',
            align: 'center',
            width: '100px',
            render: (val) => val ? 'Ya' : 'Tidak'
          },
          { key: 'createdBy', header: 'Diinput oleh', render: (val) => val?.nama || '—' },
          {
            key: 'id',
            header: 'Aksi',
            align: 'center',
            width: '130px',
            render: (val, row) => (
              <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                <button onClick={() => handleEditClick(row)} style={{ padding: '3px 8px', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleDeleteClick(val)} style={{ padding: '3px 8px', color: 'red', cursor: 'pointer' }}>Hapus</button>
              </div>
            )
          }
        ]}
        data={items}
        emptyText="Belum ada data harga bahan untuk periode ini."
      />
    </div>
  );
};
