import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

export const AslapDashboard = () => {
  const { request } = useApi();
  
  // Master data
  const [periods, setPeriods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [schools, setSchools] = useState([]);
  const [posyandus, setPosyandus] = useState([]);
  
  // Selection / List
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [items, setItems] = useState([]);
  
  // Form State
  const [editingId, setEditingId] = useState(null);
  const [formHariAktif, setFormHariAktif] = useState([]);
  const [formDetail, setFormDetail] = useState([]);
  
  // Message states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const daysList = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

  // Load all master data on mount
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [resP, resK, resS, resY] = await Promise.all([
          request('/aslap/periode'),
          request('/aslap/kategori'),
          request('/aslap/sekolah'),
          request('/aslap/posyandu')
        ]);
        
        const dataP = await resP.json();
        const dataK = await resK.json();
        const dataS = await resS.json();
        const dataY = await resY.json();
        
        setPeriods(dataP);
        setCategories(dataK);
        setSchools(dataS);
        setPosyandus(dataY);
        
        if (dataP.length > 0) {
          setSelectedPeriodId(dataP[0].id);
        }
      } catch (err) {
        console.error(err);
        setError('Gagal memuat data master dari server.');
      }
    };
    loadMasterData();
  }, []);

  // Fetch list of Penerima Manfaat when selectedPeriodId changes
  useEffect(() => {
    if (!selectedPeriodId) return;
    const fetchList = async () => {
      try {
        const res = await request(`/aslap/penerima-manfaat?periodeId=${selectedPeriodId}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch (err) {
        console.error(err);
        setError('Gagal mengambil daftar penerima manfaat.');
      }
    };
    fetchList();
  }, [selectedPeriodId]);

  // Helper mapping category ID to category object
  const categoryMap = {};
  categories.forEach(c => { categoryMap[c.id] = c; });

  const resetForm = () => {
    setEditingId(null);
    setFormHariAktif([]);
    setFormDetail([{
      kategoriId: categories[0]?.id || '',
      sekolahId: '',
      sekolahNama: '',
      posyanduId: '',
      posyanduNama: '',
      lakiLaki: 0,
      perempuan: 0
    }]);
    setError('');
  };

  const handleEditClick = (row) => {
    setEditingId(row.id);
    setFormHariAktif(row.hariAktif);
    
    // Map existing detail entries to form detail state
    const mappedDetail = row.detail.map(d => ({
      kategoriId: d.kategoriId,
      sekolahId: d.sekolahId || '',
      sekolahNama: '',
      posyanduId: d.posyanduId || '',
      posyanduNama: '',
      lakiLaki: d.lakiLaki,
      perempuan: d.perempuan
    }));
    setFormDetail(mappedDetail);
    setError('');
    setSuccess('');
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await request(`/aslap/penerima-manfaat/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSuccess('Data berhasil dihapus.');
        // Refresh list
        const listRes = await request(`/aslap/penerima-manfaat?periodeId=${selectedPeriodId}`);
        const data = await listRes.json();
        setItems(data);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Gagal menghapus data.');
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi ke server gagal.');
    }
  };

  const handleDayCheckboxChange = (day) => {
    if (formHariAktif.includes(day)) {
      setFormHariAktif(formHariAktif.filter(d => d !== day));
    } else {
      setFormHariAktif([...formHariAktif, day]);
    }
  };

  const handleDetailChange = (index, field, value) => {
    const updated = [...formDetail];
    updated[index][field] = value;
    
    // Reset other targets if kategoriId changes
    if (field === 'kategoriId') {
      updated[index].sekolahId = '';
      updated[index].sekolahNama = '';
      updated[index].posyanduId = '';
      updated[index].posyanduNama = '';
    }
    setFormDetail(updated);
  };

  const addDetailRow = () => {
    setFormDetail([...formDetail, {
      kategoriId: categories[0]?.id || '',
      sekolahId: '',
      sekolahNama: '',
      posyanduId: '',
      posyanduNama: '',
      lakiLaki: 0,
      perempuan: 0
    }]);
  };

  const removeDetailRow = (index) => {
    if (formDetail.length === 1) return;
    setFormDetail(formDetail.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Replicate payload structure exactly expected by backend
    const cleanedDetail = formDetail.map(d => {
      const cat = categoryMap[d.kategoriId];
      const detailItem = {
        kategoriId: d.kategoriId,
        lakiLaki: parseInt(d.lakiLaki, 10) || 0,
        perempuan: parseInt(d.perempuan, 10) || 0
      };

      if (cat?.jenisSasaran === 'PESERTA_DIDIK') {
        if (d.sekolahId) {
          detailItem.sekolahId = d.sekolahId;
        } else if (d.sekolahNama) {
          detailItem.sekolahNama = d.sekolahNama;
        }
      } else if (cat?.jenisSasaran === 'NON_PESERTA_DIDIK') {
        if (d.posyanduId) {
          detailItem.posyanduId = d.posyanduId;
        } else if (d.posyanduNama) {
          detailItem.posyanduNama = d.posyanduNama;
        }
      }
      return detailItem;
    });

    const payload = editingId 
      ? { hariAktif: formHariAktif, detail: cleanedDetail }
      : { periodeId: selectedPeriodId, hariAktif: formHariAktif, detail: cleanedDetail };

    try {
      const url = editingId 
        ? `/aslap/penerima-manfaat/${editingId}`
        : '/aslap/penerima-manfaat';
      const method = editingId ? 'PUT' : 'POST';

      const res = await request(url, {
        method,
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(editingId ? 'Data berhasil diperbarui.' : 'Data berhasil ditambahkan.');
        resetForm();
        // Refresh list
        const listRes = await request(`/aslap/penerima-manfaat?periodeId=${selectedPeriodId}`);
        const listData = await listRes.json();
        setItems(listData);
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
      <h2>Dashboard Aslap - Penerima Manfaat</h2>
      
      {/* Messages */}
      {error && <div style={{ color: 'red', margin: '10px 0' }}>Error: {error}</div>}
      {success && <div style={{ color: 'green', margin: '10px 0' }}>{success}</div>}

      {/* Period Selection */}
      <div>
        <label htmlFor="period-select">Pilih Periode: </label>
        <select 
          id="period-select"
          value={selectedPeriodId}
          onChange={(e) => {
            setSelectedPeriodId(e.target.value);
            resetForm();
          }}
        >
          {periods.map(p => (
            <option key={p.id} value={p.id}>
              {p.nama} ({p.tanggalMulai} s/d {p.tanggalSelesai})
            </option>
          ))}
        </select>
      </div>

      <hr />

      {/* Create / Edit Form */}
      <h3>{editingId ? 'Edit Data' : 'Tambah Data Baru'}</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <h4>Hari Aktif:</h4>
          {daysList.map(day => (
            <label key={day} style={{ marginRight: '10px' }}>
              <input
                type="checkbox"
                checked={formHariAktif.includes(day)}
                onChange={() => handleDayCheckboxChange(day)}
              />
              {day}
            </label>
          ))}
        </div>

        <div>
          <h4>Detail Penerima Manfaat:</h4>
          {formDetail.map((det, index) => {
            const selectedCat = categoryMap[det.kategoriId];
            const isSiswa = selectedCat ? selectedCat.jenisSasaran === 'PESERTA_DIDIK' : false;
            const isNonSiswa = selectedCat ? selectedCat.jenisSasaran === 'NON_PESERTA_DIDIK' : false;

            return (
              <div key={index} style={{ border: '1px solid #ddd', padding: '10px', marginBottom: '10px' }}>
                <h5>Item #{index + 1}</h5>
                
                <div>
                  <label>Kategori Klien: </label>
                  <select
                    value={det.kategoriId}
                    onChange={(e) => handleDetailChange(index, 'kategoriId', e.target.value)}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nama} ({c.jenisSasaran})
                      </option>
                    ))}
                  </select>
                </div>

                {isSiswa && (
                  <div style={{ marginTop: '5px' }}>
                    <label>Pilih Sekolah Existing: </label>
                    <select
                      value={det.sekolahId}
                      onChange={(e) => {
                        handleDetailChange(index, 'sekolahId', e.target.value);
                        handleDetailChange(index, 'sekolahNama', '');
                      }}
                    >
                      <option value="">-- Pilih --</option>
                      {schools.map(s => (
                        <option key={s.id} value={s.id}>{s.nama}</option>
                      ))}
                    </select>
                    <span> ATAU input Sekolah Baru: </span>
                    <input
                      type="text"
                      placeholder="Nama Sekolah Baru"
                      value={det.sekolahNama}
                      onChange={(e) => {
                        handleDetailChange(index, 'sekolahNama', e.target.value);
                        handleDetailChange(index, 'sekolahId', '');
                      }}
                    />
                  </div>
                )}

                {isNonSiswa && (
                  <div style={{ marginTop: '5px' }}>
                    <label>Pilih Posyandu Existing: </label>
                    <select
                      value={det.posyanduId}
                      onChange={(e) => {
                        handleDetailChange(index, 'posyanduId', e.target.value);
                        handleDetailChange(index, 'posyanduNama', '');
                      }}
                    >
                      <option value="">-- Pilih --</option>
                      {posyandus.map(y => (
                        <option key={y.id} value={y.id}>{y.nama}</option>
                      ))}
                    </select>
                    <span> ATAU input Posyandu Baru: </span>
                    <input
                      type="text"
                      placeholder="Nama Posyandu Baru"
                      value={det.posyanduNama}
                      onChange={(e) => {
                        handleDetailChange(index, 'posyanduNama', e.target.value);
                        handleDetailChange(index, 'posyanduId', '');
                      }}
                    />
                  </div>
                )}

                <div style={{ marginTop: '5px' }}>
                  <label>Jumlah Laki-laki: </label>
                  <input
                    type="number"
                    min="0"
                    value={det.lakiLaki}
                    onChange={(e) => handleDetailChange(index, 'lakiLaki', e.target.value)}
                  />
                  <label style={{ marginLeft: '10px' }}>Jumlah Perempuan: </label>
                  <input
                    type="number"
                    min="0"
                    value={det.perempuan}
                    onChange={(e) => handleDetailChange(index, 'perempuan', e.target.value)}
                  />
                </div>

                <button 
                  type="button" 
                  onClick={() => removeDetailRow(index)}
                  style={{ marginTop: '10px', color: 'red' }}
                  disabled={formDetail.length === 1}
                >
                  Hapus Baris Detail
                </button>
              </div>
            );
          })}
          
          <button type="button" onClick={addDetailRow} style={{ marginBottom: '10px' }}>
            Tambah Baris Detail
          </button>
        </div>

        <div>
          <button type="submit">
            {editingId ? 'Simpan Perubahan' : 'Kirim Data'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} style={{ marginLeft: '10px' }}>
              Batal Edit
            </button>
          )}
        </div>
      </form>

      <hr />

      {/* List / Table of existing records */}
      <h3>Daftar Input Penerima Manfaat</h3>
      {items.length === 0 ? (
        <p>Belum ada data penerima manfaat untuk periode ini.</p>
      ) : (
        <table border="1" cellPadding="5" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Hari Aktif</th>
              <th>Pembuat</th>
              <th>Rincian Detail Penerima</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map(row => (
              <tr key={row.id}>
                <td>{row.hariAktif.join(', ')}</td>
                <td>{row.createdBy?.nama || 'System'}</td>
                <td>
                  <ul>
                    {row.detail.map((d, index) => (
                      <li key={d.id || index}>
                        <strong>{d.kategori?.nama}</strong>:{' '}
                        {d.sekolah?.nama && `Sekolah: ${d.sekolah.nama}`}
                        {d.posyandu?.nama && `Posyandu: ${d.posyandu.nama}`}
                        {` (L: ${d.lakiLaki}, P: ${d.perempuan})`}
                      </li>
                    ))}
                  </ul>
                </td>
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
