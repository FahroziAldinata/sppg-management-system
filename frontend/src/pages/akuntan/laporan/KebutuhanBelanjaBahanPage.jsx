import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { Table } from '../../../components/Table';
import { DatePicker } from '../../../components/DatePicker';

export const KebutuhanBelanjaBahanPage = () => {
    const { request } = useApi();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [tanggalMulai, setTanggalMulai] = useState('');
    const [tanggalSelesai, setTanggalSelesai] = useState('');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch periods on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) {
                    setPeriodeId(d[0].id);
                    // Autofill dates based on first period's bounds
                    setTanggalMulai(d[0].tanggalMulai);
                    setTanggalSelesai(d[0].tanggalSelesai);
                }
            })
            .catch(() => setError('Gagal memuat daftar periode'));
    }, []);

    // Handle change of period to autofill bounds
    const handlePeriodChange = (pid) => {
        setPeriodeId(pid);
        const p = periods.find(item => item.id === pid);
        if (p) {
            setTanggalMulai(p.tanggalMulai);
            setTanggalSelesai(p.tanggalSelesai);
        }
    };

    const loadKebutuhanBelanja = async () => {
        if (!periodeId) {
            setError('Pilih periode terlebih dahulu');
            return;
        }
        if (!tanggalMulai || !tanggalSelesai) {
            setError('Isi tanggal mulai dan tanggal selesai terlebih dahulu');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const r = await request(`/laporan/kebutuhan-belanja-bahan?periodeId=${periodeId}&tanggalMulai=${tanggalMulai}&tanggalSelesai=${tanggalSelesai}`);
            if (r.ok) {
                const resJson = await r.json();
                setReportData(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Kebutuhan Belanja Bahan' }));
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

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Laporan Kebutuhan Belanja Bahan</h2>
            {error && <div style={{ color: 'red', marginBottom: '10px', padding: '8px', border: '1px solid red' }}>{error}</div>}

            {/* Filter Section */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                width: '100%',
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
                        onChange={e => handlePeriodChange(e.target.value)}
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
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: '1' }}>
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
                            value={tanggalMulai}
                            onChange={setTanggalMulai}
                            required
                        />
                    </div>
                    <div style={{ flex: '1' }}>
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
                            value={tanggalSelesai}
                            onChange={setTanggalSelesai}
                            required
                        />
                    </div>
                </div>
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
                    data={reportData}
                    emptyText="Tidak ada data kebutuhan belanja bahan untuk periode dan tanggal terpilih."
                />
            )}

            {/* Initial State Prompt */}
            {!loading && reportData === null && (
                <p style={{ fontStyle: 'italic', color: '#666' }}>
                    Silakan tentukan rentang tanggal dan klik "Tampilkan Laporan".
                </p>
            )}
        </div>
    );
};
