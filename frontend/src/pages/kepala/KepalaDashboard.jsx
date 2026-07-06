import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

export const KepalaDashboard = () => {
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
            <h2>Dashboard Kepala SPPG</h2>
            {error && <div style={{ color: 'red', position: 'sticky', top: 0, background: '#fff', padding: '8px', zIndex: 10, border: '1px solid red' }}>{error}</div>}

            {/* Pilihan Periode */}
            <div style={{ marginBottom: '10px' }}>
                <label>Periode: </label>
                <select value={periodeId} onChange={e => setPeriodeId(e.target.value)}>
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
            <table border="1" cellPadding="5" style={{ marginBottom: '20px' }}>
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {pendingMenuList.map(m => (
                        <tr key={m.id}>
                            <td>{m.tanggal.split('T')[0]}</td>
                            <td>{m.status}</td>
                            <td>
                                <button
                                    onClick={() => handleApproval('MENU', m.id, 'DISETUJUI', null)}
                                >
                                    Setujui
                                </button>
                                {' '}
                                <button
                                    onClick={() => {
                                        const catatan = prompt('Catatan penolakan (wajib):');
                                        if (catatan && catatan.trim() !== '') {
                                            handleApproval('MENU', m.id, 'DITOLAK', catatan.trim());
                                        }
                                    }}
                                >
                                    Tolak
                                </button>
                            </td>
                        </tr>
                    ))}
                    {pendingMenuList.length === 0 && (
                        <tr>
                            <td colSpan={3} style={{ textAlign: 'center' }}>
                                Tidak ada menu harian yang menunggu persetujuan.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <hr style={{ margin: '20px 0' }} />

            {/* ================================================ */}
            {/* SECTION: RAB HARIAN MENUNGGU APPROVAL            */}
            {/* ================================================ */}
            <h3>RAB Harian — Menunggu Persetujuan</h3>
            <table border="1" cellPadding="5" style={{ marginBottom: '20px' }}>
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Status</th>
                        <th>Dibuat Oleh</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {pendingRabList.map(r => (
                        <tr key={r.id}>
                            <td>{r.tanggal.split('T')[0]}</td>
                            <td>{r.status}</td>
                            <td>{r.createdBy?.nama || r.createdBy?.username || '—'}</td>
                            <td>
                                <button
                                    onClick={() => handleApproval('RAB', r.id, 'DISETUJUI', null)}
                                >
                                    Setujui
                                </button>
                                {' '}
                                <button
                                    onClick={() => {
                                        const catatan = prompt('Catatan penolakan (wajib):');
                                        if (catatan && catatan.trim() !== '') {
                                            handleApproval('RAB', r.id, 'DITOLAK', catatan.trim());
                                        }
                                    }}
                                >
                                    Tolak
                                </button>
                            </td>
                        </tr>
                    ))}
                    {pendingRabList.length === 0 && (
                        <tr>
                            <td colSpan={4} style={{ textAlign: 'center' }}>
                                Tidak ada RAB harian yang menunggu persetujuan.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <hr style={{ margin: '20px 0' }} />

            {/* ================================================ */}
            {/* SECTION: RIWAYAT APPROVAL                        */}
            {/* ================================================ */}
            <h3>Riwayat Approval</h3>
            <table border="1" cellPadding="5" style={{ marginBottom: '20px' }}>
                <thead>
                    <tr>
                        <th>Jenis</th>
                        <th>Tanggal Dokumen</th>
                        <th>Status</th>
                        <th>Catatan</th>
                        <th>Diproses Oleh</th>
                        <th>Waktu Approval</th>
                    </tr>
                </thead>
                <tbody>
                    {approvalList.map(a => (
                        <tr key={a.id}>
                            <td>{a.menuHarian ? 'Menu Harian' : 'RAB Harian'}</td>
                            <td>
                                {a.menuHarian
                                    ? a.menuHarian.tanggal.split('T')[0]
                                    : a.rabHarian?.tanggal.split('T')[0] || '—'}
                            </td>
                            <td>{a.status}</td>
                            <td>{a.catatan || '—'}</td>
                            <td>{a.approvedBy?.nama || a.approvedBy?.username || '—'}</td>
                            <td>{new Date(a.createdAt).toLocaleString('id-ID')}</td>
                        </tr>
                    ))}
                    {approvalList.length === 0 && (
                        <tr>
                            <td colSpan={6} style={{ textAlign: 'center' }}>
                                Belum ada riwayat approval untuk periode ini.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
