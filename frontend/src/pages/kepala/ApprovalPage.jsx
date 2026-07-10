import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Table, renderDate, renderStatus, renderTruncate } from '../../components/Table';

export const ApprovalPage = () => {
    const { request } = useApi();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [error, setError] = useState('');

    // State Approval
    const [approvalList, setApprovalList] = useState([]);

    // State Pending Targets (DIAJUKAN)
    const [pendingMenuList, setPendingMenuList] = useState([]);
    const [pendingRabList, setPendingRabList] = useState([]);

    // Fetch list periode saat mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => {});
    }, []);

    // Trigger loadApprovals + loadPendingTargets setiap periodeId berubah
    useEffect(() => {
        if (periodeId) {
            loadApprovals(periodeId);
            loadPendingTargets(periodeId);
        }
    }, [periodeId]);

    const loadApprovals = async (pid) => {
        if (!pid) return;
        try {
            setError('');
            const r = await request(`/kepala/approval?periodeId=${pid}`);
            if (r.ok) {
                const resJson = await r.json();
                setApprovalList(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat riwayat approval' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const loadPendingTargets = async (pid) => {
        if (!pid) return;
        try {
            setError('');
            const [menuRes, rabRes] = await Promise.all([
                request(`/gizi/menu-harian?periodeId=${pid}`),
                request(`/akuntan/rab-harian?periodeId=${pid}`)
            ]);

            const menuData = menuRes.ok ? await menuRes.json() : [];
            const rabData = rabRes.ok ? await rabRes.json() : [];

            // Filter hanya yang statusnya DIAJUKAN (siap untuk di-approve/reject)
            setPendingMenuList(menuData.filter(m => m.status === 'DIAJUKAN'));
            setPendingRabList(rabData.filter(r => r.status === 'DIAJUKAN'));

            if (!menuRes.ok) setError('Gagal memuat data menu harian.');
            if (!rabRes.ok) setError('Gagal memuat data RAB harian.');
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const handleApproval = async (targetType, targetId, status, catatan) => {
        setError('');

        // Validasi status nilai
        if (status !== 'DISETUJUI' && status !== 'DITOLAK') {
            setError('Status approval harus DISETUJUI atau DITOLAK.');
            return;
        }

        // Validasi catatan wajib jika DITOLAK — mirror validasi backend
        if (status === 'DITOLAK' && (!catatan || catatan.trim() === '')) {
            setError('Catatan wajib diisi jika status ditolak.');
            return;
        }

        // Build body: tepat satu dari menuHarianId/rabHarianId terisi.
        // Sertakan catatan hanya jika ada isinya (jika null/kosong, backend akan menolak karena validasi typeof === 'string')
        const body = { status };
        if (catatan) {
            body.catatan = catatan;
        }

        if (targetType === 'MENU') {
            body.menuHarianId = targetId;
        } else if (targetType === 'RAB') {
            body.rabHarianId = targetId;
        } else {
            setError('Developer error: targetType tidak valid.');
            return;
        }

        try {
            const r = await request('/kepala/approval', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (r.ok) {
                // Refresh kedua: riwayat approval + tabel pending (hapus row yang baru diproses)
                loadApprovals(periodeId);
                loadPendingTargets(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Gagal memproses approval');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Dashboard Kepala SPPG</h2>
            {/* ponytail: unify shade pastel to bg-elevated */}
            {error && <div style={{ color: 'var(--color-danger)', position: 'sticky', top: 0, background: 'var(--bg-elevated)', padding: '8px', zIndex: 10, border: '1px solid var(--border)' }}>{error}</div>}

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
                    Periode
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
                            {p.tanggalMulai.split('T')[0]} - {p.tanggalSelesai.split('T')[0]}
                        </option>
                    ))}
                </select>
            </div>

            <hr style={{ margin: '20px 0' }} />

            {/* ================================================ */}
            {/* SECTION: MENU HARIAN MENUNGGU APPROVAL           */}
            {/* ================================================ */}
            <h3>Menu Harian — Menunggu Persetujuan</h3>
            <Table
                columns={[
                    { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                    { key: 'status', header: 'Status', render: (v) => renderStatus(v) },
                    {
                        key: 'id',
                        header: 'Aksi',
                        render: (_, row) => (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => handleApproval('MENU', row.id, 'DISETUJUI', null)}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-success)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Setujui
                                </button>
                                <button
                                    onClick={() => {
                                        const catatan = prompt('Catatan penolakan (wajib):');
                                        if (catatan && catatan.trim() !== '') {
                                            handleApproval('MENU', row.id, 'DITOLAK', catatan.trim());
                                        }
                                    }}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-danger)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Tolak
                                </button>
                            </div>
                        )
                    }
                ]}
                data={pendingMenuList}
                emptyText="Tidak ada menu harian yang menunggu persetujuan."
            />

            <hr style={{ margin: '20px 0' }} />

            {/* ================================================ */}
            {/* SECTION: RAB HARIAN MENUNGGU APPROVAL            */}
            {/* ================================================ */}
            <h3>RAB Harian — Menunggu Persetujuan</h3>
            <Table
                columns={[
                    { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                    { key: 'status', header: 'Status', render: (v) => renderStatus(v) },
                    { key: 'createdBy', header: 'Dibuat Oleh', render: (v) => v?.nama || v?.username || '—' },
                    {
                        key: 'id',
                        header: 'Aksi',
                        render: (_, row) => (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => handleApproval('RAB', row.id, 'DISETUJUI', null)}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-success)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Setujui
                                </button>
                                <button
                                    onClick={() => {
                                        const catatan = prompt('Catatan penolakan (wajib):');
                                        if (catatan && catatan.trim() !== '') {
                                            handleApproval('RAB', row.id, 'DITOLAK', catatan.trim());
                                        }
                                    }}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-danger)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Tolak
                                </button>
                            </div>
                        )
                    }
                ]}
                data={pendingRabList}
                emptyText="Tidak ada RAB harian yang menunggu persetujuan."
            />

            <hr style={{ margin: '20px 0' }} />

            {/* ================================================ */}
            {/* SECTION: RIWAYAT APPROVAL                        */}
            {/* ================================================ */}
            <h3>Riwayat Approval</h3>
            <Table
                columns={[
                    {
                        key: 'id',
                        header: 'Jenis',
                        render: (_, row) => row.menuHarian ? 'Menu Harian' : 'RAB Harian'
                    },
                    {
                        key: 'id',
                        header: 'Tanggal Dokumen',
                        render: (_, row) => renderDate(row.menuHarian ? row.menuHarian.tanggal : row.rabHarian?.tanggal)
                    },
                    { key: 'status', header: 'Status', render: (v) => renderStatus(v) },
                    { key: 'catatan', header: 'Catatan', render: (v) => renderTruncate(v) },
                    { key: 'approvedBy', header: 'Diproses Oleh', render: (v) => v?.nama || v?.username || '—' },
                    {
                        key: 'createdAt',
                        header: 'Waktu Approval',
                        render: (v) => new Date(v).toLocaleString('id-ID')
                    }
                ]}
                data={approvalList}
                emptyText="Belum ada riwayat approval untuk periode ini."
            />
        </div>
    );
};
