import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table, renderDate, renderStatus } from '../../components/Table';
import { DatePicker } from '../../components/DatePicker';
import Dropdown from '../../components/Dropdown';
import { NumberInput } from '../../components/NumberInput';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Skeleton } from '../../components/Skeleton';

export const RabHarianPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const [tab, setTab] = useState(window.location.pathname.includes('anggaran') ? 'anggaran' : 'rab');

    // Shared
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');

    // RAB-specific
    const [tanggalInput, setTanggalInput] = useState('');
    const [rabList, setRabList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingRabId, setPendingRabId] = useState(null);
    const [kebutuhanHitungan, setKebutuhanHitungan] = useState([]);

    // Anggaran-specific
    const [categories, setCategories] = useState([]);
    const [anggaranList, setAnggaranList] = useState([]);
    const [anggaranLoading, setAnggaranLoading] = useState(false);
    const [anggaranForm, setAnggaranForm] = useState({
        tanggal: '', kategoriDana: '', jumlahPaket: '', hargaSatuan: '', keterangan: ''
    });
    const [anggaranDetailBahan, setAnggaranDetailBahan] = useState([]);
    const [tempDetail, setTempDetail] = useState({ kategoriId: '', jumlahPaket: '', hargaSatuan: '' });

    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode'));

        request('/aslap/kategori')
            .then(r => r.json())
            .then(d => setCategories(d))
            .catch(() => { });
    }, []);

    // ─── RAB ───

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

    useEffect(() => {
        if (periodeId) { loadRabHarian(periodeId); }
    }, [periodeId]);

    useEffect(() => {
        if (!tanggalInput || !periodeId) {
            setKebutuhanHitungan([]);
            return;
        }
        request(`/akuntan/kebutuhan-hitungan?periodeId=${periodeId}&tanggal=${tanggalInput}`)
            .then(r => r.json())
            .then(d => {
                setKebutuhanHitungan((d.success && d.data) || []);
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
        if (!periodeId) { toast.error('Periode wajib dipilih.'); return; }
        if (!tanggalInput) { toast.error('Tanggal wajib diisi.'); return; }
        try {
            const r = await request('/akuntan/rab-harian', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ periodeId, tanggal: tanggalInput })
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

    // ─── ANGGARAN ───

    const loadAnggaran = async (pid) => {
        if (!pid) return;
        setAnggaranLoading(true);
        try {
            const r = await request(`/akuntan/anggaran-harian?periodeId=${pid}`);
            if (r.ok) {
                setAnggaranList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar Anggaran Harian' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setAnggaranLoading(false);
        }
    };

    useEffect(() => {
        if (periodeId) { loadAnggaran(periodeId); }
    }, [periodeId]);

    const createAnggaranHarian = async (e) => {
        e.preventDefault();
        const { tanggal, kategoriDana, jumlahPaket, hargaSatuan, keterangan } = anggaranForm;
        if (!periodeId) { toast.error('Periode wajib dipilih.'); return; }
        if (!tanggal) { toast.error('Tanggal anggaran wajib diisi.'); return; }
        if (!kategoriDana) { toast.error('Kategori dana wajib diisi.'); return; }
        if (jumlahPaket === undefined || jumlahPaket === '') { toast.error('Jumlah paket wajib diisi.'); return; }

        const body = { periodeId, tanggal, kategoriDana, jumlahPaket: parseInt(jumlahPaket, 10), keterangan: keterangan || undefined };

        if (kategoriDana === 'BAHAN_MAKANAN') {
            if (!anggaranDetailBahan || anggaranDetailBahan.length === 0) {
                toast.error('Rincian bahan makanan wajib diisi untuk kategori BAHAN_MAKANAN.');
                return;
            }
            body.detailBahanMakanan = anggaranDetailBahan.map(item => ({
                kategoriId: item.kategoriId,
                jumlahPaket: parseInt(item.jumlahPaket, 10),
                hargaSatuan: parseFloat(item.hargaSatuan)
            }));
        } else {
            if (hargaSatuan === undefined || hargaSatuan === '') { toast.error('Harga satuan wajib diisi.'); return; }
            body.hargaSatuan = parseFloat(hargaSatuan);
        }

        try {
            const r = await request('/akuntan/anggaran-harian', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (r.ok) {
                toast.success('Anggaran Harian berhasil disimpan.');
                setAnggaranForm({ tanggal: '', kategoriDana: '', jumlahPaket: '', hargaSatuan: '', keterangan: '' });
                setAnggaranDetailBahan([]);
                loadAnggaran(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                toast.error(d.error || 'Gagal menyimpan Anggaran Harian');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // ─── RENDER ───

    const tabStyle = (t) => ({
        padding: '10px 24px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '14px',
        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
        backgroundColor: tab === t ? 'var(--btn-primary-bg)' : 'var(--bg-elevated)',
        color: tab === t ? 'var(--btn-primary-text)' : 'var(--text-muted)',
        borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
        transition: 'all 0.15s ease'
    });

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>RAB &amp; Anggaran Harian</h2>

            {/* Pilihan Periode (shared) */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '20px',
                width: '26%',
                minWidth: '320px'
            }}>
                <label style={{
                    textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.07em', color: 'var(--text-muted)',
                    display: 'block', marginBottom: '6px'
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

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
                <button style={tabStyle('rab')} onClick={() => setTab('rab')}>
                    📋 RAB Harian
                </button>
                <button style={tabStyle('anggaran')} onClick={() => setTab('anggaran')}>
                    💰 Anggaran Harian
                </button>
            </div>

            {/* ───── TAB RAB ───── */}
            {tab === 'rab' && (
                <>
                    <div style={{
                        padding: '12px 16px', backgroundColor: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        borderRadius: 'var(--radius-sm)', marginBottom: '16px',
                        fontSize: '13px', color: 'var(--text)', lineHeight: '1.6'
                    }}>
                        ℹ️ <strong>Halaman ini hanya menetapkan tanggal RAB.</strong>{' '}
                        Item belanja / nota pesanan (PO) diinput oleh <strong>Mitra</strong> di halaman{' '}
                        <em>Nota Pesanan (PO Bahan Makanan)</em>. Setelah Mitra menyimpan PO untuk tanggal tertentu,
                        data transaksi pembelian akan otomatis terhubung ke RAB Harian pada tanggal yang sama.
                    </div>
                    <form onSubmit={createRabHarian} style={{
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                        padding: '24px', backgroundColor: 'var(--bg-elevated)',
                        boxShadow: 'var(--shadow)', marginBottom: '20px',
                        display: 'flex', gap: '15px', alignItems: 'flex-end',
                        maxWidth: '640px', flexWrap: 'wrap'
                    }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{
                                textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                letterSpacing: '0.07em', color: 'var(--text-muted)',
                                display: 'block', marginBottom: '6px'
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
                            padding: '10px 20px', backgroundColor: 'var(--btn-primary-bg)',
                            color: 'var(--btn-primary-text)', border: 'none',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                            fontWeight: 600, fontSize: '14px', height: '42px'
                        }}>
                            Buat RAB Harian
                        </button>
                    </form>

                    {/* Referensi Konversi Satuan */}
                    {tanggalInput && (
                        <div style={{
                            border: '1px solid var(--color-primary-light)',
                            backgroundColor: 'rgba(181, 224, 234, 0.15)',
                            padding: '16px', borderRadius: 'var(--radius-sm)',
                            marginBottom: '20px', maxWidth: '640px'
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
                                            border: '1px solid var(--border)', padding: '8px 12px',
                                            borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text)'
                                        }}>
                                            <strong>{item.nama}</strong>: {item.permintaanAG.toLocaleString('id-ID')} {item.satuanHitungan} &rarr; <strong>{item.final}</strong> KG{' '}
                                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>(konversi {item.konversiPerKg}/kg)</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tabel RAB */}
                    <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar RAB Harian</h3>
                    {loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="40px" />)}
                        </div>
                    )}
                    {!loading && <Table
                        columns={[
                            { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                            { key: 'status', header: 'Status Approval', render: (v) => renderStatus(v) },
                            { key: 'createdBy', header: 'Dibuat Oleh', render: (v) => v?.nama || v?.username || '—' },
                            {
                                key: 'transaksiPembelian', header: 'Jumlah Pembelian', align: 'right',
                                render: (v) => `${(v || []).length} transaksi`
                            },
                            {
                                key: 'aksi', header: 'Aksi',
                                render: (_, row) => (row.status === 'DRAFT' || row.status === 'DITOLAK') ? (
                                    <button onClick={() => triggerAjukan(row.id)} style={{
                                        padding: '5px 12px', backgroundColor: 'var(--btn-primary-bg)',
                                        color: 'var(--btn-primary-text)', border: 'none',
                                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                        fontWeight: 600, fontSize: '12px'
                                    }}>
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
                        onCancel={() => { setConfirmOpen(false); setPendingRabId(null); }}
                    />
                </>
            )}

            {/* ───── TAB ANGGARAN ───── */}
            {tab === 'anggaran' && (
                <>
                    <form onSubmit={createAnggaranHarian} style={{
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                        padding: '24px', backgroundColor: 'var(--bg-elevated)',
                        boxShadow: 'var(--shadow)', marginBottom: '20px',
                        display: 'flex', flexDirection: 'column', gap: '16px'
                    }}>
                        <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Buat Anggaran Harian</h3>

                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 200px' }}>
                                <label style={{
                                    textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                    letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                                }}>
                                    Tanggal
                                </label>
                                <DatePicker
                                    value={anggaranForm.tanggal}
                                    onChange={val => setAnggaranForm(prev => ({ ...prev, tanggal: val }))}
                                    defaultFocusMonth={activePeriod?.tanggalMulai}
                                    required
                                />
                            </div>
                            <div style={{ flex: '1 1 200px' }}>
                                <label style={{
                                    textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                    letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                                }}>
                                    Kategori Dana
                                </label>
                                <Dropdown
                                    style={{ width: '100%' }}
                                    value={anggaranForm.kategoriDana}
                                    onChange={val => setAnggaranForm(prev => ({ ...prev, kategoriDana: val }))}
                                    options={[
                                        { value: '', label: '-- Pilih Kategori Dana --' },
                                        { value: 'BAHAN_MAKANAN', label: 'BAHAN_MAKANAN' },
                                        { value: 'OPERASIONAL', label: 'OPERASIONAL' },
                                        { value: 'INSENTIF_FASILITAS', label: 'INSENTIF_FASILITAS (SEWA)' }
                                    ]}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 200px' }}>
                                <label style={{
                                    textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                    letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                                }}>
                                    Jumlah Paket (Total)
                                </label>
                                <NumberInput
                                    placeholder="Jumlah Paket"
                                    value={anggaranForm.jumlahPaket}
                                    onChange={val => setAnggaranForm(prev => ({ ...prev, jumlahPaket: val }))}
                                    className="form-field"
                                    required
                                />
                            </div>
                            <div style={{ flex: '1 1 200px' }}>
                                <label style={{
                                    textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                    letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                                }}>
                                    Keterangan (opsional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Keterangan"
                                    value={anggaranForm.keterangan}
                                    onChange={e => setAnggaranForm(prev => ({ ...prev, keterangan: e.target.value }))}
                                    className="form-field"
                                />
                            </div>
                        </div>

                        {anggaranForm.kategoriDana && anggaranForm.kategoriDana !== 'BAHAN_MAKANAN' && (
                            <div>
                                <label style={{
                                    textTransform: 'uppercase', fontSize: '11px', fontWeight: 700,
                                    letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px'
                                }}>
                                    Harga Satuan
                                </label>
                                <NumberInput
                                    placeholder="Harga Satuan (Rp)"
                                    value={anggaranForm.hargaSatuan}
                                    onChange={val => setAnggaranForm(prev => ({ ...prev, hargaSatuan: val }))}
                                    className="form-field"
                                    required
                                />
                            </div>
                        )}

                        {anggaranForm.kategoriDana === 'BAHAN_MAKANAN' && (
                            <div style={{
                                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                                padding: '16px', marginTop: '10px', backgroundColor: 'var(--bg)'
                            }}>
                                <h4 style={{ marginTop: '0', marginBottom: '16px', color: 'var(--text)', fontSize: '14px' }}>
                                    Rincian Bahan Makanan per Kategori Penerima
                                </h4>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                                    <Dropdown
                                        value={tempDetail.kategoriId}
                                        onChange={val => setTempDetail(prev => ({ ...prev, kategoriId: val }))}
                                        options={[
                                            { value: '', label: '-- Pilih Kategori --' },
                                            ...categories.map(cat => ({ value: cat.id, label: `${cat.nama} (${cat.jenisPorsi})` }))
                                        ]}
                                    />
                                    <NumberInput
                                        placeholder="Jumlah Paket"
                                        value={tempDetail.jumlahPaket}
                                        onChange={val => setTempDetail(prev => ({ ...prev, jumlahPaket: val }))}
                                        className="form-field"
                                        style={{ width: '120px' }}
                                    />
                                    <NumberInput
                                        placeholder="Harga Satuan"
                                        value={tempDetail.hargaSatuan}
                                        onChange={val => setTempDetail(prev => ({ ...prev, hargaSatuan: val }))}
                                        className="form-field"
                                        style={{ width: '120px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!tempDetail.kategoriId || !tempDetail.jumlahPaket || !tempDetail.hargaSatuan) {
                                                toast.error('Mohon lengkapi semua input rincian.');
                                                return;
                                            }
                                            setAnggaranDetailBahan(prev => [...prev, { ...tempDetail }]);
                                            setTempDetail({ kategoriId: '', jumlahPaket: '', hargaSatuan: '' });
                                        }}
                                        style={{
                                            padding: '10px 16px', backgroundColor: 'var(--btn-primary-bg)',
                                            color: 'var(--btn-primary-text)', border: 'none',
                                            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
                                        }}
                                    >
                                        Tambah ke Rincian
                                    </button>
                                </div>

                                <ul style={{ paddingLeft: '20px', margin: '10px 0', color: 'var(--text)' }}>
                                    {anggaranDetailBahan.map((detail, index) => {
                                        const catObj = categories.find(c => c.id === detail.kategoriId);
                                        return (
                                            <li key={index} style={{ marginBottom: '8px', fontSize: '14px' }}>
                                                {catObj ? catObj.nama : detail.kategoriId} — {detail.jumlahPaket} paket @ Rp{Number(detail.hargaSatuan).toLocaleString('id-ID')}{' '}
                                                (Subtotal: Rp{Number(detail.jumlahPaket * detail.hargaSatuan).toLocaleString('id-ID')})
                                                <button
                                                    type="button"
                                                    onClick={() => setAnggaranDetailBahan(prev => prev.filter((_, idx) => idx !== index))}
                                                    style={{ color: 'var(--color-danger)', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', marginLeft: '8px' }}
                                                >
                                                    [Hapus]
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        <div style={{ marginTop: '10px' }}>
                            <button type="submit" style={{
                                padding: '10px 20px', backgroundColor: 'var(--btn-primary-bg)',
                                color: 'var(--btn-primary-text)', border: 'none',
                                borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '14px'
                            }}>
                                Simpan Anggaran
                            </button>
                        </div>
                    </form>

                    <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Anggaran Harian</h3>
                    {anggaranLoading && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="40px" />)}
                        </div>
                    )}
                    {!anggaranLoading && <Table
                        columns={[
                            { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                            { key: 'kategoriDana', header: 'Kategori Dana' },
                            { key: 'jumlahPaket', header: 'Jumlah Paket', align: 'right', render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{Number(v).toLocaleString('id-ID')}</span> },
                            { key: 'rab', header: 'Anggaran (RAB)', align: 'right', render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>Rp{Number(v).toLocaleString('id-ID')}</span> },
                            { key: 'aktual', header: 'Realisasi (Aktual)', align: 'right', render: (v) => <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>Rp{Number(v).toLocaleString('id-ID')}</span> },
                            { key: 'selisih', header: 'Selisih', align: 'right', render: (v) => <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>Rp{Number(v).toLocaleString('id-ID')}</strong> }
                        ]}
                        data={anggaranList}
                        emptyText="Belum ada data Anggaran Harian untuk periode ini."
                    />}
                </>
            )}
        </div>
    );
};
