import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Table } from '../../components/Table';
import Dropdown from '../../components/Dropdown';

export const PenerimaManfaatPage = () => {
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
      <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Pengelolaan Penerima Manfaat (Sekolah &amp; Posyandu)</h2>

      {/* Messages */}
      {error && (
        <div style={{
          color: 'var(--color-danger)',
          marginBottom: '20px',
          padding: '8px',
          border: '1px solid var(--color-danger)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(239, 68, 68, 0.05)'
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          color: 'var(--color-success)',
          marginBottom: '20px',
          padding: '8px',
          border: '1px solid var(--color-success)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(16, 185, 129, 0.05)'
        }}>
          {success}
        </div>
      )}

      {/* Period Selection */}
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow)',
        marginBottom: '30px',
        width: '26%',
        minWidth: '320px'
      }}>
        <label style={{
          textTransform: 'uppercase',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.07em',
          color: 'var(--text-muted)',
          display: 'block',
          marginBottom: '6px'
        }}>
          Pilih Periode Aktif
        </label>
        <Dropdown
          style={{ width: '100%' }}
          value={selectedPeriodId}
          onChange={(val) => {
            setSelectedPeriodId(val);
            resetForm();
          }}
          options={periods.map(p => ({
            value: p.id,
            label: `${p.tanggalMulai} - ${p.tanggalSelesai}`
          }))}
        />
      </div>

      {/* Create / Edit Form */}
      <form onSubmit={handleSubmit} style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow)',
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text)' }}>
          {editingId ? 'Edit Data Penerima' : 'Tambah Data Baru'}
        </h3>

        {/* Hari Aktif */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            textTransform: 'uppercase',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.07em',
            color: 'var(--text-muted)',
            display: 'block',
            marginBottom: '8px'
          }}>
            Hari Aktif Operasional
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
            {daysList.map(day => (
              <label key={day} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', color: 'var(--text)' }}>
                <input
                  type="checkbox"
                  checked={formHariAktif.includes(day)}
                  onChange={() => handleDayCheckboxChange(day)}
                  style={{ cursor: 'pointer' }}
                />
                {day}
              </label>
            ))}
          </div>
        </div>

        {/* Detail Rows */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            textTransform: 'uppercase',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.07em',
            color: 'var(--text-muted)',
            display: 'block',
            marginBottom: '8px'
          }}>
            Rincian Detail Penerima Manfaat
          </label>

          {formDetail.map((det, index) => {
            const selectedCat = categoryMap[det.kategoriId];
            const isSiswa = selectedCat?.jenisSasaran === 'PESERTA_DIDIK';
            const isNonSiswa = selectedCat?.jenisSasaran === 'NON_PESERTA_DIDIK';

            return (
              <div key={index} style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                marginBottom: '16px',
                backgroundColor: 'var(--bg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h5 style={{ margin: '0', fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Item #{index + 1}</h5>
                  <button
                    type="button"
                    onClick={() => removeDetailRow(index)}
                    style={{ color: 'var(--color-danger)', cursor: 'pointer', border: 'none', background: 'none', fontWeight: 600, fontSize: '13px' }}
                    disabled={formDetail.length === 1}
                  >
                    Hapus
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  {/* Kategori */}
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
                      Kategori Klien
                    </label>
                    <Dropdown
                      style={{ width: '100%' }}
                      value={det.kategoriId}
                      onChange={(val) => handleDetailChange(index, 'kategoriId', val)}
                      options={categories.map(c => ({
                        value: c.id,
                        label: `${c.nama} (${c.jenisSasaran})`
                      }))}
                    />
                  </div>

                  {/* Sekolah (Peserta Didik) */}
                  {isSiswa && (
                    <div style={{ flex: '2 1 300px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{
                          textTransform: 'uppercase',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.07em',
                          color: 'var(--text-muted)',
                          display: 'block',
                          marginBottom: '6px'
                        }}>
                          Sekolah Terdaftar
                        </label>
                        <Dropdown
                          style={{ width: '100%' }}
                          value={det.sekolahId}
                          onChange={(val) => {
                            handleDetailChange(index, 'sekolahId', val);
                            handleDetailChange(index, 'sekolahNama', '');
                          }}
                          options={[
                            { value: '', label: '-- Pilih --' },
                            ...schools.map(s => ({ value: s.id, label: s.nama }))
                          ]}
                        />
                      </div>
                      <span style={{ margin: '10px 0', fontWeight: 'bold', color: 'var(--text-muted)' }}>ATAU</span>
                      <div style={{ flex: 1 }}>
                        <label style={{
                          textTransform: 'uppercase',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.07em',
                          color: 'var(--text-muted)',
                          display: 'block',
                          marginBottom: '6px'
                        }}>
                          Nama Sekolah Baru
                        </label>
                        <input
                          type="text"
                          className="form-field"
                          placeholder="Nama Sekolah Baru"
                          value={det.sekolahNama}
                          onChange={(e) => {
                            handleDetailChange(index, 'sekolahNama', e.target.value);
                            handleDetailChange(index, 'sekolahId', '');
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Posyandu (Non Peserta Didik) */}
                  {isNonSiswa && (
                    <div style={{ flex: '2 1 300px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{
                          textTransform: 'uppercase',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.07em',
                          color: 'var(--text-muted)',
                          display: 'block',
                          marginBottom: '6px'
                        }}>
                          Posyandu Terdaftar
                        </label>
                        <Dropdown
                          style={{ width: '100%' }}
                          value={det.posyanduId}
                          onChange={(val) => {
                            handleDetailChange(index, 'posyanduId', val);
                            handleDetailChange(index, 'posyanduNama', '');
                          }}
                          options={[
                            { value: '', label: '-- Pilih --' },
                            ...posyandus.map(y => ({ value: y.id, label: y.nama }))
                          ]}
                        />
                      </div>
                      <span style={{ margin: '10px 0', fontWeight: 'bold', color: 'var(--text-muted)' }}>ATAU</span>
                      <div style={{ flex: 1 }}>
                        <label style={{
                          textTransform: 'uppercase',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.07em',
                          color: 'var(--text-muted)',
                          display: 'block',
                          marginBottom: '6px'
                        }}>
                          Nama Posyandu Baru
                        </label>
                        <input
                          type="text"
                          className="form-field"
                          placeholder="Nama Posyandu Baru"
                          value={det.posyanduNama}
                          onChange={(e) => {
                            handleDetailChange(index, 'posyanduNama', e.target.value);
                            handleDetailChange(index, 'posyanduId', '');
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Jumlah L/P */}
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div>
                    <label style={{
                      textTransform: 'uppercase',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.07em',
                      color: 'var(--text-muted)',
                      display: 'block',
                      marginBottom: '6px'
                    }}>
                      Jumlah Laki-laki
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-field"
                      style={{ width: '120px' }}
                      value={det.lakiLaki}
                      onChange={(e) => handleDetailChange(index, 'lakiLaki', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{
                      textTransform: 'uppercase',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.07em',
                      color: 'var(--text-muted)',
                      display: 'block',
                      marginBottom: '6px'
                    }}>
                      Jumlah Perempuan
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-field"
                      style={{ width: '120px' }}
                      value={det.perempuan}
                      onChange={(e) => handleDetailChange(index, 'perempuan', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <button type="button" onClick={addDetailRow} style={{
            padding: '8px 16px',
            backgroundColor: 'var(--btn-cancel-bg)',
            border: '1px solid var(--btn-cancel-border)',
            color: 'var(--btn-cancel-text)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px'
          }}>
            + Tambah Baris Detail
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
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
            {editingId ? 'Simpan Perubahan' : 'Kirim / Simpan Data'}
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

      {/* List / Table */}
      <Table
        columns={[
          {
            key: 'hariAktif',
            header: 'Hari Aktif',
            width: '150px',
            render: (val) => <strong style={{ color: 'var(--text)' }}>{val.join(', ')}</strong>
          },
          {
            key: 'createdBy',
            header: 'Pembuat',
            render: (val) => val?.nama || 'System'
          },
          {
            key: 'detail',
            header: 'Rincian Detail Penerima (Sasaran & Jumlah)',
            render: (val) => (
              <ul style={{ margin: '0', paddingLeft: '20px' }}>
                {val.map((d, index) => (
                  <li key={d.id || index}>
                    <strong>{d.kategori?.nama}</strong>:{' '}
                    {d.sekolah?.nama && `Sekolah: ${d.sekolah.nama}`}
                    {d.posyandu?.nama && `Posyandu: ${d.posyandu.nama}`}
                    {` (L: ${d.lakiLaki}, P: ${d.perempuan})`}
                  </li>
                ))}
              </ul>
            )
          },
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
        emptyText="Belum ada data penerima manfaat untuk periode ini."
      />
    </div>
  );
};
