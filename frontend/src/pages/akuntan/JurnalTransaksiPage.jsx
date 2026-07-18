import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table, renderDate, renderCode, renderTruncate, renderCurrency, renderStatus } from '../../components/Table';
import { DatePicker } from '../../components/DatePicker';
import Dropdown from "../../components/Dropdown";
import { NumberInput } from '../../components/NumberInput';
import { Skeleton } from '../../components/Skeleton';


export const JurnalTransaksiPage = () => {
    const { request } = useApi();
  const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [akunList, setAkunList] = useState([]);
    const [jurnalList, setJurnalList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [realizedPoList, setRealizedPoList] = useState([]);
    const [selectedPrefillPoId, setSelectedPrefillPoId] = useState('');
    const [jurnalForm, setJurnalForm] = useState({
        tanggal: '',
        uraian: '',
        jenis: '',
        nominal: '',
        akunDanaBiayaId: '',
        akunKasId: '',
        transaksiPembelianId: ''
    });

    // Load periods & accounts on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode.'));

        request('/akuntan/akun')
            .then(r => r.json())
            .then(d => setAkunList(d))
            .catch(() => toast.error('Gagal memuat daftar akun.'));
    }, []);

    const loadJurnal = async (pid) => {
        if (!pid) return;
        setLoading(true);
        try {
            const r = await request(`/akuntan/jurnal-transaksi?periodeId=${pid}`);
            if (r.ok) {
                setJurnalList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar Jurnal Transaksi' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setLoading(false);
        }
    };

    const loadRealizedPos = async (pid) => {
        if (!pid) return;
        try {
            const r = await request(`/mitra/po/list?periodeId=${pid}`);
            if (r.ok) {
                const resJson = await r.json();
                const pos = resJson.data || [];
                setRealizedPoList(pos.filter(po => po.status === 'DIREALISASI'));
            }
        } catch (err) {
            console.error('Gagal memuat daftar PO realisasi:', err);
        }
    };

    // Load journal list when period changes
    useEffect(() => {
        if (periodeId) {
            loadJurnal(periodeId);
            loadRealizedPos(periodeId);
            setSelectedPrefillPoId('');
        }
    }, [periodeId]);

    const activePeriod = periods.find(p => p.id === periodeId);

    const createJurnal = async (e) => {
        e.preventDefault();
        const {
            tanggal,
            uraian,
            jenis,
            nominal,
            akunDanaBiayaId,
            akunKasId,
            transaksiPembelianId
        } = jurnalForm;

        if (!periodeId) {
            toast.error('Periode wajib dipilih.');
            return;
        }
        if (!tanggal) {
            toast.error('Tanggal transaksi wajib diisi.');
            return;
        }
        if (!uraian) {
            toast.error('Uraian transaksi wajib diisi.');
            return;
        }
        if (!jenis) {
            toast.error('Jenis transaksi wajib dipilih (MASUK/KELUAR).');
            return;
        }
        if (nominal === undefined || nominal === '') {
            toast.error('Nominal wajib diisi.');
            return;
        }
        const valNominal = parseFloat(nominal);
        if (isNaN(valNominal) || valNominal <= 0) {
            toast.error('Nominal harus berupa angka positif.');
            return;
        }
        if (!akunDanaBiayaId) {
            toast.error('Akun Dana/Biaya wajib dipilih.');
            return;
        }
        if (!akunKasId) {
            toast.error('Akun Kas wajib dipilih.');
            return;
        }

        try {
            const r = await request('/akuntan/jurnal-transaksi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    periodeId,
                    tanggal,
                    uraian,
                    jenis,
                    nominal: valNominal,
                    akunDanaBiayaId,
                    akunKasId,
                    transaksiPembelianId: transaksiPembelianId || undefined
                })
            });

            if (r.ok) {
                toast.success('Jurnal Transaksi berhasil disimpan.');
                // Reset Form
                setJurnalForm({
                    tanggal: '',
                    uraian: '',
                    jenis: '',
                    nominal: '',
                    akunDanaBiayaId: '',
                    akunKasId: '',
                    transaksiPembelianId: ''
                });
                setSelectedPrefillPoId('');

                // Refresh list jurnal
                loadJurnal(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus jurnal transaksi ini? Tindakan ini tidak dapat dibatalkan.')) return;
        try {
            const r = await request(`/akuntan/jurnal-transaksi/${id}`, {
                method: 'DELETE'
            });
            if (r.ok) {
                toast.success('Jurnal Transaksi berhasil dihapus.');
                loadJurnal(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal menghapus jurnal transaksi' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const handlePrefillFromPo = async () => {
        if (!selectedPrefillPoId) return;
        try {
            const r = await request(`/akuntan/jurnal-transaksi/prefill/${selectedPrefillPoId}`);
            if (r.ok) {
                const data = await r.json();
                setJurnalForm(prev => ({
                    ...prev,
                    tanggal: data.tanggal,
                    uraian: data.uraian,
                    nominal: data.nominal,
                    jenis: 'KELUAR',
                    transaksiPembelianId: data.transaksiPembelianId
                }));
                toast.success('Form berhasil diisi dari data PO.');
            } else {
                const errData = await r.json().catch(() => ({ error: 'Gagal prefill data dari PO.' }));
                toast.error(errData.error);
            }
        } catch (err) {
            toast.error('Terjadi kesalahan koneksi.');
        }
    };

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Pencatatan Jurnal Transaksi Ledger</h2>
            {/* Filter Periode */}
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
                    onChange={setPeriodeId}
                    options={periods.map(p => ({
                        value: p.id,
                        label: `${p.tanggalMulai} - ${p.tanggalSelesai}`
                    }))}
                />
            </div>

            {/* Form Jurnal */}
            <form onSubmit={createJurnal} style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Buat Jurnal Transaksi</h3>

                {/* Quick-fill: Bantuan Pemerintah */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginRight: '4px' }}>
                        Isi Cepat BanPer:
                    </span>
                    {[
                        { label: 'Bahan Baku', uraian: 'Diterima Dana BanPer untuk Bahan Baku', kategori: 'BAHAN_MAKANAN' },
                        { label: 'Operasional', uraian: 'Diterima Dana BanPer untuk Operasional', kategori: 'OPERASIONAL' },
                        { label: 'Insentif Fasilitas', uraian: 'Diterima Dana BanPer untuk Insentif Fasilitas', kategori: 'INSENTIF_FASILITAS' },
                    ].map(({ label, uraian, kategori }) => {
                        const akunDana = akunList.find(a => a.tipe === 'DANA' && a.kategoriDana === kategori);
                        return (
                            <button
                                key={kategori}
                                type="button"
                                disabled={!akunDana}
                                title={akunDana ? `Auto-isi: ${uraian} → Akun [${akunDana?.kode}]` : 'Akun Dana untuk kategori ini tidak ditemukan'}
                                onClick={() => setJurnalForm(prev => ({
                                    ...prev,
                                    uraian,
                                    jenis: 'MASUK',
                                    akunDanaBiayaId: akunDana?.id || prev.akunDanaBiayaId
                                }))}
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    border: '1px solid var(--color-primary, #4f46e5)',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--color-primary, #4f46e5)',
                                    cursor: akunDana ? 'pointer' : 'not-allowed',
                                    opacity: akunDana ? 1 : 0.45,
                                }}
                            >
                                + {label}
                            </button>
                        );
                    })}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>(masih bisa edit manual)</span>
                </div>

                {/* Quick-fill: Dari Purchase Order */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '-4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginRight: '4px' }}>
                        Isi dari PO:
                    </span>
                    <Dropdown
                        style={{ minWidth: '220px' }}
                        value={selectedPrefillPoId}
                        onChange={setSelectedPrefillPoId}
                        options={[
                            { value: '', label: '-- Pilih PO Direalisasi --' },
                            ...realizedPoList.map(po => ({
                                value: po.id,
                                label: `${po.tanggal.split('T')[0]} - ${po.supplier?.nama} (Rp${po.items.reduce((s, i) => s + Number(i.subtotalRealisasi || 0), 0).toLocaleString('id-ID')})`
                            }))
                        ]}
                    />
                    <button
                        type="button"
                        disabled={!selectedPrefillPoId}
                        onClick={handlePrefillFromPo}
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: '1px solid var(--color-primary, #4f46e5)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: selectedPrefillPoId ? 'var(--color-primary, #4f46e5)' : 'transparent',
                            color: selectedPrefillPoId ? '#ffffff' : 'var(--color-primary, #4f46e5)',
                            cursor: selectedPrefillPoId ? 'pointer' : 'not-allowed',
                            opacity: selectedPrefillPoId ? 1 : 0.45,
                        }}
                    >
                        Isi dari PO
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Tanggal
                        </label>
                        <DatePicker
                            value={jurnalForm.tanggal}
                            onChange={val => setJurnalForm(prev => ({ ...prev, tanggal: val }))}
                            defaultFocusMonth={activePeriod?.tanggalMulai}
                            required
                        />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Uraian
                        </label>
                        <input
                            type="text"
                            className="form-field"
                            placeholder="Contoh: Pembelian Beras 50kg"
                            value={jurnalForm.uraian}
                            onChange={e => setJurnalForm(prev => ({ ...prev, uraian: e.target.value }))}
                            required
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Jenis Transaksi
                        </label>
                        <Dropdown
                            style={{ width: '100%' }}
                            value={jurnalForm.jenis}
                            onChange={val => setJurnalForm(prev => ({ ...prev, jenis: val }))}
                            options={[
                                { value: '', label: '-- Pilih Jenis --' },
                                { value: 'MASUK', label: 'MASUK (Penerimaan Kas)' },
                                { value: 'KELUAR', label: 'KELUAR (Pengeluaran Kas)' },
                            ]}
                        />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Nominal
                        </label>
                        <NumberInput

                            className="form-field"
                            placeholder="Nominal (Rp)"
                            value={jurnalForm.nominal}
                            onChange={val => setJurnalForm(prev => ({ ...prev, nominal: val }))}
                            required
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Akun Kas
                        </label>
                        <Dropdown
                            style={{ width: '100%' }}
                            value={jurnalForm.akunKasId}
                            onChange={val => setJurnalForm(prev => ({ ...prev, akunKasId: val }))}
                            options={[
                                { value: '', label: '-- Pilih Akun Kas --' },
                                ...akunList.filter(a => a.tipe === 'KAS').map(a => ({
                                    value: a.id,
                                    label: `[${a.kode}] ${a.nama} (${a.tipe})`
                                }))
                            ]}
                        />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
                        }}>
                            Akun Dana / Biaya
                        </label>
                        <Dropdown
                            style={{ width: '100%' }}
                            value={jurnalForm.akunDanaBiayaId}
                            onChange={val => setJurnalForm(prev => ({ ...prev, akunDanaBiayaId: val }))}
                            options={[
                                { value: '', label: '-- Pilih Akun Dana / Biaya --' },
                                ...akunList.filter(a => a.tipe !== 'KAS').map(a => ({
                                    value: a.id,
                                    label: `[${a.kode}] ${a.nama} (${a.tipe})`
                                }))
                            ]}
                        />
                    </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                    <button type="submit" style={{
                        padding: '10px 20px',
                        backgroundColor: 'var(--btn-primary-bg)',
                        color: 'var(--btn-primary-text)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
                    }}>
                        Simpan Jurnal
                    </button>
                </div>
            </form>

            {/* List Jurnal */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Jurnal Transaksi</h3>
            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                </div>
            )}
            {!loading && (
                <Table
                    columns={[
                        { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                        { key: 'nomorBukti', header: 'Nomor Bukti', render: (v) => renderCode(v) },
                        { key: 'uraian', header: 'Uraian', render: (v) => renderTruncate(v) },
                        { key: 'jenis', header: 'Jenis', render: (v) => renderStatus(v) },
                        {
                            key: 'nominal',
                            header: 'Nominal',
                            align: 'right',
                            render: (v) => (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </strong>
                            )
                        },
                        { key: 'akunKas', header: 'Akun Kas', render: (v) => v ? `[${v.kode}] ${v.nama}` : '—' },
                        { key: 'akunDanaBiaya', header: 'Akun Dana / Biaya', render: (v) => v ? `[${v.kode}] ${v.nama}` : '—' },
                        {
                            key: 'id',
                            header: 'Aksi',
                            align: 'center',
                            render: (id) => (
                                <button
                                    type="button"
                                    onClick={() => handleDelete(id)}
                                    style={{
                                        padding: '6px 12px',
                                        backgroundColor: '#ef4444',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 600
                                    }}
                                >
                                    Hapus
                                </button>
                            )
                        }
                    ]}
                    data={jurnalList}
                    emptyText="Belum ada data Jurnal Transaksi untuk periode ini."
                />
            )}
        </div>
    );
};
