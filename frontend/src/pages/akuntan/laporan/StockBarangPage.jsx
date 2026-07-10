import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { Table } from '../../../components/Table';

export const StockBarangPage = () => {
    const { request } = useApi();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch periods on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => setError('Gagal memuat daftar periode'));
    }, []);

    // Load Stock Barang Laporan
    const loadStockBarang = async (pid, tgl) => {
        if (!pid || !tgl) return;
        setLoading(true);
        setError('');
        try {
            const r = await request(`/laporan/stock-barang?periodeId=${pid}&tanggal=${tgl}`);
            if (r.ok) {
                const resJson = await r.json();
                setReportData(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Stock Barang' }));
                setError(d.error);
                setReportData([]);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
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
            <h2>Laporan Stock Barang (Persediaan)</h2>
            {error && <div style={{ color: 'red', marginBottom: '10px', padding: '8px', border: '1px solid red' }}>{error}</div>}

            {/* Filter Section */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                    <label style={{ marginRight: '5px' }}>Tanggal Stock: </label>
                    <input
                        type="date"
                        value={tanggal}
                        onChange={e => setTanggal(e.target.value)}
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
                        fontSize: '14px'
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
