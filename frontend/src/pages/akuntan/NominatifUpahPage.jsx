import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { DatePicker } from '../../components/DatePicker';
import Dropdown from '../../components/Dropdown';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { StatusBadge } from '../../components/StatusBadge';
import { NominatifUpahGrid } from '../../components/NominatifUpahGrid';

export const NominatifUpahPage = () => {
    const { request } = useApi();
  const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [upahList, setUpahList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hariLiburList, setHariLiburList] = useState([]);
    const [newHariLibur, setNewHariLibur] = useState({ tanggal: '', keterangan: '' });
    const [submittingHariLibur, setSubmittingHariLibur] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingLiburId, setPendingLiburId] = useState(null);

    // STATE MASTER JENIS PEKERJAAN
    const [jenisPekerjaanList, setJenisPekerjaanList] = useState([]);
    const [jpForm, setJpForm] = useState({ nama: '', tarifHarian: '' });
    const [submittingJp, setSubmittingJp] = useState(false);
    const [editJpId, setEditJpId] = useState(null);
    const [editJpForm, setEditJpForm] = useState({ nama: '', tarifHarian: '' });

    const [jenisPekerjaanOptions, setJenisPekerjaanOptions] = useState([]);

    const loadActiveJenisPekerjaanOptions = async () => {
        try {
            const r = await request('/akuntan/jenis-pekerjaan');
            if (r.ok) {
                const d = await r.json();
                if (Array.isArray(d)) setJenisPekerjaanOptions(d);
            }
        } catch (err) {
            toast.error('Gagal memuat opsi jenis pekerjaan.');
        }
    };



    const loadJenisPekerjaanList = async () => {
        try {
            const r = await request('/akuntan/jenis-pekerjaan?all=true');
            if (r.ok) {
                const d = await r.json();
                if (Array.isArray(d)) setJenisPekerjaanList(d);
            }
        } catch (err) {
            toast.error('Gagal memuat daftar jenis pekerjaan.');
        }
    };

    const formatRupiah = (number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(number);
    };

    const loadHariLiburList = async () => {
        try {
            const r = await request('/akuntan/hari-libur');
            if (r.ok) {
                const d = await r.json();
                if (Array.isArray(d)) setHariLiburList(d);
            }
        } catch (err) {
            toast.error('Gagal memuat daftar hari libur.');
        }
    };

    // Fetch HariLibur and JenisPekerjaan on mount
    useEffect(() => {
        loadHariLiburList();
        loadJenisPekerjaanList();
        loadActiveJenisPekerjaanOptions();
    }, []);

    // Fetch periods on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode.'));
    }, []);

    const loadUpahList = async (pid) => {
        if (!pid) return;
        setLoading(true);
        try {
            const r = await request(`/akuntan/daftar-nominatif-upah?periodeId=${pid}`);
            if (r.ok) {
                setUpahList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar Nominatif Upah' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setLoading(false);
        }
    };

    // Load list when period changes
    useEffect(() => {
        if (periodeId) {
            loadUpahList(periodeId);
        }
    }, [periodeId]);

    const activePeriod = periods.find(p => p.id === periodeId);



    const handleCreateHariLibur = async (e) => {
        e.preventDefault();
        if (!newHariLibur.tanggal) {
            toast.error('Tanggal wajib diisi.');
            return;
        }
        setSubmittingHariLibur(true);
        try {
            const r = await request('/akuntan/hari-libur', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newHariLibur)
            });
            if (r.ok) {
                toast.success('Hari libur berhasil ditambahkan.');
                setNewHariLibur({ tanggal: '', keterangan: '' });
                loadHariLiburList();
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal menambahkan hari libur' }));
                toast.error(d.error || 'Gagal menambahkan hari libur');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setSubmittingHariLibur(false);
        }
    };

    const triggerDeleteHariLibur = (id) => {
        setPendingLiburId(id);
        setConfirmOpen(true);
    };

    const handleDeleteHariLibur = async () => {
        if (!pendingLiburId) return;
        setConfirmOpen(false);
        try {
            const r = await request(`/akuntan/hari-libur/${pendingLiburId}`, {
                method: 'DELETE'
            });
            if (r.ok) {
                toast.success('Hari libur berhasil dihapus.');
                loadHariLiburList();
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal menghapus hari libur' }));
                toast.error(d.error || 'Gagal menghapus hari libur');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setPendingLiburId(null);
        }
    };

    const handleCreateJp = async (e) => {
        e.preventDefault();
        if (!jpForm.nama || !jpForm.tarifHarian) {
            toast.error('Nama dan Tarif Harian wajib diisi.');
            return;
        }
        setSubmittingJp(true);
        try {
            const r = await request('/akuntan/jenis-pekerjaan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nama: jpForm.nama,
                    tarifHarian: parseFloat(jpForm.tarifHarian)
                })
            });
            if (r.ok) {
                toast.success('Jenis pekerjaan berhasil ditambahkan.');
                setJpForm({ nama: '', tarifHarian: '' });
                loadJenisPekerjaanList();
                loadActiveJenisPekerjaanOptions();
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal menambahkan jenis pekerjaan' }));
                toast.error(d.error || 'Gagal menambahkan jenis pekerjaan');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setSubmittingJp(false);
        }
    };

    const handleUpdateJp = async (e) => {
        e.preventDefault();
        if (!editJpForm.nama || !editJpForm.tarifHarian) {
            toast.error('Nama dan Tarif Harian wajib diisi.');
            return;
        }
        setSubmittingJp(true);
        try {
            const r = await request(`/akuntan/jenis-pekerjaan/${editJpId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nama: editJpForm.nama,
                    tarifHarian: parseFloat(editJpForm.tarifHarian)
                })
            });
            if (r.ok) {
                toast.success('Jenis pekerjaan berhasil diperbarui.');
                setEditJpId(null);
                loadJenisPekerjaanList();
                loadActiveJenisPekerjaanOptions();
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memperbarui jenis pekerjaan' }));
                toast.error(d.error || 'Gagal memperbarui jenis pekerjaan');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setSubmittingJp(false);
        }
    };

    const handleToggleJpAktif = async (item) => {
        try {
            const r = await request(`/akuntan/jenis-pekerjaan/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aktif: !item.aktif })
            });
            if (r.ok) {
                toast.success(`Jenis pekerjaan berhasil ${!item.aktif ? 'diaktifkan' : 'dinonaktifkan'}.`);
                loadJenisPekerjaanList();
                loadActiveJenisPekerjaanOptions();
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal mengubah status jenis pekerjaan' }));
                toast.error(d.error || 'Gagal mengubah status jenis pekerjaan');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const handleSaveGrid = async (rows) => {
        if (!periodeId) {
            toast.error('Periode wajib dipilih.');
            return;
        }
        setLoading(true);
        try {
            const promises = rows.map(row => {
                const body = {
                    jenisPekerjaan: row.jenisPekerjaan,
                    namaRelawan: row.namaRelawan,
                    tarifHarian: row.tarifHarian !== '' && row.tarifHarian !== undefined ? parseFloat(row.tarifHarian) : undefined,
                    danaKesehatan: row.danaKesehatan !== '' && row.danaKesehatan !== undefined ? parseFloat(row.danaKesehatan) : undefined,
                    tk: row.tk !== '' && row.tk !== undefined ? parseFloat(row.tk) : undefined,
                    pj: row.pj !== '' && row.pj !== undefined ? parseFloat(row.pj) : undefined,
                    detailHarian: Object.entries(row.detailHarian)
                        .filter(([_, v]) => v !== undefined && v !== '' && v !== null)
                        .map(([tanggal, nominal]) => ({
                            tanggal,
                            nominal: parseFloat(nominal)
                        }))
                };

                if (row.id) {
                    // PUT /api/akuntan/daftar-nominatif-upah/:id
                    return request(`/akuntan/daftar-nominatif-upah/${row.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                } else {
                    // POST /api/akuntan/daftar-nominatif-upah
                    body.periodeId = periodeId;
                    return request('/akuntan/daftar-nominatif-upah', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                }
            });

            const responses = await Promise.all(promises);
            let hasError = false;
            let errorMsg = '';

            for (const res of responses) {
                if (!res.ok) {
                    hasError = true;
                    const d = await res.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                    errorMsg = d.error || 'Gagal menyimpan salah satu baris data';
                    break;
                }
            }

            if (hasError) {
                toast.error(errorMsg);
            } else {
                toast.success('Semua data Nominatif Upah berhasil disimpan.');
                await loadUpahList(periodeId);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setLoading(false);
        }
    };

    const jpColumns = [
        {
            key: 'nama',
            header: 'Nama Pekerjaan',
            render: (v) => <span style={{ fontWeight: 600, color: 'var(--text)' }}>{v}</span>
        },
        {
            key: 'tarifHarian',
            header: 'Tarif Harian',
            render: (v) => <span>{formatRupiah(v)}</span>
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
                        type="button"
                        onClick={() => {
                            setEditJpId(row.id);
                            setEditJpForm({ nama: row.nama, tarifHarian: row.tarifHarian });
                        }}
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
                        type="button"
                        onClick={() => handleToggleJpAktif(row)}
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

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Daftar Nominatif Upah Relawan</h2>
            
            {/* Pilihan Periode */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
                {/* Pilihan Periode */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    backgroundColor: 'var(--bg-elevated)',
                    boxShadow: 'var(--shadow)',
                    flex: '1 1 320px',
                    maxWidth: '400px'
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
                        value={periodeId}
                        onChange={val => setPeriodeId(val)}
                        options={periods.map(p => ({ value: p.id, label: `${p.tanggalMulai} - ${p.tanggalSelesai}` }))}
                    />
                </div>

                {/* Manajemen Hari Libur */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    backgroundColor: 'var(--bg-elevated)',
                    boxShadow: 'var(--shadow)',
                    flex: '2 1 450px'
                }}>
                    <h3 style={{ margin: '0 0 16px 0', color: 'var(--text)', fontSize: '16px' }}>Kelola Hari Libur</h3>
                    
                    {/* Form input hari libur */}
                    <form onSubmit={handleCreateHariLibur} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
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
                                Tanggal Libur
                            </label>
                            <DatePicker
                                value={newHariLibur.tanggal}
                                onChange={val => setNewHariLibur(prev => ({ ...prev, tanggal: val }))}
                                required
                            />
                        </div>
                        <div style={{ flex: '1 1 180px' }}>
                            <label style={{
                                textTransform: 'uppercase',
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--text-muted)',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Keterangan
                            </label>
                            <input
                                type="text"
                                placeholder="Misal: Tahun Baru"
                                value={newHariLibur.keterangan}
                                onChange={e => setNewHariLibur(prev => ({ ...prev, keterangan: e.target.value }))}
                                className="form-field"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submittingHariLibur}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: 'var(--btn-primary-bg)',
                                color: 'var(--btn-primary-text)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '14px',
                                height: '42px'
                            }}
                        >
                            Tambah
                        </button>
                    </form>

                    {/* Daftar Hari Libur */}
                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
                        {hariLiburList.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Belum ada hari libur terdaftar.</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                        <th style={{ padding: '6px 0', fontSize: '12px', color: 'var(--text-muted)' }}>Tanggal</th>
                                        <th style={{ padding: '6px 0', fontSize: '12px', color: 'var(--text-muted)' }}>Keterangan</th>
                                        <th style={{ padding: '6px 0', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hariLiburList.map((hl) => (
                                        <tr key={hl.id} style={{ borderBottom: '1px dotted var(--border)' }}>
                                            <td style={{ padding: '6px 0', fontSize: '13px', color: 'var(--text)' }}>
                                                {new Date(hl.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </td>
                                            <td style={{ padding: '6px 0', fontSize: '13px', color: 'var(--text)' }}>
                                                {hl.keterangan || '-'}
                                            </td>
                                            <td style={{ padding: '6px 0', textAlign: 'right' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => triggerDeleteHariLibur(hl.id)}
                                                    style={{
                                                        color: 'var(--color-danger)',
                                                        border: 'none',
                                                        background: 'none',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    Hapus
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Setup Jenis Pekerjaan & Tarif Harian */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px'
            }}>
                <h3 style={{ margin: '0 0 16px 0', color: 'var(--text)', fontSize: '16px' }}>Setup Jenis Pekerjaan & Tarif Harian</h3>
                
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    {/* Form tambah / edit */}
                    <div style={{ flex: '1 1 300px' }}>
                        <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                            {editJpId ? 'Edit Jenis Pekerjaan' : 'Tambah Jenis Pekerjaan Baru'}
                        </h4>
                        <form onSubmit={editJpId ? handleUpdateJp : handleCreateJp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Nama Pekerjaan</label>
                                <input
                                    type="text"
                                    placeholder="Misal: RELAWAN, TUKANG, STAF"
                                    value={editJpId ? editJpForm.nama : jpForm.nama}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (editJpId) {
                                            setEditJpForm(prev => ({ ...prev, nama: val }));
                                        } else {
                                            setJpForm(prev => ({ ...prev, nama: val }));
                                        }
                                    }}
                                    required
                                    className="form-field"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Tarif Harian (Rp)</label>
                                <input
                                    type="number"
                                    placeholder="Nominal tarif harian"
                                    value={editJpId ? editJpForm.tarifHarian : jpForm.tarifHarian}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (editJpId) {
                                            setEditJpForm(prev => ({ ...prev, tarifHarian: val }));
                                        } else {
                                            setJpForm(prev => ({ ...prev, tarifHarian: val }));
                                        }
                                    }}
                                    required
                                    className="form-field"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    type="submit"
                                    disabled={submittingJp}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: 'var(--btn-primary-bg)',
                                        color: 'var(--btn-primary-text)',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: 700,
                                        cursor: submittingJp ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {editJpId ? 'Simpan' : 'Tambah'}
                                </button>
                                {editJpId && (
                                    <button
                                        type="button"
                                        onClick={() => setEditJpId(null)}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: 'transparent',
                                            color: 'var(--text)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-sm)',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Batal
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Tabel list */}
                    <div style={{ flex: '2 1 450px' }}>
                        <Table
                            columns={jpColumns}
                            data={jenisPekerjaanList}
                            emptyText="Belum ada data jenis pekerjaan."
                        />
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '40px' }}>
                <NominatifUpahGrid 
                    periode={activePeriod} 
                    hariLiburList={hariLiburList} 
                    jenisPekerjaanOptions={jenisPekerjaanOptions} 
                    existingData={upahList} 
                    onSave={handleSaveGrid} 
                />
            </div>



            <ConfirmDialog
                open={confirmOpen}
                title="Hapus Hari Libur"
                message="Apakah Anda yakin ingin menghapus hari libur ini?"
                onConfirm={handleDeleteHariLibur}
                onCancel={() => setConfirmOpen(false)}
            />
        </div>
    );
};
