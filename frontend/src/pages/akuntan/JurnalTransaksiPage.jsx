import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Table, renderDate, renderCode, renderTruncate, renderCurrency, renderStatus } from '../../components/Table';

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
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ color: 'var(--text)' }}>Pencatatan Jurnal Transaksi Ledger</h2>
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

            {/* Filter Periode */}
            <div style={{ marginBottom: '20px' }}>
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
                <select
                    value={periodeId}
                    onChange={e => setPeriodeId(e.target.value)}
                    style={{
                        width: '300px',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--input-border)',
                        backgroundColor: 'var(--bg)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                    }}
                >
                    {periods.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.tanggalMulai} - {p.tanggalSelesai}
                        </option>
                    ))}
                </select>
            </div>

            {/* Form Jurnal */}
            <form onSubmit={createJurnal} style={{
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
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Buat Jurnal Transaksi</h3>
                
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
                            Tanggal
                        </label>
                        <input
                            type="date"
                            value={jurnalForm.tanggal}
                            onChange={e => setJurnalForm(prev => ({ ...prev, tanggal: e.target.value }))}
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
                            required
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
                            Uraian
                        </label>
                        <input
                            type="text"
                            placeholder="Contoh: Pembelian Beras 50kg"
                            value={jurnalForm.uraian}
                            onChange={e => setJurnalForm(prev => ({ ...prev, uraian: e.target.value }))}
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
                            required
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
                            Jenis Transaksi
                        </label>
                        <select
                            value={jurnalForm.jenis}
                            onChange={e => setJurnalForm(prev => ({ ...prev, jenis: e.target.value }))}
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
                            required
                        >
                            <option value="">-- Pilih Jenis --</option>
                            <option value="MASUK">MASUK (Penerimaan Kas)</option>
                            <option value="KELUAR">KELUAR (Pengeluaran Kas)</option>
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
                            Nominal
                        </label>
                        <input
                            type="number"
                            placeholder="Nominal (Rp)"
                            value={jurnalForm.nominal}
                            onChange={e => setJurnalForm(prev => ({ ...prev, nominal: e.target.value }))}
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
                            required
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
                            Akun Kas
                        </label>
                        <select
                            value={jurnalForm.akunKasId}
                            onChange={e => setJurnalForm(prev => ({ ...prev, akunKasId: e.target.value }))}
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
                            Akun Dana / Biaya
                        </label>
                        <select
                            value={jurnalForm.akunDanaBiayaId}
                            onChange={e => setJurnalForm(prev => ({ ...prev, akunDanaBiayaId: e.target.value }))}
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
                        Simpan Jurnal
                    </button>
                </div>
            </form>

            {/* List Jurnal */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Jurnal Transaksi</h3>
            {loading && <p style={{ color: 'var(--text-muted)' }}>Memuat riwayat transaksi...</p>}
            {!loading && (
                <Table
                    columns={[
                        { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                        { key: 'nomorBukti', header: 'Nomor Bukti', render: (v) => renderCode(v) },
                        { key: 'uraian', header: 'Uraian', render: (v) => renderTruncate(v) },
                        { key: 'jenis', header: 'Jenis', render: (v) => renderStatus(v) },
                        {
                            key: 'nominal',
                            header: 'Nominal',
                            align: 'right',
                            render: (v) => (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </strong>
                            )
                        },
                        { key: 'akunKas', header: 'Akun Kas', render: (v) => v ? `[${v.kode}] ${v.nama}` : '—' },
                        { key: 'akunDanaBiaya', header: 'Akun Dana / Biaya', render: (v) => v ? `[${v.kode}] ${v.nama}` : '—' }
                    ]}
                    data={jurnalList}
                    emptyText="Belum ada data Jurnal Transaksi untuk periode ini."
                />
            )}
        </div>
    );
};
