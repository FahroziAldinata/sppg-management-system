import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';

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
                    <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '15px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#eaeaea' }}>
                                <th>Kategori Pos Anggaran</th>
                                <th style={{ textAlign: 'right' }}>Anggaran (RAB)</th>
                                <th style={{ textAlign: 'right' }}>Realisasi (Aktual) *estimasi</th>
                                <th style={{ textAlign: 'right' }}>Selisih (Sisa)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Row 1: Bahan Makanan (Pendidikan) */}
                            <tr>
                                <td>Bahan Makanan (Pendidikan)</td>
                                <td style={{ textAlign: 'right' }}>
                                    Rp{reportData.bahanMakanan.pendidikan.rab.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </td>
                                <td style={{ textAlign: 'right', color: 'blue' }}>
                                    Rp{reportData.bahanMakanan.pendidikan.aktual.toLocaleString('id-ID', { maximumFractionDigits: 0 })} (estimasi)
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                    Rp{reportData.bahanMakanan.pendidikan.selisih.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </td>
                            </tr>
                            {/* Row 2: Bahan Makanan (Posyandu) */}
                            <tr>
                                <td>Bahan Makanan (Posyandu)</td>
                                <td style={{ textAlign: 'right' }}>
                                    Rp{reportData.bahanMakanan.posyandu.rab.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </td>
                                <td style={{ textAlign: 'right', color: 'blue' }}>
                                    Rp{reportData.bahanMakanan.posyandu.aktual.toLocaleString('id-ID', { maximumFractionDigits: 0 })} (estimasi)
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                    Rp{reportData.bahanMakanan.posyandu.selisih.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </td>
                            </tr>
                            {/* Row 3: Operasional */}
                            <tr>
                                <td>Biaya Operasional</td>
                                <td style={{ textAlign: 'right' }}>
                                    Rp{reportData.operasional.rab.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    Rp{reportData.operasional.aktual.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                    Rp{reportData.operasional.selisih.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </td>
                            </tr>
                            {/* Row 4: Insentif Fasilitas */}
                            <tr>
                                <td>Biaya Insentif Fasilitas</td>
                                <td style={{ textAlign: 'right' }}>
                                    Rp{reportData.insentifFasilitas.rab.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    Rp{reportData.insentifFasilitas.aktual.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                    Rp{reportData.insentifFasilitas.selisih.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
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
