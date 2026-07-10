import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { Table } from '../../../components/Table';

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
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Laporan Kas Bulanan</h2>
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
                minWidth: '320px',
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
                    Tampilkan Laporan
                </button>
            </div>

            {/* Loading Indicator */}
            {loading && <p>Memuat data laporan...</p>}

            {/* Render Table */}
            {!loading && reportData !== null && (
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
                    data={reportData}
                    emptyText="Tidak ada data kas bulanan untuk periode terpilih."
                />
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
