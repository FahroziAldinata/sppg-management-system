import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Table, renderDate, renderCurrency, renderTruncate } from '../../components/Table';
import { DatePicker } from '../../components/DatePicker';

export const ValidasiStokPage = () => {
    const { request } = useApi();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [bahanPokokList, setBahanPokokList] = useState([]);
    const [validasiList, setValidasiList] = useState([]);
    const [validasiPreview, setValidasiPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Printing related states
    const [isPrinting, setIsPrinting] = useState(false);
    const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
    const [printStockData, setPrintStockData] = useState([]);
    const [printLoading, setPrintLoading] = useState(false);

    const [validasiForm, setValidasiForm] = useState({
        bahanPokokId: '',
        tanggal: '',
        qtyDibeli: '',
        qtyTerpakai: '',
        catatan: ''
    });

    // Load periods, bahan pokok, and validation history on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => setError('Gagal memuat daftar periode.'));

        request('/mitra/bahan-pokok')
            .then(r => r.json())
            .then(d => setBahanPokokList(d))
            .catch(() => { });

        loadValidasiStok();
    }, []);

    // Load riwayat validasi stok
    const loadValidasiStok = async () => {
        try {
            setError('');
            const r = await request('/akuntan/validasi-stok');
            if (r.ok) {
                const resJson = await r.json();
                setValidasiList(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat riwayat validasi stok' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // Load validation preview when ingredients/date changes
    useEffect(() => {
        let active = true;

        const loadValidationPreview = async (bpId, tgl) => {
            if (!bpId || !tgl) {
                if (active) setValidasiPreview(null);
                return;
            }
            try {
                setError('');
                const query = new URLSearchParams({
                    bahanPokokId: bpId,
                    tanggal: tgl
                }).toString();

                const r = await request(`/akuntan/validasi-stok/preview?${query}`);

                if (!active) return;

                if (r.ok) {
                    const data = await r.json();
                    setValidasiPreview(data);
                    setValidasiForm(prev => ({
                        ...prev,
                        qtyDibeli: data.qtyDibeli,
                        qtyTerpakai: data.qtyTerpakai
                    }));
                } else {
                    const d = await r.json().catch(() => ({ error: 'Gagal memuat preview data sistem' }));
                    setError(d.error);
                    setValidasiPreview(null);
                    setValidasiForm(prev => ({ ...prev, qtyDibeli: '', qtyTerpakai: '' }));
                }
            } catch (err) {
                if (!active) return;
                setError(err.message || 'Terjadi kesalahan koneksi');
                setValidasiPreview(null);
                setValidasiForm(prev => ({ ...prev, qtyDibeli: '', qtyTerpakai: '' }));
            }
        };

        if (validasiForm.bahanPokokId && validasiForm.tanggal) {
            loadValidationPreview(validasiForm.bahanPokokId, validasiForm.tanggal);
        } else {
            setValidasiPreview(null);
            setValidasiForm(prev => ({ ...prev, qtyDibeli: '', qtyTerpakai: '' }));
        }

        return () => {
            active = false;
        };
    }, [validasiForm.bahanPokokId, validasiForm.tanggal]);

    const handleCreateValidasi = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const { bahanPokokId, tanggal, qtyDibeli, qtyTerpakai, catatan } = validasiForm;

        if (!bahanPokokId) {
            setError('Bahan pokok wajib dipilih.');
            return;
        }
        if (!tanggal) {
            setError('Tanggal validasi wajib diisi.');
            return;
        }
        if (qtyDibeli === undefined || qtyDibeli === null || qtyDibeli === '') {
            setError('Jumlah pembelian fisik wajib diisi.');
            return;
        }
        if (qtyTerpakai === undefined || qtyTerpakai === null || qtyTerpakai === '') {
            setError('Jumlah pemakaian fisik wajib diisi.');
            return;
        }

        const valQtyDibeli = parseFloat(qtyDibeli);
        const valQtyTerpakai = parseFloat(qtyTerpakai);

        if (isNaN(valQtyDibeli) || valQtyDibeli < 0) {
            setError('Jumlah pembelian fisik harus berupa angka non-negatif.');
            return;
        }
        if (isNaN(valQtyTerpakai) || valQtyTerpakai < 0) {
            setError('Jumlah pemakaian fisik harus berupa angka non-negatif.');
            return;
        }

        try {
            const r = await request('/akuntan/validasi-stok', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bahanPokokId,
                    tanggal,
                    qtyDibeli: valQtyDibeli,
                    qtyTerpakai: valQtyTerpakai,
                    catatan: catatan || null
                })
            });

            if (r.ok) {
                setSuccess('Validasi dan penyesuaian stok berhasil disimpan.');
                setValidasiForm({
                    bahanPokokId: '',
                    tanggal: '',
                    qtyDibeli: '',
                    qtyTerpakai: '',
                    catatan: ''
                });
                loadValidasiStok();
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Gagal menyimpan Validasi Stok');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // Load Stock balance for printable checklist
    const generatePrintChecklist = async () => {
        if (!periodeId || !printDate) {
            setError('Pilih periode dan tanggal pencetakan terlebih dahulu.');
            return;
        }
        setPrintLoading(true);
        setError('');
        try {
            const r = await request(`/laporan/stock-barang?periodeId=${periodeId}&tanggal=${printDate}`);
            if (r.ok) {
                const resJson = await r.json();
                setPrintStockData(resJson.data || []);
                setIsPrinting(true);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat data stock untuk checklist.' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi.');
        } finally {
            setPrintLoading(false);
        }
    };

    // Find active period details for print header
    const activePeriod = periods.find(p => p.id === periodeId);
    const namaLembaga = activePeriod?.setupLembaga?.namaLembaga || 'SPPG SUMEDANG';
    const idLembaga = activePeriod?.setupLembaga?.id || 'ZEZ3TM0G';

    if (isPrinting) {
        return (
            <div style={{ padding: '20px', backgroundColor: '#fff', minHeight: '100vh', color: '#000', fontFamily: 'Courier New, monospace' }}>
                <style>{`
                    @media print {
                        .no-print { display: none !important; }
                        body { background-color: #fff; color: #000; }
                    }
                `}</style>
                <div className="no-print" style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#eaeaea', display: 'flex', gap: '10px' }}>
                    <button onClick={() => window.print()} style={{ padding: '8px 16px', fontWeight: 'bold', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                        Cetak Sekarang (Print)
                    </button>
                    <button onClick={() => setIsPrinting(false)} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', cursor: 'pointer' }}>
                        Kembali ke Form
                    </button>
                </div>

                {/* Print Sheet Header */}
                <div style={{ borderBottom: '2px double #000', paddingBottom: '10px', marginBottom: '20px' }}>
                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>BADAN GIZI NASIONAL</div>
                    <div style={{ textAlign: 'center', fontSize: '12px' }}>Jalan Harsono RM Nomor 3 Ragunan, Pasar Minggu Jakarta 12550</div>
                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' }}>LEMBAR PENGECEKAN FISIK STOK GUDANG</div>
                    <div style={{ textAlign: 'center', fontSize: '14px' }}>Tanggal Pemeriksaan: {printDate}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px', fontSize: '14px' }}>
                    <div>Nama SPPG: <strong>{namaLembaga}</strong></div>
                    <div>ID SPPG: <strong>{idLembaga}</strong></div>
                    <div>Periode: <strong>{activePeriod?.tanggalMulai} s.d. {activePeriod?.tanggalSelesai}</strong></div>
                </div>

                {/* Print Sheet Table */}
                <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th style={{ width: '40px' }}>No</th>
                            <th>Nama Bahan Pokok</th>
                            <th style={{ width: '80px' }}>Satuan</th>
                            <th style={{ width: '110px', textAlign: 'right' }}>Stok Sistem (Qty)</th>
                            <th style={{ width: '140px' }}>Stok Fisik Gudang</th>
                            <th style={{ width: '110px' }}>Selisih</th>
                            <th>Kondisi &amp; Catatan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {printStockData.map((row, idx) => (
                            <tr key={row.bahanPokokId}>
                                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                <td>{row.nama}</td>
                                <td style={{ textAlign: 'center' }}>{row.satuan}</td>
                                <td style={{ textAlign: 'right' }}>{row.saldoAkhirQty.toLocaleString('id-ID')}</td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Signatures */}
                <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <div style={{ textAlign: 'center', width: '250px' }}>
                        <div>Mengetahui,</div>
                        <div style={{ marginTop: '60px', borderTop: '1px solid #000', fontWeight: 'bold' }}>
                            Kepala SPPG
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', width: '250px' }}>
                        <div>Pemeriksa Gudang,</div>
                        <div style={{ marginTop: '60px', borderTop: '1px solid #000', fontWeight: 'bold' }}>
                            Akuntan / Petugas
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Validasi &amp; Rekonsiliasi Stok Fisik</h2>
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

            {/* Print Section (Checklist Generation) */}
            <div style={{
                border: '1px solid var(--border)',
                padding: '24px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                width: '65%'
            }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Cetak Lembar Checklist Fisik Gudang</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '0', marginBottom: '20px' }}>
                    Gunakan fitur ini untuk mencetak daftar inventaris sistem ke kertas guna mempermudah pencatatan stok fisik di gudang.
                </p>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
                            Periode
                        </label>
                        <select
                            value={periodeId}
                            onChange={e => setPeriodeId(e.target.value)}
                            style={{
                                width: '220px',
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
                            Tanggal Target Pengecekan
                        </label>
                        <DatePicker
                            value={printDate}
                            onChange={setPrintDate}
                            style={{ width: '200px' }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={generatePrintChecklist}
                        disabled={printLoading}
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
                        {printLoading ? 'Memuat...' : 'Generate Lembar Pengecekan'}
                    </button>
                </div>
            </div>

            {/* Form Validasi */}
            <form onSubmit={handleCreateValidasi} style={{
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
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Input Rekonsiliasi Hasil Pengecekan Fisik</h3>

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
                            value={validasiForm.bahanPokokId}
                            onChange={e => setValidasiForm(prev => ({ ...prev, bahanPokokId: e.target.value }))}
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
                            <option value="">-- Pilih Bahan Pokok --</option>
                            {bahanPokokList.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.nama} ({b.satuan})
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
                            Tanggal Validasi
                        </label>
                        <DatePicker
                            value={validasiForm.tanggal}
                            onChange={val => setValidasiForm(prev => ({ ...prev, tanggal: val }))}
                            required
                        />
                    </div>
                </div>

                {/* Tampilan Preview Akumulasi Catatan Sistem */}
                {validasiPreview && (
                    <div style={{
                        border: '1px dashed var(--border)',
                        padding: '16px',
                        margin: '8px 0',
                        backgroundColor: 'var(--bg)',
                        fontSize: '14px',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text)'
                    }}>
                        <h4 style={{ marginTop: '0', marginBottom: '12px', fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                            Akumulasi Catatan Sistem s.d. Tanggal Terpilih:
                        </h4>
                        <p style={{ margin: '6px 0' }}>Total Pembelian (Sistem): <strong>{validasiPreview.qtyDibeli}</strong></p>
                        <p style={{ margin: '6px 0' }}>Total Penggunaan (Sistem): <strong>{validasiPreview.qtyTerpakai}</strong></p>
                        <p style={{ margin: '6px 0' }}>Sisa Stok (Sistem): <strong>{validasiPreview.sisaSistem}</strong></p>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '10px' }}>
                            * Kolom input fisik di bawah terisi otomatis dari data sistem untuk mempermudah pencatatan.
                        </span>
                    </div>
                )}

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
                            Jumlah Pembelian Fisik
                        </label>
                        <input
                            type="number"
                            step="0.001"
                            placeholder="Qty Pembelian Fisik"
                            value={validasiForm.qtyDibeli}
                            onChange={e => setValidasiForm(prev => ({ ...prev, qtyDibeli: e.target.value }))}
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
                            Jumlah Pemakaian Fisik
                        </label>
                        <input
                            type="number"
                            step="0.001"
                            placeholder="Qty Pemakaian Fisik"
                            value={validasiForm.qtyTerpakai}
                            onChange={e => setValidasiForm(prev => ({ ...prev, qtyTerpakai: e.target.value }))}
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
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Catatan Penyesuaian (opsional)
                    </label>
                    <input
                        type="text"
                        placeholder="Catatan / Selisih / Stok Hilang"
                        value={validasiForm.catatan}
                        onChange={e => setValidasiForm(prev => ({ ...prev, catatan: e.target.value }))}
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
                        Simpan Validasi Stok
                    </button>
                </div>
            </form>

            {/* Riwayat Validasi */}
            <Table
                columns={[
                    { key: 'tanggal', header: 'Tanggal Validasi', render: (v) => renderDate(v) },
                    {
                        key: 'bahanPokok',
                        header: 'Bahan Pokok',
                        render: (v) => v ? `${v.nama} (${v.satuan})` : '—'
                    },
                    {
                        key: 'qtyDibeli',
                        header: 'Pembelian (Fisik)',
                        align: 'right',
                        render: (v) => renderCurrency(v, false)
                    },
                    {
                        key: 'qtyTerpakai',
                        header: 'Pemakaian (Fisik)',
                        align: 'right',
                        render: (v) => renderCurrency(v, false)
                    },
                    {
                        key: 'selisih',
                        header: 'Selisih Rekonsiliasi',
                        align: 'right',
                        render: (v) => (
                            <strong style={{ fontVariantNumeric: 'tabular-nums', color: Number(v) < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                {Number(v).toLocaleString('id-ID')}
                            </strong>
                        )
                    },
                    { key: 'catatan', header: 'Catatan', render: (v) => renderTruncate(v) },
                    { key: 'validatedBy', header: 'Divalidasi Oleh', render: (v) => v ? v.nama : '—' },
                    {
                        key: 'createdAt',
                        header: 'Waktu Input',
                        render: (v) => new Date(v).toLocaleString('id-ID')
                    }
                ]}
                data={validasiList}
                emptyText="Belum ada data riwayat validasi stok fisik."
            />
        </div>
    );
};
