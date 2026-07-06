import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

export const JurnalTransaksiPage = () => {
    const { request } = useApi();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [akunList, setAkunList] = useState([]);
    const [jurnalList, setJurnalList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [jurnalForm, setJurnalForm] = useState({
        tanggal: '',
        uraian: '',
        jenis: '',
        nominal: '',
        akunDanaBiayaId: '',
        akunKasId: ''
    });

    // Load periods & accounts on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => setError('Gagal memuat daftar periode.'));

        request('/akuntan/akun')
            .then(r => r.json())
            .then(d => setAkunList(d))
            .catch(() => setError('Gagal memuat daftar akun.'));
    }, []);

    const loadJurnal = async (pid) => {
        if (!pid) return;
        setLoading(true);
        setError('');
        try {
            const r = await request(`/akuntan/jurnal-transaksi?periodeId=${pid}`);
            if (r.ok) {
                setJurnalList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar Jurnal Transaksi' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setLoading(false);
        }
    };

    // Load journal list when period changes
    useEffect(() => {
        if (periodeId) {
            loadJurnal(periodeId);
        }
    }, [periodeId]);

    const createJurnal = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const {
            tanggal,
            uraian,
            jenis,
            nominal,
            akunDanaBiayaId,
            akunKasId
        } = jurnalForm;

        if (!periodeId) {
            setError('Periode wajib dipilih.');
            return;
        }
        if (!tanggal) {
            setError('Tanggal transaksi wajib diisi.');
            return;
        }
        if (!uraian) {
            setError('Uraian transaksi wajib diisi.');
            return;
        }
        if (!jenis) {
            setError('Jenis transaksi wajib dipilih (MASUK/KELUAR).');
            return;
        }
        if (nominal === undefined || nominal === '') {
            setError('Nominal wajib diisi.');
            return;
        }
        const valNominal = parseFloat(nominal);
        if (isNaN(valNominal) || valNominal <= 0) {
            setError('Nominal harus berupa angka positif.');
            return;
        }
        if (!akunDanaBiayaId) {
            setError('Akun Dana/Biaya wajib dipilih.');
            return;
        }
        if (!akunKasId) {
            setError('Akun Kas wajib dipilih.');
            return;
        }

        try {
            const r = await request('/akuntan/jurnal-transaksi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    periodeId,
                    tanggal,
                    uraian,
                    jenis,
                    nominal: valNominal,
                    akunDanaBiayaId,
                    akunKasId
                })
            });

            if (r.ok) {
                setSuccess('Jurnal Transaksi berhasil disimpan.');
                // Reset Form
                setJurnalForm({
                    tanggal: '',
                    uraian: '',
                    jenis: '',
                    nominal: '',
                    akunDanaBiayaId: '',
                    akunKasId: ''
                });
                
                // Refresh list jurnal
                loadJurnal(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi.');
        }
    };

    return (
        <div>
            <h2>Pencatatan Jurnal Transaksi Ledger</h2>
            {error && <div style={{ color: 'red', marginBottom: '10px', padding: '8px', border: '1px solid red' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '10px', padding: '8px', border: '1px solid green' }}>{success}</div>}

            {/* Filter Periode */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginRight: '5px' }}>Pilih Periode Aktif: </label>
                <select value={periodeId} onChange={e => setPeriodeId(e.target.value)}>
                    {periods.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.tanggalMulai} - {p.tanggalSelesai}
                        </option>
                    ))}
                </select>
            </div>

            {/* Form Jurnal */}
            <h3>Buat Jurnal Transaksi</h3>
            <form onSubmit={createJurnal} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Tanggal: </label>
                    <input
                        type="date"
                        value={jurnalForm.tanggal}
                        onChange={e => setJurnalForm(prev => ({ ...prev, tanggal: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                        required
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Uraian: </label>
                    <input
                        type="text"
                        placeholder="Contoh: Pembelian Beras 50kg"
                        value={jurnalForm.uraian}
                        onChange={e => setJurnalForm(prev => ({ ...prev, uraian: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                        required
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Jenis Transaksi: </label>
                    <select
                        value={jurnalForm.jenis}
                        onChange={e => setJurnalForm(prev => ({ ...prev, jenis: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                        required
                    >
                        <option value="">-- Pilih Jenis --</option>
                        <option value="MASUK">MASUK (Penerimaan Kas)</option>
                        <option value="KELUAR">KELUAR (Pengeluaran Kas)</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Nominal: </label>
                    <input
                        type="number"
                        placeholder="Nominal (Rp)"
                        value={jurnalForm.nominal}
                        onChange={e => setJurnalForm(prev => ({ ...prev, nominal: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                        required
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Akun Kas: </label>
                    <select
                        value={jurnalForm.akunKasId}
                        onChange={e => setJurnalForm(prev => ({ ...prev, akunKasId: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                        required
                    >
                        <option value="">-- Pilih Akun Kas --</option>
                        {akunList.filter(a => a.tipe === 'KAS').map(a => (
                            <option key={a.id} value={a.id}>
                                [{a.kode}] {a.nama} ({a.tipe})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Akun Dana / Biaya: </label>
                    <select
                        value={jurnalForm.akunDanaBiayaId}
                        onChange={e => setJurnalForm(prev => ({ ...prev, akunDanaBiayaId: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                        required
                    >
                        <option value="">-- Pilih Akun Dana / Biaya --</option>
                        {akunList.filter(a => a.tipe !== 'KAS').map(a => (
                            <option key={a.id} value={a.id}>
                                [{a.kode}] {a.nama} ({a.tipe})
                            </option>
                        ))}
                    </select>
                </div>
                <div style={{ marginTop: '10px' }}>
                    <button type="submit" style={{ padding: '6px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        Simpan Jurnal
                    </button>
                </div>
            </form>

            {/* List Jurnal */}
            <h3>Daftar Jurnal Transaksi</h3>
            {loading && <p>Memuat riwayat transaksi...</p>}
            {!loading && (
                <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th>Tanggal</th>
                            <th>Nomor Bukti</th>
                            <th>Uraian</th>
                            <th>Jenis</th>
                            <th style={{ textAlign: 'right' }}>Nominal</th>
                            <th>Akun Kas</th>
                            <th>Akun Dana / Biaya</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jurnalList.map(j => (
                            <tr key={j.id}>
                                <td>{j.tanggal.split('T')[0]}</td>
                                <td>{j.nomorBukti}</td>
                                <td>{j.uraian}</td>
                                <td>{j.jenis}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Rp{j.nominal.toLocaleString('id-ID')}</td>
                                <td>{j.akunKas ? `[${j.akunKas.kode}] ${j.akunKas.nama}` : '—'}</td>
                                <td>{j.akunDanaBiaya ? `[${j.akunDanaBiaya.kode}] ${j.akunDanaBiaya.nama}` : '—'}</td>
                            </tr>
                        ))}
                        {jurnalList.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '10px' }}>
                                    Belum ada data Jurnal Transaksi untuk periode ini.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};
