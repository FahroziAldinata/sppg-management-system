import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table, renderDate, renderStatus, renderTruncate } from '../../components/Table';
import Dropdown from '../../components/Dropdown';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export const ApprovalPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');

    // State Approval
    const [approvalList, setApprovalList] = useState([]);

    // State Pending Targets (DIAJUKAN)
    const [pendingMenuList, setPendingMenuList] = useState([]);
    const [pendingRabList, setPendingRabList] = useState([]);

    // State for ConfirmDialog
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({
        targetType: '',
        targetId: '',
        status: '',
        title: '',
        message: '',
        requireInput: false,
        inputPlaceholder: ''
    });

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
            const r = await request(`/kepala/approval?periodeId=${pid}`);
            if (r.ok) {
                const resJson = await r.json();
                setApprovalList(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat riwayat approval' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const loadPendingTargets = async (pid) => {
        if (!pid) return;
        try {
            const [menuRes, rabRes] = await Promise.all([
                request(`/gizi/menu-harian?periodeId=${pid}`),
                request(`/akuntan/rab-harian?periodeId=${pid}`)
            ]);

            const menuData = menuRes.ok ? await menuRes.json() : [];
            const rabData = rabRes.ok ? await rabRes.json() : [];

            // Filter hanya yang statusnya DIAJUKAN (siap untuk di-approve/reject)
            setPendingMenuList(menuData.filter(m => m.status === 'DIAJUKAN'));
            setPendingRabList(rabData.filter(r => r.status === 'DIAJUKAN'));

            if (!menuRes.ok) toast.error('Gagal memuat data menu harian.');
            if (!rabRes.ok) toast.error('Gagal memuat data RAB harian.');
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const triggerSetujui = (targetType, targetId) => {
        setConfirmConfig({
            targetType,
            targetId,
            status: 'DISETUJUI',
            title: 'Konfirmasi Persetujuan',
            message: `Apakah Anda yakin ingin menyetujui ${targetType === 'MENU' ? 'Menu Harian' : 'RAB Harian'} ini?`,
            requireInput: false,
            inputPlaceholder: ''
        });
        setConfirmOpen(true);
    };

    const triggerTolak = (targetType, targetId) => {
        setConfirmConfig({
            targetType,
            targetId,
            status: 'DITOLAK',
            title: 'Konfirmasi Penolakan',
            message: `Berikan catatan penolakan untuk ${targetType === 'MENU' ? 'Menu Harian' : 'RAB Harian'} ini (catatan wajib diisi):`,
            requireInput: true,
            inputPlaceholder: 'Catatan penolakan (wajib)...'
        });
        setConfirmOpen(true);
    };

    const handleApproval = async (catatan) => {
        const { targetType, targetId, status } = confirmConfig;
        setConfirmOpen(false);

        // Validasi status nilai
        if (status !== 'DISETUJUI' && status !== 'DITOLAK') {
            toast.error('Status approval harus DISETUJUI atau DITOLAK.');
            return;
        }

        // Validasi catatan wajib jika DITOLAK - mirror validasi backend
        if (status === 'DITOLAK' && (!catatan || catatan.trim() === '')) {
            toast.error('Catatan wajib diisi jika status ditolak.');
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
            toast.error('Developer error: targetType tidak valid.');
            return;
        }

        try {
            const r = await request('/kepala/approval', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (r.ok) {
                toast.success(status === 'DISETUJUI' ? 'Berhasil disetujui.' : 'Berhasil ditolak.');
                // Refresh kedua: riwayat approval + tabel pending (hapus row yang baru diproses)
                loadApprovals(periodeId);
                loadPendingTargets(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                toast.error(d.error || 'Gagal memproses approval');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Dashboard Kepala SPPG</h2>
            {/* Pilihan Periode */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                width: '26%',                minWidth: '320px'
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
                <Dropdown
                    style={{ width: '100%' }}
                    value={periodeId}
                    onChange={setPeriodeId}
                    options={periods.map(p => ({
                        value: p.id,
                        label: `${p.tanggalMulai.split('T')[0]} - ${p.tanggalSelesai.split('T')[0]}`
                    }))}
                />
            </div>

            <hr style={{ margin: '20px 0' }} />

            {/* ================================================ */}
            {/* SECTION: MENU HARIAN MENUNGGU APPROVAL           */}
            {/* ================================================ */}
            <h3>Menu Harian - Menunggu Persetujuan</h3>
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
                                    onClick={() => triggerSetujui('MENU', row.id)}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-success)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Setujui
                                </button>
                                <button
                                    onClick={() => triggerTolak('MENU', row.id)}
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
            <h3>RAB Harian - Menunggu Persetujuan</h3>
            <Table
                columns={[
                    { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                    { key: 'status', header: 'Status', render: (v) => renderStatus(v) },
                    { key: 'createdBy', header: 'Dibuat Oleh', render: (v) => v?.nama || v?.username || '-' },
                    {
                        key: 'id',
                        header: 'Aksi',
                        render: (_, row) => (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => triggerSetujui('RAB', row.id)}
                                    style={{ padding: '4px 8px', backgroundColor: 'var(--color-success)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                                >
                                    Setujui
                                </button>
                                <button
                                    onClick={() => triggerTolak('RAB', row.id)}
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
                    { key: 'approvedBy', header: 'Diproses Oleh', render: (v) => v?.nama || v?.username || '-' },
                    {
                        key: 'createdAt',
                        header: 'Waktu Approval',
                        render: (v) => new Date(v).toLocaleString('id-ID')
                    }
                ]}
                data={approvalList}
                emptyText="Belum ada riwayat approval untuk periode ini."
            />
            <ConfirmDialog
                open={confirmOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                requireInput={confirmConfig.requireInput}
                inputPlaceholder={confirmConfig.inputPlaceholder}
                inputRequired={confirmConfig.requireInput}
                errorMessage="Catatan wajib diisi untuk melanjutkan penolakan."
                onConfirm={handleApproval}
                onCancel={() => {
                    setConfirmOpen(false);
                }}
            />
        </div>
    );
};
