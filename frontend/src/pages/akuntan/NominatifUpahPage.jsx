import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import { DatePicker } from '../../components/DatePicker';
import Dropdown from '../../components/Dropdown';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export const NominatifUpahPage = () => {
    const { request } = useApi();
  const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [upahList, setUpahList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [upahForm, setUpahForm] = useState({
        jenisPekerjaan: '',
        namaRelawan: '',
        danaKesehatan: '',
        tk: '',
        pj: ''
    });
    const [upahDetailList, setUpahDetailList] = useState([]);
    const [tempUpahDetail, setTempUpahDetail] = useState({ tanggal: '', nominal: '' });
    const [hariLiburList, setHariLiburList] = useState([]);
    const [newHariLibur, setNewHariLibur] = useState({ tanggal: '', keterangan: '' });
    const [submittingHariLibur, setSubmittingHariLibur] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingLiburId, setPendingLiburId] = useState(null);

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

    // Fetch HariLibur on mount
    useEffect(() => {
        loadHariLiburList();
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

    const addUpahDetail = () => {
        if (!tempUpahDetail.tanggal || !tempUpahDetail.nominal) {
            toast.error('Lengkapi tanggal dan nominal detail harian.');
            return;
        }

        const dateObj = new Date(tempUpahDetail.tanggal);
        const isSunday = dateObj.getDay() === 0;
        const isLibur = hariLiburList.some(hl => {
            const hlDate = new Date(hl.tanggal);
            return hlDate.toISOString().split('T')[0] === tempUpahDetail.tanggal;
        });

        if (isSunday || isLibur) {
            toast.error('Tanggal tersebut adalah hari Minggu atau hari libur.');
            return;
        }
        
        if (upahDetailList.some(item => item.tanggal === tempUpahDetail.tanggal)) {
            toast.error('Tanggal tersebut sudah diinput pada detail harian.');
            return;
        }

        setUpahDetailList(prev => [...prev, { ...tempUpahDetail }]);
        setTempUpahDetail({ tanggal: '', nominal: '' });
    };

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

    const createNominatifUpah = async (e) => {
        e.preventDefault();
        const {
            jenisPekerjaan,
            namaRelawan,
            danaKesehatan,
            tk,
            pj
        } = upahForm;

        if (!periodeId) {
            toast.error('Periode wajib dipilih.');
            return;
        }
        if (!jenisPekerjaan) {
            toast.error('Jenis pekerjaan wajib diisi.');
            return;
        }
        if (!namaRelawan) {
            toast.error('Nama relawan wajib diisi.');
            return;
        }

        const body = {
            periodeId,
            jenisPekerjaan,
            namaRelawan,
            danaKesehatan: danaKesehatan !== '' ? parseFloat(danaKesehatan) : undefined,
            tk: tk !== '' ? parseFloat(tk) : undefined,
            pj: pj !== '' ? parseFloat(pj) : undefined,
            detailHarian: upahDetailList.map(item => ({
                tanggal: item.tanggal,
                nominal: parseFloat(item.nominal)
            }))
        };

        try {
            const r = await request('/akuntan/daftar-nominatif-upah', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (r.ok) {
                toast.success('Daftar Nominatif Upah berhasil disimpan.');
                setUpahForm({
                    jenisPekerjaan: '',
                    namaRelawan: '',
                    danaKesehatan: '',
                    tk: '',
                    pj: ''
                });
                setUpahDetailList([]);
                loadUpahList(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                toast.error(d.error || 'Gagal menyimpan Daftar Nominatif Upah');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

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

            {/* Form Nominatif */}
            <form onSubmit={createNominatifUpah} style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Buat Daftar Nominatif Upah</h3>
                
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
                            Jenis Pekerjaan
                        </label>
                        <input
                            type="text"
                            placeholder="Misal: RELAWAN, TUKANG, STAF"
                            value={upahForm.jenisPekerjaan}
                            onChange={e => setUpahForm(prev => ({ ...prev, jenisPekerjaan: e.target.value }))}
                            required
                            className="form-field"
                        />
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
                            Nama Relawan
                        </label>
                        <input
                            type="text"
                            placeholder="Nama Lengkap"
                            value={upahForm.namaRelawan}
                            onChange={e => setUpahForm(prev => ({ ...prev, namaRelawan: e.target.value }))}
                            required
                            className="form-field"
                        />
                    </div>
                </div>

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
                            Dana Kesehatan (opsional)
                        </label>
                        <input
                            type="number"
                            placeholder="Dana Kesehatan (Rp)"
                            value={upahForm.danaKesehatan}
                            onChange={e => setUpahForm(prev => ({ ...prev, danaKesehatan: e.target.value }))}
                            className="form-field"
                        />
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
                            TK / BPJS Ketenagakerjaan (opsional)
                        </label>
                        <input
                            type="number"
                            placeholder="Nominal TK (Rp)"
                            value={upahForm.tk}
                            onChange={e => setUpahForm(prev => ({ ...prev, tk: e.target.value }))}
                            className="form-field"
                        />
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
                            PJ / Asuransi Lain (opsional)
                        </label>
                        <input
                            type="number"
                            placeholder="Nominal PJ (Rp)"
                            value={upahForm.pj}
                            onChange={e => setUpahForm(prev => ({ ...prev, pj: e.target.value }))}
                            className="form-field"
                        />
                    </div>
                </div>

                {/* Sub-form Detail Harian */}
                <div style={{
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    marginTop: '10px',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text)'
                }}>
                    <h4 style={{ marginTop: '0', marginBottom: '16px', fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                        Rincian Upah Harian
                    </h4>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '16px', flexWrap: 'wrap' }}>
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
                                Tanggal
                            </label>
                            <DatePicker
                                value={tempUpahDetail.tanggal}
                                onChange={val => setTempUpahDetail(prev => ({ ...prev, tanggal: val }))}
                                defaultFocusMonth={activePeriod?.tanggalMulai}
                                required
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
                                Nominal Harian (Rp)
                            </label>
                            <input
                                type="number"
                                placeholder="Nominal Harian (Rp)"
                                value={tempUpahDetail.nominal}
                                onChange={e => setTempUpahDetail(prev => ({ ...prev, nominal: e.target.value }))}
                                className="form-field"
                                style={{ width: '180px' }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={addUpahDetail}
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
                            Tambah Rincian
                        </button>
                    </div>

                    {/* List Sementara Rincian Harian */}
                    <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
                        {upahDetailList.map((item, index) => {
                            const dateObj = new Date(item.tanggal);
                            const isSunday = dateObj.getDay() === 0;
                            const isLibur = hariLiburList.some(hl => {
                                const hlDate = new Date(hl.tanggal);
                                return hlDate.toISOString().split('T')[0] === item.tanggal;
                            });
                            if (isSunday || isLibur) return null;

                            return (
                                <li key={index} style={{ marginBottom: '5px' }}>
                                    {item.tanggal} — Rp{Number(item.nominal).toLocaleString('id-ID')}
                                    {' '}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUpahDetailList(prev => prev.filter((_, idx) => idx !== index));
                                        }}
                                        style={{ color: 'var(--color-danger)', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        [Hapus]
                                    </button>
                                </li>
                            );
                        })}
                        {upahDetailList.length === 0 && (
                            <li style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada rincian harian ditambahkan.</li>
                        )}
                    </ul>
                </div>

                <div style={{ marginTop: '10px' }}>
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
                        Simpan Daftar Nominatif Upah
                    </button>
                </div>
            </form>

            {/* List Nominatif */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Nominatif Upah</h3>
            {loading && <p style={{ color: 'var(--text-muted)' }}>Memuat daftar nominatif upah...</p>}
            {!loading && (
                <Table
                    columns={[
                        { key: 'jenisPekerjaan', header: 'Jenis Pekerjaan' },
                        { key: 'namaRelawan', header: 'Nama Relawan' },
                        {
                            key: 'totalHonorarium',
                            header: 'Total Honorarium',
                            align: 'right',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </span>
                            )
                        },
                        {
                            key: 'totalUpah',
                            header: 'Total Upah',
                            align: 'right',
                            render: (v) => (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text)' }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </strong>
                            )
                        }
                    ]}
                    data={upahList}
                    emptyText="Belum ada data Daftar Nominatif Upah untuk periode ini."
                />
            )}

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
