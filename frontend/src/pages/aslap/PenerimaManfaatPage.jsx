import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import Dropdown from '../../components/Dropdown';
import { NumberInput } from '../../components/NumberInput';

export const PenerimaManfaatPage = () => {
  const { request } = useApi();
  const toast = useToast();

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
  
  // New Block Form State
  const [ats, setAts] = useState({
    ATS_KURANG_9TH: { lakiLaki: 0, perempuan: 0 },
    ATS_9_18TH: { lakiLaki: 0, perempuan: 0 }
  });
  const [formSchools, setFormSchools] = useState([]);
  const [formPosyandus, setFormPosyandus] = useState([]);

  // Message states
  const daysList = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

  const schoolCategoriesMap = {
    TK: ['PAUD_TK', 'PENDIDIK', 'TENAGA_KEPENDIDIKAN'],
    SD: ['SD_1_3', 'SD_4_6', 'PENDIDIK', 'TENAGA_KEPENDIDIKAN'],
    SMP: ['SMP_1_3', 'PENDIDIK', 'TENAGA_KEPENDIDIKAN'],
    SMA_SMK: ['SMA_SMK_4_6', 'PENDIDIK', 'TENAGA_KEPENDIDIKAN']
  };

  const getSchoolCategories = (jenjang) => {
    return schoolCategoriesMap[jenjang] || ['PENDIDIK', 'TENAGA_KEPENDIDIKAN'];
  };

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
        toast.error('Gagal memuat data master dari server.');
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
        toast.error('Gagal mengambil daftar penerima manfaat.');
      }
    };
    fetchList();
  }, [selectedPeriodId]);

  // Helper mapping category code to category object
  const categoriesByKode = {};
  categories.forEach(c => { categoriesByKode[c.kode] = c; });
  const categoriesById = {};
  categories.forEach(c => { categoriesById[c.id] = c; });

  const resetForm = () => {
    setEditingId(null);
    setFormHariAktif([]);
    setAts({
      ATS_KURANG_9TH: { lakiLaki: 0, perempuan: 0 },
      ATS_9_18TH: { lakiLaki: 0, perempuan: 0 }
    });
    setFormSchools([]);
    setFormPosyandus([]);
  };

  const handleEditClick = (row) => {
    setEditingId(row.id);
    setFormHariAktif(row.hariAktif);

    // Initialize empty states
    const newAts = {
      ATS_KURANG_9TH: { lakiLaki: 0, perempuan: 0 },
      ATS_9_18TH: { lakiLaki: 0, perempuan: 0 }
    };
    const schoolGroups = {};
    const posyanduGroups = {};

    row.detail.forEach(d => {
      const cat = d.kategori || categoriesById[d.kategoriId];
      const kode = cat?.kode;
      if (!kode) return;

      if (['ATS_KURANG_9TH', 'ATS_9_18TH'].includes(kode)) {
        newAts[kode] = { lakiLaki: d.lakiLaki, perempuan: d.perempuan };
      } else if (d.sekolahId || d.sekolah?.nama) {
        const key = d.sekolahId || `nama:${d.sekolah?.nama}`;
        if (!schoolGroups[key]) {
          schoolGroups[key] = {
            sekolahId: d.sekolahId || '',
            sekolahNama: d.sekolahId ? '' : (d.sekolah?.nama || ''),
            sekolahJenjang: d.sekolah?.jenjang || '',
            values: {}
          };
        }
        schoolGroups[key].values[kode] = { lakiLaki: d.lakiLaki, perempuan: d.perempuan };
      } else if (d.posyanduId || d.posyandu?.nama) {
        const key = d.posyanduId || `nama:${d.posyandu?.nama}`;
        if (!posyanduGroups[key]) {
          posyanduGroups[key] = {
            posyanduId: d.posyanduId || '',
            posyanduNama: d.posyanduId ? '' : (d.posyandu?.nama || ''),
            values: {}
          };
        }
        posyanduGroups[key].values[kode] = { lakiLaki: d.lakiLaki, perempuan: d.perempuan };
      }
    });

    setAts(newAts);
    setFormSchools(Object.values(schoolGroups));
    setFormPosyandus(Object.values(posyanduGroups));
    // Smooth scroll to top of the form
    const formElement = document.getElementById('penerima-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;    try {
      const res = await request(`/aslap/penerima-manfaat/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Data berhasil dihapus.');
        const listRes = await request(`/aslap/penerima-manfaat?periodeId=${selectedPeriodId}`);
        const data = await listRes.json();
        setItems(data);
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Gagal menghapus data.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Koneksi ke server gagal.');
    }
  };

  const handleDayCheckboxChange = (day) => {
    if (formHariAktif.includes(day)) {
      setFormHariAktif(formHariAktif.filter(d => d !== day));
    } else {
      setFormHariAktif([...formHariAktif, day]);
    }
  };

  // School Block operations
  const addSchoolBlock = () => {
    setFormSchools([
      ...formSchools,
      {
        sekolahId: '',
        sekolahNama: '',
        sekolahJenjang: 'SD',
        values: {}
      }
    ]);
  };

  const removeSchoolBlock = (index) => {
    setFormSchools(formSchools.filter((_, idx) => idx !== index));
  };

  const handleSchoolBlockChange = (index, field, value) => {
    const updated = [...formSchools];
    updated[index][field] = value;
    if (field === 'sekolahId') {
      if (value !== 'NEW') {
        updated[index].sekolahNama = '';
        const selected = schools.find(s => s.id === value);
        if (selected) {
          updated[index].sekolahJenjang = selected.jenjang;
        }
      } else {
        updated[index].sekolahJenjang = 'SD'; // default
      }
    }
    setFormSchools(updated);
  };

  const handleSchoolValueChange = (schoolIndex, categoryKode, gender, value) => {
    const updated = [...formSchools];
    if (!updated[schoolIndex].values[categoryKode]) {
      updated[schoolIndex].values[categoryKode] = { lakiLaki: 0, perempuan: 0 };
    }
    updated[schoolIndex].values[categoryKode][gender] = value === '' ? '' : (parseInt(value, 10) || 0);
    setFormSchools(updated);
  };

  // Posyandu Block operations
  const addPosyanduBlock = () => {
    setFormPosyandus([
      ...formPosyandus,
      {
        posyanduId: '',
        posyanduNama: '',
        values: {}
      }
    ]);
  };

  const removePosyanduBlock = (index) => {
    setFormPosyandus(formPosyandus.filter((_, idx) => idx !== index));
  };

  const handlePosyanduBlockChange = (index, field, value) => {
    const updated = [...formPosyandus];
    updated[index][field] = value;
    if (field === 'posyanduId' && value !== 'NEW') {
      updated[index].posyanduNama = '';
    }
    setFormPosyandus(updated);
  };

  const handlePosyanduValueChange = (posyanduIndex, categoryKode, gender, value) => {
    const updated = [...formPosyandus];
    if (!updated[posyanduIndex].values[categoryKode]) {
      updated[posyanduIndex].values[categoryKode] = { lakiLaki: 0, perempuan: 0 };
    }
    updated[posyanduIndex].values[categoryKode][gender] = value === '' ? '' : (parseInt(value, 10) || 0);
    setFormPosyandus(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // HTML5 Constraint validation
    const formElement = e.currentTarget;
    if (!formElement.checkValidity()) {
      const invalidElement = formElement.querySelector(':invalid');
      if (invalidElement) {
        invalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        invalidElement.focus();
      }
      return;
    }

    if (formHariAktif.length === 0) {
      toast.error('Pilih minimal satu hari aktif operasional');
      setTimeout(() => {
        const el = document.getElementById('error-message-box');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    const cleanedDetail = [];

    const addDetailItem = (kode, l, p, schoolId, schoolNama, schoolJenjang, posyanduId, posyanduNama) => {
      const cat = categoriesByKode[kode];
      if (!cat) return;
      cleanedDetail.push({
        kategoriId: cat.id,
        lakiLaki: parseInt(l, 10) || 0,
        perempuan: parseInt(p, 10) || 0,
        sekolahId: schoolId || undefined,
        sekolahNama: schoolNama || undefined,
        sekolahJenjang: schoolJenjang || undefined,
        posyanduId: posyanduId || undefined,
        posyanduNama: posyanduNama || undefined
      });
    };

    // 1. Flatten ATS
    addDetailItem('ATS_KURANG_9TH', ats.ATS_KURANG_9TH.lakiLaki, ats.ATS_KURANG_9TH.perempuan);
    addDetailItem('ATS_9_18TH', ats.ATS_9_18TH.lakiLaki, ats.ATS_9_18TH.perempuan);

    // 2. Flatten Schools
    for (let i = 0; i < formSchools.length; i++) {
      const block = formSchools[i];
      const sId = block.sekolahId;
      const sNama = block.sekolahNama;
      
      if (!sId) {
        toast.error(`Pilih sekolah pada Blok Sekolah #${i + 1}`);
        setTimeout(() => {
          const el = document.getElementById(`school-block-${i}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        return;
      }
      if (sId === 'NEW' && !sNama.trim()) {
        toast.error(`Nama sekolah baru pada Blok Sekolah #${i + 1} tidak boleh kosong`);
        setTimeout(() => {
          const el = document.getElementById(`school-name-${i}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        return;
      }

      const selectedS = schools.find(s => s.id === sId);
      const jenjang = selectedS ? selectedS.jenjang : block.sekolahJenjang;
      const codes = getSchoolCategories(jenjang);

      codes.forEach(kode => {
        const val = block.values[kode] || { lakiLaki: 0, perempuan: 0 };
        addDetailItem(kode, val.lakiLaki, val.perempuan, sId === 'NEW' ? undefined : sId, sId === 'NEW' ? sNama : undefined, jenjang);
      });
    }

    // 3. Flatten Posyandus
    for (let i = 0; i < formPosyandus.length; i++) {
      const block = formPosyandus[i];
      const pId = block.posyanduId;
      const pNama = block.posyanduNama;

      if (!pId) {
        toast.error(`Pilih posyandu pada Blok Posyandu #${i + 1}`);
        setTimeout(() => {
          const el = document.getElementById(`posyandu-block-${i}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        return;
      }
      if (pId === 'NEW' && !pNama.trim()) {
        toast.error(`Nama posyandu baru pada Blok Posyandu #${i + 1} tidak boleh kosong`);
        setTimeout(() => {
          const el = document.getElementById(`posyandu-name-${i}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        return;
      }

      const codes = ['BUMIL', 'BUSUI', 'BALITA', 'KADER_POSYANDU'];
      codes.forEach(kode => {
        const val = block.values[kode] || { lakiLaki: 0, perempuan: 0 };
        addDetailItem(kode, val.lakiLaki, val.perempuan, undefined, undefined, undefined, pId === 'NEW' ? undefined : pId, pId === 'NEW' ? pNama : undefined);
      });
    }

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
        toast.success(editingId ? 'Data berhasil diperbarui.' : 'Data berhasil ditambahkan.');
        resetForm();
        const listRes = await request(`/aslap/penerima-manfaat?periodeId=${selectedPeriodId}`);
        const listData = await listRes.json();
        setItems(listData);
      } else {
        toast.error(data.error || 'Terjadi kesalahan pada input.');
        setTimeout(() => {
          const el = document.getElementById('error-message-box');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
      }
    } catch (err) {
      console.error(err);
      toast.error('Koneksi ke server gagal.');
      setTimeout(() => {
        const el = document.getElementById('error-message-box');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  };

  const schoolOptions = [
    { value: '', label: '-- Pilih Sekolah --' },
    ...schools.map(s => ({ value: s.id, label: `${s.nama} (${s.jenjang})` })),
    { value: 'NEW', label: '-- Tambah Sekolah Baru --' }
  ];

  const jenjangOptions = [
    { value: 'TK', label: 'TK/PAUD' },
    { value: 'SD', label: 'SD' },
    { value: 'SMP', label: 'SMP' },
    { value: 'SMA_SMK', label: 'SMA/SMK' }
  ];

  const posyanduOptions = [
    { value: '', label: '-- Pilih Posyandu --' },
    ...posyandus.map(y => ({ value: y.id, label: y.nama })),
    { value: 'NEW', label: '-- Tambah Posyandu Baru --' }
  ];

  return (
    <div>
      <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Pengelolaan Penerima Manfaat (Sekolah &amp; Posyandu)</h2>

      {/* Messages */}
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
      <form id="penerima-form" onSubmit={handleSubmit} style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow)',
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
          {editingId ? 'Edit Data Penerima' : 'Tambah Data Baru'}
        </h3>

        {/* Hari Aktif */}
        <div style={{ marginBottom: '24px', backgroundColor: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <label style={{
            textTransform: 'uppercase',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.07em',
            color: 'var(--text-muted)',
            display: 'block',
            marginBottom: '12px'
          }}>
            Hari Aktif Operasional
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            {daysList.map(day => (
              <label key={day} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={formHariAktif.includes(day)}
                  onChange={() => handleDayCheckboxChange(day)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                {day}
              </label>
            ))}
          </div>
        </div>

        {/* SECTION 1: FIXED ATS SECTION */}
        <div className="ui-card" style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--border)' }}>
          <h4 style={{ margin: '0 0 16px 0', color: 'var(--text)', fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Anak Tidak Sekolah (ATS)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* ATS < 9 Tahun */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '12px' }}>
              <div style={{ flex: '1 1 250px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Anak Tidak Sekolah Usia &lt; 9 Tahun</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Kategori: ATS_KURANG_9TH (Porsi Kecil)</div>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Laki-laki</label>
                  <NumberInput
                    required
                    className="form-field"
                    style={{ width: '100px' }}
                    value={ats.ATS_KURANG_9TH.lakiLaki === '' ? '' : Number(ats.ATS_KURANG_9TH.lakiLaki)}
                    onChange={(val) => setAts({
                      ...ats,
                      ATS_KURANG_9TH: { ...ats.ATS_KURANG_9TH, lakiLaki: val }
                    })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Perempuan</label>
                  <NumberInput
                    required
                    className="form-field"
                    style={{ width: '100px' }}
                    value={ats.ATS_KURANG_9TH.perempuan === '' ? '' : Number(ats.ATS_KURANG_9TH.perempuan)}
                    onChange={(val) => setAts({
                      ...ats,
                      ATS_KURANG_9TH: { ...ats.ATS_KURANG_9TH, perempuan: val }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* ATS 9-18 Tahun */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
              <div style={{ flex: '1 1 250px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Anak Tidak Sekolah Usia 9 - 18 Tahun</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Kategori: ATS_9_18TH (Porsi Besar)</div>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Laki-laki</label>
                  <NumberInput
                    required
                    className="form-field"
                    style={{ width: '100px' }}
                    value={ats.ATS_9_18TH.lakiLaki === '' ? '' : Number(ats.ATS_9_18TH.lakiLaki)}
                    onChange={(val) => setAts({
                      ...ats,
                      ATS_9_18TH: { ...ats.ATS_9_18TH, lakiLaki: val }
                    })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Perempuan</label>
                  <NumberInput
                    required
                    className="form-field"
                    style={{ width: '100px' }}
                    value={ats.ATS_9_18TH.perempuan === '' ? '' : Number(ats.ATS_9_18TH.perempuan)}
                    onChange={(val) => setAts({
                      ...ats,
                      ATS_9_18TH: { ...ats.ATS_9_18TH, perempuan: val }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: SCHOOL BLOCKS */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: '0', color: 'var(--text)', fontSize: '16px', fontWeight: 700 }}>
              Rincian Sekolah Terdaftar
            </h4>
            <button
              type="button"
              onClick={addSchoolBlock}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              + Tambah Sekolah
            </button>
          </div>

          {formSchools.map((block, sIdx) => {
            const selectedS = schools.find(s => s.id === block.sekolahId);
            const jenjang = selectedS ? selectedS.jenjang : block.sekolahJenjang;
            const categoryKodes = getSchoolCategories(jenjang);

            return (
              <div
                key={sIdx}
                id={`school-block-${sIdx}`}
                className="ui-card"
                style={{ padding: '20px', marginBottom: '20px', border: '1px solid var(--border)', position: 'relative' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <h5 style={{ margin: '0', fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    Blok Sekolah #{sIdx + 1}
                  </h5>
                  <button
                    type="button"
                    onClick={() => removeSchoolBlock(sIdx)}
                    style={{ color: 'var(--color-danger)', cursor: 'pointer', border: 'none', background: 'none', fontWeight: 600, fontSize: '13px' }}
                  >
                    Hapus
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  <div style={{ flex: '1 1 250px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Pilih Sekolah
                    </label>
                    <Dropdown
                      style={{ width: '100%' }}
                      value={block.sekolahId}
                      onChange={(val) => handleSchoolBlockChange(sIdx, 'sekolahId', val)}
                      options={schoolOptions}
                    />
                  </div>

                  {block.sekolahId === 'NEW' && (
                    <>
                      <div style={{ flex: '2 1 250px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                          Nama Sekolah Baru
                        </label>
                        <input
                          id={`school-name-${sIdx}`}
                          type="text"
                          required
                          className="form-field"
                          placeholder="Masukkan nama sekolah..."
                          value={block.sekolahNama}
                          onChange={(e) => handleSchoolBlockChange(sIdx, 'sekolahNama', e.target.value)}
                        />
                      </div>
                      <div style={{ flex: '1 1 150px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                          Jenjang
                        </label>
                        <Dropdown
                          style={{ width: '100%' }}
                          value={block.sekolahJenjang}
                          onChange={(val) => handleSchoolBlockChange(sIdx, 'sekolahJenjang', val)}
                          options={jenjangOptions}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Render inputs based on jenjang */}
                {(block.sekolahId || block.sekolahNama) && (
                  <div style={{ backgroundColor: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Rincian Sasaran ({jenjang})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {categoryKodes.map(kode => {
                        const cat = categoriesByKode[kode];
                        if (!cat) return null;
                        const val = block.values[kode] || { lakiLaki: 0, perempuan: 0 };

                        return (
                          <div key={kode} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            <div style={{ flex: '1 1 200px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{cat.nama}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>({cat.jenisPorsi === 'KECIL' ? 'Porsi Kecil' : 'Porsi Besar'})</span>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>L:</span>
                                <NumberInput
                                  required
                                  className="form-field"
                                  style={{ width: '80px', padding: '6px 8px' }}
                                  value={val.lakiLaki === '' ? '' : Number(val.lakiLaki)}
                                  onChange={(valInput) => handleSchoolValueChange(sIdx, kode, 'lakiLaki', valInput)}
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>P:</span>
                                <NumberInput
                                  required
                                  className="form-field"
                                  style={{ width: '80px', padding: '6px 8px' }}
                                  value={val.perempuan === '' ? '' : Number(val.perempuan)}
                                  onChange={(valInput) => handleSchoolValueChange(sIdx, kode, 'perempuan', valInput)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* SECTION 3: POSYANDU BLOCKS */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: '0', color: 'var(--text)', fontSize: '16px', fontWeight: 700 }}>
              Rincian Posyandu / Non-Siswa
            </h4>
            <button
              type="button"
              onClick={addPosyanduBlock}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              + Tambah Posyandu
            </button>
          </div>

          {formPosyandus.map((block, pIdx) => {
            const posyanduKodes = ['BUMIL', 'BUSUI', 'BALITA', 'KADER_POSYANDU'];

            return (
              <div
                key={pIdx}
                id={`posyandu-block-${pIdx}`}
                className="ui-card"
                style={{ padding: '20px', marginBottom: '20px', border: '1px solid var(--border)', position: 'relative' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <h5 style={{ margin: '0', fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    Blok Posyandu #{pIdx + 1}
                  </h5>
                  <button
                    type="button"
                    onClick={() => removePosyanduBlock(pIdx)}
                    style={{ color: 'var(--color-danger)', cursor: 'pointer', border: 'none', background: 'none', fontWeight: 600, fontSize: '13px' }}
                  >
                    Hapus
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  <div style={{ flex: '1 1 250px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Pilih Posyandu
                    </label>
                    <Dropdown
                      style={{ width: '100%' }}
                      value={block.posyanduId}
                      onChange={(val) => handlePosyanduBlockChange(pIdx, 'posyanduId', val)}
                      options={posyanduOptions}
                    />
                  </div>

                  {block.posyanduId === 'NEW' && (
                    <div style={{ flex: '2 1 250px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Nama Posyandu Baru
                      </label>
                      <input
                        id={`posyandu-name-${pIdx}`}
                        type="text"
                        required
                        className="form-field"
                        placeholder="Masukkan nama posyandu..."
                        value={block.posyanduNama}
                        onChange={(e) => handlePosyanduBlockChange(pIdx, 'posyanduNama', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Render fixed posyandu inputs */}
                {(block.posyanduId || block.posyanduNama) && (
                  <div style={{ backgroundColor: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Rincian Sasaran Posyandu
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {posyanduKodes.map(kode => {
                        const cat = categoriesByKode[kode];
                        if (!cat) return null;
                        const val = block.values[kode] || { lakiLaki: 0, perempuan: 0 };

                        return (
                          <div key={kode} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            <div style={{ flex: '1 1 200px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{cat.nama}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>({cat.jenisPorsi === 'KECIL' ? 'Porsi Kecil' : 'Porsi Besar'})</span>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>L:</span>
                                <NumberInput
                                  required
                                  className="form-field"
                                  style={{ width: '80px', padding: '6px 8px' }}
                                  value={val.lakiLaki === '' ? '' : Number(val.lakiLaki)}
                                  onChange={(valInput) => handlePosyanduValueChange(pIdx, kode, 'lakiLaki', valInput)}
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>P:</span>
                                <NumberInput
                                  required
                                  className="form-field"
                                  style={{ width: '80px', padding: '6px 8px' }}
                                  value={val.perempuan === '' ? '' : Number(val.perempuan)}
                                  onChange={(valInput) => handlePosyanduValueChange(pIdx, kode, 'perempuan', valInput)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
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
            render: (val) => {
              // Group details by school or posyandu for better readability in table
              const atsItems = [];
              const schoolMap = {};
              const posyanduMap = {};

              val.forEach(d => {
                const cat = d.kategori || categoriesById[d.kategoriId];
                const kode = cat?.kode;
                if (['ATS_KURANG_9TH', 'ATS_9_18TH'].includes(kode)) {
                  atsItems.push(d);
                } else if (d.sekolah) {
                  if (!schoolMap[d.sekolah.nama]) schoolMap[d.sekolah.nama] = [];
                  schoolMap[d.sekolah.nama].push(d);
                } else if (d.posyandu) {
                  if (!posyanduMap[d.posyandu.nama]) posyanduMap[d.posyandu.nama] = [];
                  posyanduMap[d.posyandu.nama].push(d);
                }
              });

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  {atsItems.length > 0 && (
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>[ATS]: </span>
                      {atsItems.map((d, i) => (
                        <span key={d.id || i} style={{ marginRight: '10px' }}>
                          {d.kategori?.nama || categoriesById[d.kategoriId]?.nama} (L:{d.lakiLaki}, P:{d.perempuan})
                        </span>
                      ))}
                    </div>
                  )}
                  {Object.entries(schoolMap).map(([name, list]) => (
                    <div key={name}>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{name}: </span>
                      {list.map((d, i) => (
                        <span key={d.id || i} style={{ marginRight: '10px' }}>
                          {d.kategori?.nama || categoriesById[d.kategoriId]?.nama} (L:{d.lakiLaki}, P:{d.perempuan})
                        </span>
                      ))}
                    </div>
                  ))}
                  {Object.entries(posyanduMap).map(([name, list]) => (
                    <div key={name}>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{name}: </span>
                      {list.map((d, i) => (
                        <span key={d.id || i} style={{ marginRight: '10px' }}>
                          {d.kategori?.nama || categoriesById[d.kategoriId]?.nama} (L:{d.lakiLaki}, P:{d.perempuan})
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              );
            }
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
