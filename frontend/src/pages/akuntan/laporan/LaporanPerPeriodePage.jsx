import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { Table } from '../../../components/Table';

export const LaporanPerPeriodePage = () => {
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

    // Load Laporan Per Periode
    const loadLaporanPerPeriode = async () => {
        if (!periodeId) {
            setError('Pilih periode terlebih dahulu');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const r = await request(`/laporan/per-periode?periodeId=${periodeId}`);
            if (r.ok) {
                const resJson = await r.json();
                setReportData(resJson.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Per Periode' }));
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

    return (
        <div>
            <h2>Laporan Per Periode (Pendidikan & Posyandu)</h2>
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
                    onClick={loadLaporanPerPeriode}
                    style={{ padding: '4px 12px' }}
                >
                    Tampilkan Laporan
                </button>
            </div>

            {/* Loading Indicator */}
            {loading && <p>Memuat data laporan...</p>}

            {/* Render Table */}
            {!loading && reportData !== null && (
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
                                rab: reportData.bahanMakanan.pendidikan.rab,
                                aktual: reportData.bahanMakanan.pendidikan.aktual,
                                selisih: reportData.bahanMakanan.pendidikan.selisih,
                                isEstimasi: true
                            },
                            {
                                kategori: 'Bahan Makanan (Posyandu)',
                                rab: reportData.bahanMakanan.posyandu.rab,
                                aktual: reportData.bahanMakanan.posyandu.aktual,
                                selisih: reportData.bahanMakanan.posyandu.selisih,
                                isEstimasi: true
                            },
                            {
                                kategori: 'Biaya Operasional',
                                rab: reportData.operasional.rab,
                                aktual: reportData.operasional.aktual,
                                selisih: reportData.operasional.selisih,
                                isEstimasi: false
                            },
                            {
                                kategori: 'Biaya Insentif Fasilitas',
                                rab: reportData.insentifFasilitas.rab,
                                aktual: reportData.insentifFasilitas.aktual,
                                selisih: reportData.insentifFasilitas.selisih,
                                isEstimasi: false
                            }
                        ]}
                    />
                    <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                        * Catatan: Realisasi Bahan Makanan untuk Pendidikan &amp; Posyandu dihitung menggunakan metode alokasi proporsional berdasarkan rasio RAB (PROPORSIONAL_RAB).
                    </p>
                </div>
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
