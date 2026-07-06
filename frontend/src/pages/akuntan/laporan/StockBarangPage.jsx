import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';

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
                    style={{ padding: '4px 12px' }}
                >
                    Refresh
                </button>
            </div>

            {/* Loading Indicator */}
            {loading && <p>Memuat data laporan...</p>}

            {/* Render Table */}
            {!loading && (
                <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th>Nama Bahan</th>
                            <th>Satuan</th>
                            <th style={{ textAlign: 'right' }}>Saldo Awal</th>
                            <th style={{ textAlign: 'right' }}>Total Masuk</th>
                            <th style={{ textAlign: 'right' }}>Total Keluar</th>
                            <th style={{ textAlign: 'right' }}>Saldo Akhir</th>
                            <th style={{ textAlign: 'right' }}>Harga Beli Terakhir</th>
                            <th style={{ textAlign: 'right' }}>Nilai Stock</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((row) => (
                            <tr key={row.bahanPokokId}>
                                <td>{row.nama}</td>
                                <td>{row.satuan}</td>
                                <td style={{ textAlign: 'right' }}>{row.saldoAwalQty.toLocaleString('id-ID')}</td>
                                <td style={{ textAlign: 'right', color: 'green' }}>{row.totalMasukQty.toLocaleString('id-ID')}</td>
                                <td style={{ textAlign: 'right', color: 'red' }}>{row.totalKeluarQty.toLocaleString('id-ID')}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{row.saldoAkhirQty.toLocaleString('id-ID')}</td>
                                <td style={{ textAlign: 'right' }}>Rp{row.hargaBeliTerakhir.toLocaleString('id-ID')}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Rp{row.nilaiStock.toLocaleString('id-ID')}</td>
                            </tr>
                        ))}
                        {reportData.length === 0 && (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '10px' }}>
                                    Tidak ada data stock barang untuk periode dan tanggal terpilih.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};
