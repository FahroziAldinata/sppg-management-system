import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

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

      <h3>{editingId ? 'Edit Harga Bahan' : 'Tambah Harga Bahan Baru'}</h3>
      <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '15px', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '3px' }}>Bahan Pokok: </label>
          <select
            value={formBahanId}
            onChange={(e) => setFormBahanId(e.target.value)}
            required
            style={{ width: '100%', padding: '5px' }}
          >
            <option value="">-- Pilih Bahan --</option>
            {bahanList.map(b => (
              <option key={b.id} value={b.id}>{b.nama} ({b.satuan})</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '3px' }}>Harga Satuan (Rp): </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formHarga}
            onChange={(e) => setFormHarga(e.target.value)}
            required
            style={{ width: '100%', padding: '5px' }}
          />
        </div>
        <div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
            <input
              type="checkbox"
              checked={formIsFallback}
              onChange={(e) => setFormIsFallback(e.target.checked)}
            />
            Jadikan harga fallback
          </label>
        </div>
        <div style={{ marginTop: '10px' }}>
          <button type="submit" style={{ padding: '6px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            {editingId ? 'Simpan Perubahan' : 'Tambah Harga'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} style={{ marginLeft: '10px', padding: '6px 15px', backgroundColor: '#6c757d', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Batal Edit
            </button>
          )}
        </div>
      </form>

      <hr style={{ margin: '20px 0' }} />

      <h3>Daftar Harga Bahan Periode Ini</h3>
      {items.length === 0 ? (
        <p style={{ fontStyle: 'italic', color: '#888' }}>Belum ada data harga bahan untuk periode ini.</p>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#eaeaea' }}>
              <th>Bahan Pokok</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Satuan</th>
              <th style={{ textAlign: 'right' }}>Harga Satuan</th>
              <th style={{ textAlign: 'center', width: '100px' }}>Fallback</th>
              <th>Diinput oleh</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map(row => (
              <tr key={row.id}>
                <td>{row.bahanPokok?.nama}</td>
                <td style={{ textAlign: 'center' }}>{row.bahanPokok?.satuan}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Rp{Number(row.harga).toLocaleString('id-ID')}</td>
                <td style={{ textAlign: 'center' }}>{row.isFallback ? 'Ya' : 'Tidak'}</td>
                <td>{row.createdBy?.nama || '-'}</td>
                <td style={{ textAlign: 'center' }}>
                  <button onClick={() => handleEditClick(row)} style={{ padding: '3px 8px', marginRight: '5px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDeleteClick(row.id)} style={{ padding: '3px 8px', color: 'red', cursor: 'pointer' }}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
