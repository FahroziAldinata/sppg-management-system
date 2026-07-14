import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../context/ToastContext';
import { Table } from '../../../components/Table';
import { DatePicker } from '../../../components/DatePicker';

export const StockBarangPage = () => {
    const { request } = useApi();
  const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch periods on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode'));
    }, []);

    // Load Stock Barang Laporan
    const loadStockBarang = async (pid, tgl) => {
        if (!pid || !tgl) return;
        setLoading(true);
        try {
            const r = await request(`/laporan/stock-barang?periodeId=${pid}&tanggal=${tgl}`);
            if (r.ok) {
                const resJson = await r.json();
                setReportData(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Stock Barang' }));
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

    // Auto-fetch on change of periodeId or tanggal (pattern similar to BKU/BP)
    useEffect(() => {
        if (periodeId && tanggal) {
            loadStockBarang(periodeId, tanggal);
        }
    }, [periodeId, tanggal]);

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Laporan Stock Barang (Persediaan)</h2>
            {error && <div style={{ color: 'red', marginBottom: '10px', padding: '8px', border: '1px solid red' }}>{error}</div>}

            {/* Filter Section */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                width: '40%',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
            }}>
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
                        className="form-field"
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
                        Tanggal Stock
                    </label>
                    <DatePicker
                        value={tanggal}
                        onChange={setTanggal}
                        required
                    />
                </div>
                <button
                    type="button"
                    onClick={() => loadStockBarang(periodeId, tanggal)}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: 'var(--btn-primary-bg)',
                        color: 'var(--btn-primary-text)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        alignSelf: 'flex-start'
                    }}
                >
                    Refresh
                </button>
            </div>

            {/* Loading Indicator */}
            {loading && <p>Memuat data laporan...</p>}

            {/* Render Table */}
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
                data={reportData}
                emptyText="Tidak ada data stock barang untuk periode dan tanggal terpilih."
            />
        </div>
    );
};
