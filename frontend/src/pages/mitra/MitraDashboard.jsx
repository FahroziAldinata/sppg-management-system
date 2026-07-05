import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

export const MitraDashboard = () => {
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

  // Load master data (periode butuh fix backend: tambah MITRA di aslap.js GET /periode)
  useEffect(() => {
    const loadMaster = async () => {
      try {
        const [resP, resB] = await Promise.all([
          request('/aslap/periode'),
          request('/mitra/bahan-pokok')
        ]);
        if (!resP.ok || !resB.ok) {
          setError('Gagal memuat data master (cek role MITRA sudah diizinkan akses /aslap/periode).');
          return;
        }
        const dataP = await resP.json();
        const dataB = await resB.json();
        setPeriods(dataP);
        setBahanList(dataB);
        if (dataP.length > 0) setSelectedPeriodId(dataP[0].id);
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
    fetchList(selectedPeriodId);
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
      <h2>Dashboard Mitra - Harga Bahan Periode</h2>

      {error && <div style={{ color: 'red', margin: '10px 0' }}>Error: {error}</div>}
      {success && <div style={{ color: 'green', margin: '10px 0' }}>{success}</div>}

      <div>
        <label htmlFor="period-select">Pilih Periode: </label>
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
      <form onSubmit={handleSubmit}>
        <div>
          <label>Bahan Pokok: </label>
          <select
            value={formBahanId}
            onChange={(e) => setFormBahanId(e.target.value)}
            required
          >
            <option value="">-- Pilih Bahan --</option>
            {bahanList.map(b => (
              <option key={b.id} value={b.id}>{b.nama} ({b.satuan})</option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: '5px' }}>
          <label>Harga: </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formHarga}
            onChange={(e) => setFormHarga(e.target.value)}
            required
          />
        </div>
        <div style={{ marginTop: '5px' }}>
          <label>
            <input
              type="checkbox"
              checked={formIsFallback}
              onChange={(e) => setFormIsFallback(e.target.checked)}
            />
            {' '}Jadikan harga fallback
          </label>
        </div>
        <div style={{ marginTop: '10px' }}>
          <button type="submit">{editingId ? 'Simpan Perubahan' : 'Tambah'}</button>
          {editingId && (
            <button type="button" onClick={resetForm} style={{ marginLeft: '10px' }}>
              Batal Edit
            </button>
          )}
        </div>
      </form>

      <hr />

      <h3>Daftar Harga Bahan Periode Ini</h3>
      {items.length === 0 ? (
        <p>Belum ada data harga bahan untuk periode ini.</p>
      ) : (
        <table border="1" cellPadding="5" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Bahan Pokok</th>
              <th>Satuan</th>
              <th>Harga</th>
              <th>Fallback</th>
              <th>Diinput oleh</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map(row => (
              <tr key={row.id}>
                <td>{row.bahanPokok?.nama}</td>
                <td>{row.bahanPokok?.satuan}</td>
                <td>{row.harga}</td>
                <td>{row.isFallback ? 'Ya' : 'Tidak'}</td>
                <td>{row.createdBy?.nama || '-'}</td>
                <td>
                  <button onClick={() => handleEditClick(row)}>Edit</button>
                  <button onClick={() => handleDeleteClick(row.id)} style={{ marginLeft: '5px', color: 'red' }}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};