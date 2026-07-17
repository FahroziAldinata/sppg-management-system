import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table, renderDate } from '../../components/Table';
import { DatePicker } from '../../components/DatePicker';
import Dropdown from '../../components/Dropdown';
import { NumberInput } from '../../components/NumberInput';
import { Skeleton } from '../../components/Skeleton';

export const AnggaranHarianPage = () => {
    const { request } = useApi();
  const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [categories, setCategories] = useState([]);
    const [anggaranList, setAnggaranList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [anggaranForm, setAnggaranForm] = useState({
        tanggal: '',
        kategoriDana: '',
        jumlahPaket: '',
        hargaSatuan: '',
        keterangan: ''
    });
    const [anggaranDetailBahan, setAnggaranDetailBahan] = useState([]);
    const [tempDetail, setTempDetail] = useState({ kategoriId: '', jumlahPaket: '', hargaSatuan: '' });

    // Fetch periods & categories on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode.'));

        request('/aslap/kategori')
            .then(r => r.json())
            .then(d => setCategories(d))
            .catch(() => { });
    }, []);

    const loadAnggaran = async (pid) => {
        if (!pid) return;
        setLoading(true);
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
            setLoading(false);
        }
    };

    // Load budget list when period changes
    useEffect(() => {
        if (periodeId) {
            loadAnggaran(periodeId);
        }
    }, [periodeId]);

    const activePeriod = periods.find(p => p.id === periodeId);

    const createAnggaranHarian = async (e) => {
        e.preventDefault();
        const {
            tanggal,
            kategoriDana,
            jumlahPaket,
            hargaSatuan,
            keterangan
        } = anggaranForm;

        if (!periodeId) {
            toast.error('Periode wajib dipilih.');
            return;
        }
        if (!tanggal) {
            toast.error('Tanggal anggaran wajib diisi.');
            return;
        }
        if (!kategoriDana) {
            toast.error('Kategori dana wajib diisi.');
            return;
        }
        if (jumlahPaket === undefined || jumlahPaket === '') {
            toast.error('Jumlah paket wajib diisi.');
            return;
        }

        const body = {
            periodeId,
            tanggal,
            kategoriDana,
            jumlahPaket: parseInt(jumlahPaket, 10),
            keterangan: keterangan || undefined
        };

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
            if (hargaSatuan === undefined || hargaSatuan === '') {
                toast.error('Harga satuan wajib diisi untuk kategori selain bahan makanan.');
                return;
            }
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
                // Reset form & rincian
                setAnggaranForm({
                    tanggal: '',
                    kategoriDana: '',
                    jumlahPaket: '',
                    hargaSatuan: '',
                    keterangan: ''
                });
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

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Pengajuan Anggaran Harian Resmi</h2>
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
                    onChange={val => setPeriodeId(val)}
                    options={periods.map(p => ({ value: p.id, label: `${p.tanggalMulai} - ${p.tanggalSelesai}` }))}
                />
            </div>

            {/* Form Anggaran */}
            <form onSubmit={createAnggaranHarian} style={{
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
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Buat Anggaran Harian</h3>

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
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
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
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
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
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '6px'
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

                {/* Case 2: Non BAHAN_MAKANAN -> Input Harga Satuan Flat */}
                {anggaranForm.kategoriDana && anggaranForm.kategoriDana !== 'BAHAN_MAKANAN' && (
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

                {/* Case 1: BAHAN_MAKANAN -> Sub-form & List Rincian per Kategori Penerima */}
                {anggaranForm.kategoriDana === 'BAHAN_MAKANAN' && (
                    <div style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '16px',
                        marginTop: '10px',
                        backgroundColor: 'var(--bg)'
                    }}>
                        <h4 style={{ marginTop: '0', marginBottom: '16px', color: 'var(--text)', fontSize: '14px' }}>Rincian Bahan Makanan per Kategori Penerima</h4>

                        {/* Sub-form Rincian */}
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
                                        alert('Mohon lengkapi semua input rincian.');
                                        return;
                                    }
                                    setAnggaranDetailBahan(prev => [...prev, { ...tempDetail }]);
                                    setTempDetail({ kategoriId: '', jumlahPaket: '', hargaSatuan: '' });
                                }}
                                style={{
                                    padding: '10px 16px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '13px'
                                }}
                            >
                                Tambah ke Rincian
                            </button>
                        </div>

                        {/* List Rincian Sementara */}
                        <ul style={{ paddingLeft: '20px', margin: '10px 0', color: 'var(--text)' }}>
                            {anggaranDetailBahan.map((detail, index) => {
                                const catObj = categories.find(c => c.id === detail.kategoriId);
                                return (
                                    <li key={index} style={{ marginBottom: '8px', fontSize: '14px' }}>
                                        {catObj ? catObj.nama : detail.kategoriId} — {detail.jumlahPaket} paket @ Rp{Number(detail.hargaSatuan).toLocaleString('id-ID')} (Subtotal: Rp{Number(detail.jumlahPaket * detail.hargaSatuan).toLocaleString('id-ID')})
                                        {' '}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAnggaranDetailBahan(prev => prev.filter((_, idx) => idx !== index));
                                            }}
                                            style={{
                                                color: 'var(--color-danger)',
                                                border: 'none',
                                                background: 'none',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                marginLeft: '8px'
                                            }}
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
                        padding: '10px 20px',
                        backgroundColor: 'var(--btn-primary-bg)',
                        color: 'var(--btn-primary-text)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
                    }}>
                        Simpan Anggaran
                    </button>
                </div>
            </form>

            {/* List Anggaran */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Anggaran Harian</h3>
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
                    { key: 'kategoriDana', header: 'Kategori Dana' },
                    {
                        key: 'jumlahPaket',
                        header: 'Jumlah Paket',
                        align: 'right',
                        render: (v) => (
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                {Number(v).toLocaleString('id-ID')}
                            </span>
                        )
                    },
                    {
                        key: 'rab',
                        header: 'Anggaran (RAB)',
                        align: 'right',
                        render: (v) => (
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                Rp{Number(v).toLocaleString('id-ID')}
                            </span>
                        )
                    },
                    {
                        key: 'aktual',
                        header: 'Realisasi (Aktual)',
                        align: 'right',
                        render: (v) => (
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                Rp{Number(v).toLocaleString('id-ID')}
                            </span>
                        )
                    },
                    {
                        key: 'selisih',
                        header: 'Selisih',
                        align: 'right',
                        render: (v) => (
                            <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                Rp{Number(v).toLocaleString('id-ID')}
                            </strong>
                        )
                    }
                ]}
                data={anggaranList}
                emptyText="Belum ada data Anggaran Harian untuk periode ini."
            />}
        </div>
    );
};
