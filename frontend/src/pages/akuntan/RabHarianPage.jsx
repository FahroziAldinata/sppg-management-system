import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

export const RabHarianPage = () => {
    const { request } = useApi();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [tanggalInput, setTanggalInput] = useState('');
    const [rabList, setRabList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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

    const loadRabHarian = async (pid) => {
        if (!pid) return;
        setLoading(true);
        setError('');
        try {
            const r = await request(`/akuntan/rab-harian?periodeId=${pid}`);
            if (r.ok) {
                setRabList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar RAB Harian' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setLoading(false);
        }
    };

    // Reload list when period changes
    useEffect(() => {
        if (periodeId) {
            loadRabHarian(periodeId);
        }
    }, [periodeId]);

    const createRabHarian = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (!periodeId) {
            setError('Periode wajib dipilih.');
            return;
        }
        if (!tanggalInput) {
            setError('Tanggal wajib diisi.');
            return;
        }

        try {
            const r = await request('/akuntan/rab-harian', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    periodeId,
                    tanggal: tanggalInput
                })
            });

            if (r.ok) {
                setSuccess('RAB Harian baru berhasil dibuat.');
                setTanggalInput('');
                loadRabHarian(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Gagal membuat RAB Harian');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    return (
        <div>
            <h2>Manajemen Anggaran Belanja (RAB Harian)</h2>
            {error && <div style={{ color: 'red', marginBottom: '10px', padding: '8px', border: '1px solid red' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '10px', padding: '8px', border: '1px solid green' }}>{success}</div>}

            {/* Pilihan Periode */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginRight: '5px' }}>Pilih Periode Aktif: </label>
                <select value={periodeId} onChange={e => setPeriodeId(e.target.value)}>
                    {periods.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.tanggalMulai} - {p.tanggalSelesai}
                        </option>
                    ))}
                </select>
            </div>

            {/* Form Buat RAB Harian */}
            <h3>Buat RAB Harian</h3>
            <form onSubmit={createRabHarian} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '25px' }}>
                <input
                    type="date"
                    value={tanggalInput}
                    onChange={e => setTanggalInput(e.target.value)}
                    required
                    style={{ padding: '6px' }}
                />
                <button type="submit" style={{ padding: '6px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Buat RAB Harian
                </button>
            </form>

            {/* Tabel Daftar RAB Harian */}
            <h3>Daftar RAB Harian</h3>
            {loading && <p>Memuat daftar RAB...</p>}
            {!loading && (
                <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th>Tanggal</th>
                            <th>Status Approval</th>
                            <th>Dibuat Oleh</th>
                            <th style={{ textAlign: 'right' }}>Jumlah Pembelian</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rabList.map(r => (
                            <tr key={r.id}>
                                <td>{r.tanggal.split('T')[0]}</td>
                                <td style={{ fontWeight: 'bold', color: r.status === 'DISETUJUI' ? 'green' : r.status === 'DITOLAK' ? 'red' : 'gray' }}>
                                    {r.status}
                                </td>
                                <td>{r.createdBy?.nama || r.createdBy?.username || '—'}</td>
                                <td style={{ textAlign: 'right' }}>{(r.transaksiPembelian || []).length} transaksi</td>
                            </tr>
                        ))}
                        {rabList.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '10px' }}>
                                    Belum ada data RAB Harian untuk periode ini.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};
