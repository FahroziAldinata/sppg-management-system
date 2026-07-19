import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../context/ToastContext';
import { Table } from '../../../components/Table';
import { Skeleton } from '../../../components/Skeleton';
import { DatePicker } from '../../../components/DatePicker';

export const LaporanPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const location = useLocation();
    const navigate = useNavigate();

    // Shared period state
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');

    // Shared account state (for BP)
    const [akunList, setAkunList] = useState([]);
    const [akunId, setAkunId] = useState('');

    // Loading & PDF state
    const [loading, setLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

    // 1 & 2. BKU & BP data state
    const [reportData, setReportData] = useState([]);

    // 3. Stock Barang specific state
    const [stockTanggal, setStockTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [stockData, setStockData] = useState([]);

    // 4. Kebutuhan Belanja Bahan specific state
    const [belanjaTanggalMulai, setBelanjaTanggalMulai] = useState('');
    const [belanjaTanggalSelesai, setBelanjaTanggalSelesai] = useState('');
    const [belanjaData, setBelanjaData] = useState(null);

    // 5. Laporan Per Periode specific state
    const [perPeriodeData, setPerPeriodeData] = useState(null);

    // 6. Laporan Per Bulan specific state
    const [perBulanData, setPerBulanData] = useState(null);

    // Map URL path to jenisLaporan
    const getReportFromPath = (path) => {
        if (path.includes('stock-barang')) return 'STOCK_BARANG';
        if (path.includes('kebutuhan-belanja-bahan')) return 'BELANJA_BAHAN';
        if (path.includes('per-periode')) return 'PER_PERIODE';
        if (path.includes('per-bulan')) return 'PER_BULAN';
        const params = new URLSearchParams(window.location.search);
        if (params.get('type') === 'bp') return 'BP';
        return 'BKU';
    };

    const jenisLaporan = getReportFromPath(location.pathname);

    const handleReportChange = (e) => {
        const val = e.target.value;
        setReportData([]);
        setStockData([]);
        setBelanjaData(null);
        setPerPeriodeData(null);
        setPerBulanData(null);

        if (val === 'BKU') navigate('/akuntan/laporan');
        else if (val === 'BP') navigate('/akuntan/laporan?type=bp');
        else if (val === 'STOCK_BARANG') navigate('/akuntan/laporan/stock-barang');
        else if (val === 'BELANJA_BAHAN') navigate('/akuntan/laporan/kebutuhan-belanja-bahan');
        else if (val === 'PER_PERIODE') navigate('/akuntan/laporan/per-periode');
        else if (val === 'PER_BULAN') navigate('/akuntan/laporan/per-bulan');
    };

    // Fetch periods & accounts on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode.'));

        request('/akuntan/akun')
            .then(r => r.json())
            .then(d => {
                setAkunList(d);
                if (d.length) setAkunId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar akun.'));
    }, []);

    // Load BKU
    const loadBKU = async (pid) => {
        if (!pid) return;
        setLoading(true);
        try {
            const r = await request(`/laporan/bku?periodeId=${pid}`);
            if (r.ok) {
                const resJson = await r.json();
                setReportData(resJson.data?.transaksi || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Buku Kas Umum' }));
                toast.error(d.error);
                setReportData([]);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    // Load BP
    const loadBP = async (pid, aid) => {
        if (!pid || !aid) return;
        setLoading(true);
        try {
            const r = await request(`/laporan/bp?periodeId=${pid}&akunId=${aid}`);
            if (r.ok) {
                const resJson = await r.json();
                setReportData(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Buku Pembantu' }));
                toast.error(d.error);
                setReportData([]);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    // Load Stock Barang
    const loadStockBarang = async (pid, tgl) => {
        if (!pid || !tgl) return;
        setLoading(true);
        try {
            const r = await request(`/laporan/stock-barang?periodeId=${pid}&tanggal=${tgl}`);
            if (r.ok) {
                const resJson = await r.json();
                setStockData(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Stock Barang' }));
                toast.error(d.error);
                setStockData([]);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setStockData([]);
        } finally {
            setLoading(false);
        }
    };

    // Load Kebutuhan Belanja Bahan
    const loadKebutuhanBelanja = async () => {
        if (!periodeId) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        if (!belanjaTanggalMulai || !belanjaTanggalSelesai) {
            toast.error('Isi tanggal mulai dan tanggal selesai terlebih dahulu');
            return;
        }
        setLoading(true);
        try {
            const r = await request(`/laporan/kebutuhan-belanja-bahan?periodeId=${periodeId}&tanggalMulai=${belanjaTanggalMulai}&tanggalSelesai=${belanjaTanggalSelesai}`);
            if (r.ok) {
                const resJson = await r.json();
                setBelanjaData(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Kebutuhan Belanja Bahan' }));
                toast.error(d.error);
                setBelanjaData([]);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setBelanjaData([]);
        } finally {
            setLoading(false);
        }
    };

    // Load Laporan Per Periode
    const loadLaporanPerPeriode = async () => {
        if (!periodeId) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        setLoading(true);
        try {
            const r = await request(`/laporan/per-periode?periodeId=${periodeId}`);
            if (r.ok) {
                const resJson = await r.json();
                setPerPeriodeData(resJson.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Per Periode' }));
                toast.error(d.error);
                setPerPeriodeData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setPerPeriodeData(null);
        } finally {
            setLoading(false);
        }
    };

    // Load Laporan Per Bulan
    const loadLaporanPerBulan = async () => {
        if (!periodeId) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        setLoading(true);
        try {
            const r = await request(`/laporan/per-bulan?periodeId=${periodeId}`);
            if (r.ok) {
                const resJson = await r.json();
                setPerBulanData(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Per Bulan' }));
                toast.error(d.error);
                setPerBulanData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setPerBulanData(null);
        } finally {
            setLoading(false);
        }
    };

    // Preview BKU sebagai PDF (inline di modal)
    const previewBkuPdf = async () => {
        if (!periodeId) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        setPdfLoading(true);
        try {
            const r = await request(`/laporan/bku/pdf?periodeId=${periodeId}`);
            if (!r.ok) {
                const errData = await r.json().catch(() => ({ error: 'Gagal membuat PDF BKU' }));
                toast.error(errData.error || 'Gagal membuat PDF BKU');
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            const objectUrl = URL.createObjectURL(blob);
            setPdfUrl(objectUrl);
            setIsPdfModalOpen(true);
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat membuat PDF');
        } finally {
            setPdfLoading(false);
        }
    };

    // Helper untuk period change bound auto-fill (Kebutuhan Belanja)
    const handlePeriodChangeForBelanja = (pid) => {
        setPeriodeId(pid);
        const p = periods.find(item => item.id === pid);
        if (p) {
            setBelanjaTanggalMulai(p.tanggalMulai);
            setBelanjaTanggalSelesai(p.tanggalSelesai);
        }
    };

    // Helper untuk konversi format Bulan ke Bahasa Indonesia (misal: "2026-01" -> "Januari 2026")
    const formatIndoMonth = (year, month) => {
        const namaBulan = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        if (month >= 1 && month <= 12) {
            return `${namaBulan[month - 1]} ${year}`;
        }
        return `${year}-${String(month).padStart(2, '0')}`;
    };

    // Auto-fetch effects depending on type and filters
    useEffect(() => {
        if (jenisLaporan === 'BKU' && periodeId) {
            loadBKU(periodeId);
        }
    }, [jenisLaporan, periodeId]);

    useEffect(() => {
        if (jenisLaporan === 'BP' && periodeId && akunId) {
            loadBP(periodeId, akunId);
        }
    }, [jenisLaporan, periodeId, akunId]);

    useEffect(() => {
        if (jenisLaporan === 'STOCK_BARANG' && periodeId && stockTanggal) {
            loadStockBarang(periodeId, stockTanggal);
        }
    }, [jenisLaporan, periodeId, stockTanggal]);

    useEffect(() => {
        if (jenisLaporan === 'PER_PERIODE' && periodeId) {
            loadLaporanPerPeriode();
        }
    }, [jenisLaporan, periodeId]);

    useEffect(() => {
        if (jenisLaporan === 'PER_BULAN' && periodeId) {
            loadLaporanPerBulan();
        }
    }, [jenisLaporan, periodeId]);

    useEffect(() => {
        if (periodeId && periods.length) {
            const p = periods.find(item => item.id === periodeId);
            if (p) {
                setBelanjaTanggalMulai(p.tanggalMulai);
                setBelanjaTanggalSelesai(p.tanggalSelesai);
            }
        }
    }, [periodeId, periods]);

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Laporan Keuangan &amp; Operasional</h2>

            {/* Filter Section */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                alignItems: 'flex-end'
            }}>
                {/* Pilihan Jenis Laporan */}
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
                        Jenis Laporan
                    </label>
                    <select
                        value={jenisLaporan}
                        onChange={handleReportChange}
                        className="form-field"
                    >
                        <option value="BKU">Buku Kas Umum (BKU)</option>
                        <option value="BP">Buku Pembantu per Akun (BP)</option>
                        <option value="STOCK_BARANG">Stock Barang (Persediaan)</option>
                        <option value="BELANJA_BAHAN">Kebutuhan Belanja Bahan</option>
                        <option value="PER_PERIODE">Laporan Per Periode (Pagu vs Realisasi)</option>
                        <option value="PER_BULAN">Laporan Kas Bulanan</option>
                    </select>
                </div>

                {/* Pilihan Periode */}
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
                        Periode
                    </label>
                    <select
                        value={periodeId}
                        onChange={e => {
                            if (jenisLaporan === 'BELANJA_BAHAN') {
                                handlePeriodChangeForBelanja(e.target.value);
                            } else {
                                setPeriodeId(e.target.value);
                            }
                        }}
                        className="form-field"
                    >
                        {periods.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.tanggalMulai} - {p.tanggalSelesai}
                            </option>
                        ))}
                    </select>
                </div>

                {/* BP-specific Akun Dropdown */}
                {jenisLaporan === 'BP' && (
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
                            Akun Buku Pembantu
                        </label>
                        <select
                            value={akunId}
                            onChange={e => setAkunId(e.target.value)}
                            className="form-field"
                        >
                            <option value="">-- Pilih Akun --</option>
                            {akunList.map(a => (
                                <option key={a.id} value={a.id}>
                                    [{a.kode}] {a.nama} ({a.tipe})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Stock-specific Date Picker */}
                {jenisLaporan === 'STOCK_BARANG' && (
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
                            Tanggal Stock
                        </label>
                        <DatePicker
                            value={stockTanggal}
                            onChange={setStockTanggal}
                            required
                        />
                    </div>
                )}

                {/* Belanja Bahan-specific Date Pickers */}
                {jenisLaporan === 'BELANJA_BAHAN' && (
                    <>
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
                                Tanggal Mulai
                            </label>
                            <DatePicker
                                value={belanjaTanggalMulai}
                                onChange={setBelanjaTanggalMulai}
                                defaultFocusMonth={belanjaTanggalMulai}
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
                                Tanggal Selesai
                            </label>
                            <DatePicker
                                value={belanjaTanggalSelesai}
                                onChange={setBelanjaTanggalSelesai}
                                defaultFocusMonth={belanjaTanggalSelesai}
                                required
                            />
                        </div>
                    </>
                )}

                {/* Buttons depending on report type */}
                <div style={{ flex: '0 0 auto', display: 'flex', gap: '8px' }}>
                    {jenisLaporan === 'BKU' && (
                        <button
                            type="button"
                            onClick={previewBkuPdf}
                            disabled={pdfLoading}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: pdfLoading ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                opacity: pdfLoading ? 0.65 : 1
                            }}
                        >
                            {pdfLoading ? 'Membuat PDF…' : '📄 Preview PDF'}
                        </button>
                    )}
                    {jenisLaporan === 'STOCK_BARANG' && (
                        <button
                            type="button"
                            onClick={() => loadStockBarang(periodeId, stockTanggal)}
                            className="btn-secondary"
                            style={{
                                padding: '10px 20px',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px'
                            }}
                        >
                            Refresh
                        </button>
                    )}
                    {jenisLaporan === 'BELANJA_BAHAN' && (
                        <button
                            type="button"
                            onClick={loadKebutuhanBelanja}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: 'var(--btn-primary-bg)',
                                color: 'var(--btn-primary-text)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px'
                            }}
                        >
                            Tampilkan Laporan
                        </button>
                    )}
                </div>
            </div>

            {/* Loading Skeleton */}
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                </div>
            )}

            {/* Render 1 & 2. BKU & BP Tables */}
            {!loading && (jenisLaporan === 'BKU' || jenisLaporan === 'BP') && (
                <Table
                    columns={[
                        { key: 'tanggal', header: 'Tanggal' },
                        { key: 'noBukti', header: 'No Bukti' },
                        { key: 'uraian', header: 'Uraian' },
                        {
                            key: 'debet',
                            header: 'Debet',
                            align: 'right',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}
                                </span>
                            )
                        },
                        {
                            key: 'kredit',
                            header: 'Kredit',
                            align: 'right',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}
                                </span>
                            )
                        },
                        {
                            key: 'saldoBerjalan',
                            header: 'Saldo Berjalan',
                            align: 'right',
                            render: (v) => (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </strong>
                            )
                        }
                    ]}
                    data={reportData}
                    emptyText="Tidak ada data untuk laporan terpilih pada periode ini."
                />
            )}

            {/* Render 3. Stock Barang Table */}
            {!loading && jenisLaporan === 'STOCK_BARANG' && (
                <Table
                    columns={[
                        { key: 'nama', header: 'Nama Bahan' },
                        { key: 'satuan', header: 'Satuan' },
                        {
                            key: 'saldoAwalQty',
                            header: 'Saldo Awal',
                            align: 'right',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {Number(v).toLocaleString('id-ID')}
                                </span>
                            )
                        },
                        {
                            key: 'totalMasukQty',
                            header: 'Total Masuk',
                            align: 'right',
                            render: (v) => (
                                <span style={{ color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                    {Number(v).toLocaleString('id-ID')}
                                </span>
                            )
                        },
                        {
                            key: 'totalKeluarQty',
                            header: 'Total Keluar',
                            align: 'right',
                            render: (v) => (
                                <span style={{ color: 'var(--color-danger)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                    {Number(v).toLocaleString('id-ID')}
                                </span>
                            )
                        },
                        {
                            key: 'saldoAkhirQty',
                            header: 'Saldo Akhir',
                            align: 'right',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                    {Number(v).toLocaleString('id-ID')}
                                </span>
                            )
                        },
                        {
                            key: 'hargaBeliTerakhir',
                            header: 'Harga Beli Terakhir',
                            align: 'right',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </span>
                            )
                        },
                        {
                            key: 'nilaiStock',
                            header: 'Nilai Stock',
                            align: 'right',
                            render: (v) => (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </strong>
                            )
                        }
                    ]}
                    data={stockData}
                    emptyText="Tidak ada data stock barang untuk periode dan tanggal terpilih."
                />
            )}

            {/* Render 4. Kebutuhan Belanja Bahan Table */}
            {!loading && jenisLaporan === 'BELANJA_BAHAN' && belanjaData !== null && (
                <Table
                    columns={[
                        { key: 'nama', header: 'Nama Bahan Pokok' },
                        { key: 'satuan', header: 'Satuan' },
                        {
                            key: 'totalBeratKotorGr',
                            header: 'Berat Kotor (kg)',
                            align: 'right',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {(Number(v) / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            )
                        },
                        {
                            key: 'totalBeratBersihGr',
                            header: 'Berat Bersih (kg)',
                            align: 'right',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {(Number(v) / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            )
                        },
                        {
                            key: 'totalEstimasiBiaya',
                            header: 'Estimasi Biaya',
                            align: 'right',
                            render: (v) => (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </strong>
                            )
                        }
                    ]}
                    data={belanjaData}
                    emptyText="Tidak ada data kebutuhan belanja bahan untuk periode dan tanggal terpilih."
                />
            )}
            {!loading && jenisLaporan === 'BELANJA_BAHAN' && belanjaData === null && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Silakan tentukan rentang tanggal dan klik "Tampilkan Laporan".
                </p>
            )}

            {/* Render 5. Laporan Per Periode Table */}
            {!loading && jenisLaporan === 'PER_PERIODE' && perPeriodeData !== null && (
                <div>
                    <Table
                        columns={[
                            { key: 'kategori', header: 'Kategori Pos Anggaran' },
                            {
                                key: 'rab',
                                header: 'Anggaran (RAB)',
                                align: 'right',
                                render: (v) => (
                                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                    </span>
                                )
                            },
                            {
                                key: 'aktual',
                                header: 'Realisasi (Aktual)',
                                align: 'right',
                                render: (v, row) => (
                                    <span style={{ color: row.isEstimasi ? 'var(--color-primary)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                                        Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}{row.isEstimasi ? ' (estimasi)' : ''}
                                    </span>
                                )
                            },
                            {
                                key: 'selisih',
                                header: 'Selisih (Sisa)',
                                align: 'right',
                                render: (v) => (
                                    <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                        Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                    </strong>
                                )
                            }
                        ]}
                        data={[
                            {
                                kategori: 'Bahan Makanan (Pendidikan)',
                                rab: perPeriodeData.bahanMakanan.pendidikan.rab,
                                aktual: perPeriodeData.bahanMakanan.pendidikan.aktual,
                                selisih: perPeriodeData.bahanMakanan.pendidikan.selisih,
                                isEstimasi: true
                            },
                            {
                                kategori: 'Bahan Makanan (Posyandu)',
                                rab: perPeriodeData.bahanMakanan.posyandu.rab,
                                aktual: perPeriodeData.bahanMakanan.posyandu.aktual,
                                selisih: perPeriodeData.bahanMakanan.posyandu.selisih,
                                isEstimasi: true
                            },
                            {
                                kategori: 'Biaya Operasional',
                                rab: perPeriodeData.operasional.rab,
                                aktual: perPeriodeData.operasional.aktual,
                                selisih: perPeriodeData.operasional.selisih,
                                isEstimasi: false
                            },
                            {
                                kategori: 'Biaya Insentif Fasilitas',
                                rab: perPeriodeData.insentifFasilitas.rab,
                                aktual: perPeriodeData.insentifFasilitas.aktual,
                                selisih: perPeriodeData.insentifFasilitas.selisih,
                                isEstimasi: false
                            }
                        ]}
                    />
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '12px' }}>
                        * Catatan: Realisasi Bahan Makanan untuk Pendidikan &amp; Posyandu dihitung menggunakan metode alokasi proporsional berdasarkan rasio RAB (PROPORSIONAL_RAB).
                    </p>
                </div>
            )}
            {!loading && jenisLaporan === 'PER_PERIODE' && perPeriodeData === null && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Silakan klik tombol "Tampilkan Laporan" untuk memuat data.
                </p>
            )}

            {/* Render 6. Laporan Per Bulan Table */}
            {!loading && jenisLaporan === 'PER_BULAN' && perBulanData !== null && (
                <Table
                    columns={[
                        {
                            key: 'month',
                            header: 'Bulan',
                            render: (_, row) => formatIndoMonth(row.year, row.month)
                        },
                        {
                            key: 'totalMasuk',
                            header: 'Total Masuk',
                            align: 'right',
                            render: (v) => (
                                <span style={{ color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                    Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </span>
                            )
                        },
                        {
                            key: 'totalKeluar',
                            header: 'Total Keluar',
                            align: 'right',
                            render: (v) => (
                                <span style={{ color: 'var(--color-danger)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                    Rp{v.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </span>
                            )
                        },
                        {
                            key: 'key',
                            header: 'Saldo Bersih',
                            align: 'right',
                            render: (_, row) => {
                                const saldoBersih = row.totalMasuk - row.totalKeluar;
                                return (
                                    <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                        Rp{saldoBersih.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                    </strong>
                                );
                            }
                        }
                    ]}
                    data={perBulanData}
                    emptyText="Tidak ada data kas bulanan untuk periode terpilih."
                />
            )}
            {!loading && jenisLaporan === 'PER_BULAN' && perBulanData === null && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    Silakan klik tombol "Tampilkan Laporan" untuk memuat data.
                </p>
            )}

            {/* PDF Preview Modal */}
            {isPdfModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '24px',
                        width: '85%',
                        maxWidth: '1000px',
                        height: '85vh',
                        boxShadow: 'var(--shadow-hover)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                                Preview PDF Laporan (BKU)
                            </h3>
                            <button 
                                onClick={() => {
                                    setIsPdfModalOpen(false);
                                    if (pdfUrl) {
                                        URL.revokeObjectURL(pdfUrl);
                                        setPdfUrl('');
                                    }
                                }} 
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    padding: '0 8px'
                                }}
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                            <iframe src={pdfUrl} width="100%" height="100%" style={{ border: 'none' }} title="PDF Preview" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={() => {
                                    setIsPdfModalOpen(false);
                                    if (pdfUrl) {
                                        URL.revokeObjectURL(pdfUrl);
                                        setPdfUrl('');
                                    }
                                }} 
                                className="btn-secondary"
                                style={{
                                    padding: '10px 20px',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    backgroundColor: 'transparent',
                                    color: 'var(--text)'
                                }}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
