import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';

export const LaporanPerBulanPage = () => {
    const { request } = useApi();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [reportData, setReportData] = useState(null);
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

    // Load Laporan Per Bulan
    const loadLaporanPerBulan = async () => {
        if (!periodeId) {
            setError('Pilih periode terlebih dahulu');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const r = await request(`/laporan/per-bulan?periodeId=${periodeId}`);
            if (r.ok) {
                const resJson = await r.json();
                setReportData(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Per Bulan' }));
                setError(d.error);
                setReportData(null);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
            setReportData(null);
        } finally {
            setLoading(false);
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

    return (
        <div>
            <h2>Laporan Kas Bulanan</h2>
            {error && <div style={{ color: 'red', marginBottom: '10px', padding: '8px', border: '1px solid red' }}>{error}</div>}

            {/* Filter Section */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
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
                <button
                    type="button"
                    onClick={loadLaporanPerBulan}
                    style={{ padding: '4px 12px' }}
                >
                    Tampilkan Laporan
                </button>
            </div>

            {/* Loading Indicator */}
            {loading && <p>Memuat data laporan...</p>}

            {/* Render Table */}
            {!loading && reportData !== null && (
                <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th>Bulan</th>
                            <th style={{ textAlign: 'right' }}>Total Masuk</th>
                            <th style={{ textAlign: 'right' }}>Total Keluar</th>
                            <th style={{ textAlign: 'right' }}>Saldo Bersih</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((row) => {
                            const saldoBersih = row.totalMasuk - row.totalKeluar;
                            return (
                                <tr key={row.key}>
                                    <td>{formatIndoMonth(row.year, row.month)}</td>
                                    <td style={{ textAlign: 'right', color: 'green' }}>
                                        Rp{row.totalMasuk.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                    </td>
                                    <td style={{ textAlign: 'right', color: 'red' }}>
                                        Rp{row.totalKeluar.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                        Rp{saldoBersih.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                    </td>
                                </tr>
                            );
                        })}
                        {reportData.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '10px' }}>
                                    Tidak ada data kas bulanan untuk periode terpilih.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}

            {/* Initial State Prompt */}
            {!loading && reportData === null && (
                <p style={{ fontStyle: 'italic', color: '#666' }}>
                    Silakan klik tombol "Tampilkan Laporan" untuk memuat data.
                </p>
            )}
        </div>
    );
};
