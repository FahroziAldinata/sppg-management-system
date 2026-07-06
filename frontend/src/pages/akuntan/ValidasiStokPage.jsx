import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

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
            .catch(() => {});

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
            <h2>Validasi &amp; Rekonsiliasi Stok Fisik</h2>
            {error && <div style={{ color: 'red', marginBottom: '10px', padding: '8px', border: '1px solid red' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '10px', padding: '8px', border: '1px solid green' }}>{success}</div>}

            {/* Print Section (Checklist Generation) */}
            <div style={{ border: '1px solid #007bff', padding: '15px', backgroundColor: '#f4f9ff', marginBottom: '25px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#0056b3' }}>Cetak Lembar Checklist Fisik Gudang</h4>
                <p style={{ fontSize: '13px', color: '#555', marginTop: '0' }}>
                    Gunakan fitur ini untuk mencetak daftar inventaris sistem ke kertas guna mempermudah pencatatan stok fisik di gudang.
                </p>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ marginRight: '5px' }}>Periode: </label>
                        <select value={periodeId} onChange={e => setPeriodeId(e.target.value)}>
                            {periods.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.tanggalMulai} - {p.tanggalSelesai}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ marginRight: '5px' }}>Tanggal Target Pengecekan: </label>
                        <input
                            type="date"
                            value={printDate}
                            onChange={e => setPrintDate(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={generatePrintChecklist}
                        disabled={printLoading}
                        style={{ padding: '5px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        {printLoading ? 'Memuat...' : 'Generate Lembar Pengecekan'}
                    </button>
                </div>
            </div>

            {/* Form Validasi */}
            <h3>Input Rekonsiliasi Hasil Pengecekan Fisik</h3>
            <form onSubmit={handleCreateValidasi} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Bahan Pokok: </label>
                    <select
                        value={validasiForm.bahanPokokId}
                        onChange={e => setValidasiForm(prev => ({ ...prev, bahanPokokId: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '5px' }}
                    >
                        <option value="">-- Pilih Bahan Pokok --</option>
                        {bahanPokokList.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.nama} ({b.satuan})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Tanggal Validasi: </label>
                    <input
                        type="date"
                        value={validasiForm.tanggal}
                        onChange={e => setValidasiForm(prev => ({ ...prev, tanggal: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>

                {/* Tampilan Preview Akumulasi Catatan Sistem */}
                {validasiPreview && (
                    <div style={{ border: '1px dashed #777', padding: '10px', margin: '10px 0', backgroundColor: '#f0f4f8', fontSize: '14px' }}>
                        <h4 style={{ marginTop: '0', marginBottom: '8px' }}>Akumulasi Catatan Sistem s.d. Tanggal Terpilih:</h4>
                        <p style={{ margin: '4px 0' }}>Total Pembelian (Sistem): <strong>{validasiPreview.qtyDibeli}</strong></p>
                        <p style={{ margin: '4px 0' }}>Total Penggunaan (Sistem): <strong>{validasiPreview.qtyTerpakai}</strong></p>
                        <p style={{ margin: '4px 0' }}>Sisa Stok (Sistem): <strong>{validasiPreview.sisaSistem}</strong></p>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                            * Kolom input fisik di bawah terisi otomatis dari data sistem untuk mempermudah pencatatan.
                        </span>
                    </div>
                )}

                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Jumlah Pembelian Fisik: </label>
                    <input
                        type="number"
                        step="0.001"
                        placeholder="Qty Pembelian Fisik"
                        value={validasiForm.qtyDibeli}
                        onChange={e => setValidasiForm(prev => ({ ...prev, qtyDibeli: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Jumlah Pemakaian Fisik: </label>
                    <input
                        type="number"
                        step="0.001"
                        placeholder="Qty Pemakaian Fisik"
                        value={validasiForm.qtyTerpakai}
                        onChange={e => setValidasiForm(prev => ({ ...prev, qtyTerpakai: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Catatan Penyesuaian (opsional): </label>
                    <input
                        type="text"
                        placeholder="Catatan / Selisih / Stok Hilang"
                        value={validasiForm.catatan}
                        onChange={e => setValidasiForm(prev => ({ ...prev, catatan: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>

                <div style={{ marginTop: '10px' }}>
                    <button type="submit" style={{ padding: '6px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        Simpan Validasi Stok
                    </button>
                </div>
            </form>

            {/* Riwayat Validasi */}
            <h3>Riwayat Validasi &amp; Rekonsiliasi Stok Fisik</h3>
            <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#eaeaea' }}>
                        <th>Tanggal Validasi</th>
                        <th>Bahan Pokok</th>
                        <th style={{ textAlign: 'right' }}>Pembelian (Fisik)</th>
                        <th style={{ textAlign: 'right' }}>Pemakaian (Fisik)</th>
                        <th style={{ textAlign: 'right' }}>Selisih Rekonsiliasi</th>
                        <th>Catatan</th>
                        <th>Divalidasi Oleh</th>
                        <th>Waktu Input</th>
                    </tr>
                </thead>
                <tbody>
                    {validasiList.map(v => (
                        <tr key={v.id}>
                            <td>{v.tanggal.split('T')[0]}</td>
                            <td>{v.bahanPokok ? v.bahanPokok.nama : '—'} ({v.bahanPokok ? v.bahanPokok.satuan : ''})</td>
                            <td style={{ textAlign: 'right' }}>{Number(v.qtyDibeli).toLocaleString('id-ID')}</td>
                            <td style={{ textAlign: 'right' }}>{Number(v.qtyTerpakai).toLocaleString('id-ID')}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: v.selisih < 0 ? 'red' : 'green' }}>
                                {Number(v.selisih).toLocaleString('id-ID')}
                            </td>
                            <td>{v.catatan || '—'}</td>
                            <td>{v.validatedBy ? v.validatedBy.nama : '—'}</td>
                            <td>{new Date(v.createdAt).toLocaleString('id-ID')}</td>
                        </tr>
                    ))}
                    {validasiList.length === 0 && (
                        <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '10px' }}>
                                Belum ada data riwayat validasi stok fisik.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
