import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { Table } from '../../../components/Table';

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
            <h2>Laporan Kebutuhan Belanja Bahan</h2>
            {error && <div style={{ color: 'red', marginBottom: '10px', padding: '8px', border: '1px solid red' }}>{error}</div>}

            {/* Filter Section */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                    <label style={{ marginRight: '5px' }}>Periode: </label>
                    <select value={periodeId} onChange={e => handlePeriodChange(e.target.value)}>
                        {periods.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.tanggalMulai} - {p.tanggalSelesai}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{ marginRight: '5px' }}>Tanggal Mulai: </label>
                    <input
                        type="date"
                        value={tanggalMulai}
                        onChange={e => setTanggalMulai(e.target.value)}
                    />
                </div>
                <div>
                    <label style={{ marginRight: '5px' }}>Tanggal Selesai: </label>
                    <input
                        type="date"
                        value={tanggalSelesai}
                        onChange={e => setTanggalSelesai(e.target.value)}
                    />
                </div>
                <button
                    type="button"
                    onClick={loadKebutuhanBelanja}
                    style={{ padding: '4px 12px' }}
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
