import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../context/ToastContext';
import { Table } from '../../../components/Table';

export const LaporanPerPeriodePage = () => {
    const { request } = useApi();
  const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [reportData, setReportData] = useState(null);
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
                setReportData(resJson.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Per Periode' }));
                toast.error(d.error);
                setReportData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Laporan Per Periode (Pendidikan &amp; Posyandu)</h2>
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
                        className="form-field"
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
                    onClick={loadLaporanPerPeriode}
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
