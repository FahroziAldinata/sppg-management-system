import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table, renderDate, renderStatus } from '../../components/Table';
import { DatePicker } from '../../components/DatePicker';
import Dropdown from '../../components/Dropdown';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Skeleton } from '../../components/Skeleton';

export const RabHarianPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [tanggalInput, setTanggalInput] = useState('');
    const [rabList, setRabList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingRabId, setPendingRabId] = useState(null);
    const [kebutuhanHitungan, setKebutuhanHitungan] = useState([]);

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

    const loadRabHarian = async (pid) => {
        if (!pid) return;
        setLoading(true);
        try {
            const r = await request(`/akuntan/rab-harian?periodeId=${pid}`);
            if (r.ok) {
                setRabList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar RAB Harian' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
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

    // Fetch unit conversion reference when input date changes
    useEffect(() => {
        if (!tanggalInput || !periodeId) {
            setKebutuhanHitungan([]);
            return;
        }
        request(`/akuntan/kebutuhan-hitungan?periodeId=${periodeId}&tanggal=${tanggalInput}`)
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    setKebutuhanHitungan(d.data || []);
                } else {
                    setKebutuhanHitungan([]);
                }
            })
            .catch(() => setKebutuhanHitungan([]));
    }, [tanggalInput, periodeId]);

    const activePeriod = periods.find(p => p.id === periodeId);

    const triggerAjukan = (id) => {
        setPendingRabId(id);
        setConfirmOpen(true);
    };

    const handleAjukan = async () => {
        if (!pendingRabId) return;
        setConfirmOpen(false);
        try {
            const r = await request(`/akuntan/rab-harian/${pendingRabId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'DIAJUKAN' })
            });
            if (r.ok) {
                toast.success('RAB Harian berhasil diajukan ke Kepala SPPG.');
                loadRabHarian(periodeId);
            } else {
                const err = await r.json().catch(() => ({ error: 'Gagal mengajukan RAB Harian' }));
                toast.error(err.error || 'Gagal mengajukan RAB Harian');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setPendingRabId(null);
        }
    };

    const createRabHarian = async (e) => {
        e.preventDefault();
        if (!periodeId) {
            toast.error('Periode wajib dipilih.');
            return;
        }
        if (!tanggalInput) {
            toast.error('Tanggal wajib diisi.');
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
                toast.success('RAB Harian baru berhasil dibuat.');
                setTanggalInput('');
                loadRabHarian(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                toast.error(d.error || 'Gagal membuat RAB Harian');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Manajemen Anggaran Belanja (RAB Harian)</h2>

            {/* Pilihan Periode */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                width: '26%',
                minWidth: '320px'
            }}>
                <label style={{
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginBottom: '6px'
                }}>
                    Periode aktif (transaksi harus dalam rentang tanggal periode ini)
                </label>
                <Dropdown
                    style={{ width: '100%' }}
                    value={periodeId}
                    onChange={val => setPeriodeId(val)}
                    options={periods.map(p => ({ value: p.id, label: `${p.tanggalMulai} - ${p.tanggalSelesai}` }))}
                />
            </div>

            {/* Form Buat RAB Harian */}
            <div style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
                fontSize: '13px',
                color: 'var(--text)',
                lineHeight: '1.6'
            }}>
                ℹ️ <strong>Halaman ini hanya menetapkan tanggal RAB.</strong>{' '}
                Item belanja / nota pesanan (PO) diinput oleh <strong>Mitra</strong> di halaman{' '}
                <em>Nota Pesanan (PO Bahan Makanan)</em>. Setelah Mitra menyimpan PO untuk tanggal tertentu,
                data transaksi pembelian akan otomatis terhubung ke RAB Harian pada tanggal yang sama.
            </div>
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
                    <DatePicker
                        value={tanggalInput}
                        onChange={setTanggalInput}
                        defaultFocusMonth={activePeriod?.tanggalMulai}
                        required
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

            {/* Referensi Konversi Satuan */}
            {tanggalInput && (
                <div style={{
                    border: '1px solid var(--color-primary-light)',
                    backgroundColor: 'rgba(181, 224, 234, 0.15)',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '20px',
                    maxWidth: '640px'
                }}>
                    <h4 style={{ margin: '0 0 10px 0', color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>
                        📌 Referensi Konversi Satuan (Hitungan &rarr; KG)
                    </h4>
                    {kebutuhanHitungan.length === 0 ? (
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Tidak ada bahan dengan konversi satuan buat tanggal ini.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {kebutuhanHitungan.map((item) => (
                                <div key={item.bahanPokokId} style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    border: '1px solid var(--border)',
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '13px',
                                    color: 'var(--text)'
                                }}>
                                    <strong>{item.nama}</strong>: {item.permintaanAG.toLocaleString('id-ID')} {item.satuanHitungan} &rarr; <strong>{item.final}</strong> KG <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>(konversi {item.konversiPerKg}/kg)</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tabel Daftar RAB Harian */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar RAB Harian</h3>
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                </div>
            )}
            {!loading && <Table
                columns={[
                    { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                    { key: 'status', header: 'Status Approval', render: (v) => renderStatus(v) },
                    { key: 'createdBy', header: 'Dibuat Oleh', render: (v) => v?.nama || v?.username || '—' },
                    {
                        key: 'transaksiPembelian',
                        header: 'Jumlah Pembelian',
                        align: 'right',
                        render: (v) => `${(v || []).length} transaksi`
                    },
                    {
                        key: 'aksi',
                        header: 'Aksi',
                        render: (_, row) => (row.status === 'DRAFT' || row.status === 'DITOLAK') ? (
                            <button
                                onClick={() => triggerAjukan(row.id)}
                                style={{
                                    padding: '5px 12px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '12px'
                                }}
                            >
                                Ajukan
                            </button>
                        ) : '—'
                    }
                ]}
                data={rabList}
                emptyText="Belum ada data RAB Harian untuk periode ini."
            />}
            <ConfirmDialog
                open={confirmOpen}
                title="Konfirmasi Pengajuan"
                message="Ajukan RAB Harian ini ke Kepala SPPG untuk persetujuan?"
                onConfirm={handleAjukan}
                onCancel={() => {
                    setConfirmOpen(false);
                    setPendingRabId(null);
                }}
            />
        </div>
    );
};
