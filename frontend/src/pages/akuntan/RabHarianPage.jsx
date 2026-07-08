import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Table, renderDate, renderStatus } from '../../components/Table';

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
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ color: 'var(--text)' }}>Manajemen Anggaran Belanja (RAB Harian)</h2>
            {error && (
                <div style={{
                    color: 'var(--color-danger)',
                    marginBottom: '20px',
                    padding: '8px',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)'
                }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{
                    color: 'var(--color-success)',
                    marginBottom: '20px',
                    padding: '8px',
                    border: '1px solid var(--color-success)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)'
                }}>
                    {success}
                </div>
            )}

            {/* Pilihan Periode */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginBottom: '6px'
                }}>
                    Pilih Periode Aktif
                </label>
                <select
                    value={periodeId}
                    onChange={e => setPeriodeId(e.target.value)}
                    style={{
                        width: '300px',
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

            {/* Form Buat RAB Harian */}
            <form onSubmit={createRabHarian} style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                display: 'flex',
                gap: '15px',
                alignItems: 'flex-end',
                maxWidth: '640px',
                flexWrap: 'wrap'
            }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Tanggal RAB
                    </label>
                    <input
                        type="date"
                        value={tanggalInput}
                        onChange={e => setTanggalInput(e.target.value)}
                        required
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
                    />
                </div>
                <button type="submit" style={{
                    padding: '10px 20px',
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    height: '42px'
                }}>
                    Buat RAB Harian
                </button>
            </form>

            {/* Tabel Daftar RAB Harian */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar RAB Harian</h3>
            {loading && <p style={{ color: 'var(--text-muted)' }}>Memuat daftar RAB...</p>}
            <Table
                columns={[
                    { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                    { key: 'status', header: 'Status Approval', render: (v) => renderStatus(v) },
                    { key: 'createdBy', header: 'Dibuat Oleh', render: (v) => v?.nama || v?.username || '—' },
                    {
                        key: 'transaksiPembelian',
                        header: 'Jumlah Pembelian',
                        align: 'right',
                        render: (v) => `${(v || []).length} transaksi`
                    }
                ]}
                data={rabList}
                emptyText="Belum ada data RAB Harian untuk periode ini."
            />
        </div>
    );
};
