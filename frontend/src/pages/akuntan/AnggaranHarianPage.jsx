import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

export const AnggaranHarianPage = () => {
    const { request } = useApi();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [categories, setCategories] = useState([]);
    const [anggaranList, setAnggaranList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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
            .catch(() => setError('Gagal memuat daftar periode.'));

        request('/aslap/kategori')
            .then(r => r.json())
            .then(d => setCategories(d))
            .catch(() => {});
    }, []);

    const loadAnggaran = async (pid) => {
        if (!pid) return;
        setLoading(true);
        setError('');
        try {
            const r = await request(`/akuntan/anggaran-harian?periodeId=${pid}`);
            if (r.ok) {
                setAnggaranList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar Anggaran Harian' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
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

    const createAnggaranHarian = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const {
            tanggal,
            kategoriDana,
            jumlahPaket,
            hargaSatuan,
            keterangan
        } = anggaranForm;

        if (!periodeId) {
            setError('Periode wajib dipilih.');
            return;
        }
        if (!tanggal) {
            setError('Tanggal anggaran wajib diisi.');
            return;
        }
        if (!kategoriDana) {
            setError('Kategori dana wajib diisi.');
            return;
        }
        if (jumlahPaket === undefined || jumlahPaket === '') {
            setError('Jumlah paket wajib diisi.');
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
                setError('Rincian bahan makanan wajib diisi untuk kategori BAHAN_MAKANAN.');
                return;
            }
            body.detailBahanMakanan = anggaranDetailBahan.map(item => ({
                kategoriId: item.kategoriId,
                jumlahPaket: parseInt(item.jumlahPaket, 10),
                hargaSatuan: parseFloat(item.hargaSatuan)
            }));
        } else {
            if (hargaSatuan === undefined || hargaSatuan === '') {
                setError('Harga satuan wajib diisi untuk kategori selain bahan makanan.');
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
                setSuccess('Anggaran Harian berhasil disimpan.');
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
                setError(d.error || 'Gagal menyimpan Anggaran Harian');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    return (
        <div>
            <h2>Pengajuan Anggaran Harian Resmi</h2>
            {error && <div style={{ color: 'red', marginBottom: '10px', padding: '8px', border: '1px solid red' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '10px', padding: '8px', border: '1px solid green' }}>{success}</div>}

            {/* Filter Periode */}
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

            {/* Form Anggaran */}
            <h3>Buat Anggaran Harian</h3>
            <form onSubmit={createAnggaranHarian} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '700px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Tanggal: </label>
                    <input
                        type="date"
                        value={anggaranForm.tanggal}
                        onChange={e => setAnggaranForm(prev => ({ ...prev, tanggal: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                        required
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Kategori Dana: </label>
                    <select
                        value={anggaranForm.kategoriDana}
                        onChange={e => setAnggaranForm(prev => ({ ...prev, kategoriDana: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                        required
                    >
                        <option value="">-- Pilih Kategori Dana --</option>
                        <option value="BAHAN_MAKANAN">BAHAN_MAKANAN</option>
                        <option value="OPERASIONAL">OPERASIONAL</option>
                        <option value="INSENTIF_FASILITAS">INSENTIF_FASILITAS (SEWA)</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Jumlah Paket (Total): </label>
                    <input
                        type="number"
                        placeholder="Jumlah Paket"
                        value={anggaranForm.jumlahPaket}
                        onChange={e => setAnggaranForm(prev => ({ ...prev, jumlahPaket: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                        required
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Keterangan (opsional): </label>
                    <input
                        type="text"
                        placeholder="Keterangan"
                        value={anggaranForm.keterangan}
                        onChange={e => setAnggaranForm(prev => ({ ...prev, keterangan: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>

                {/* Case 2: Non BAHAN_MAKANAN -> Input Harga Satuan Flat */}
                {anggaranForm.kategoriDana && anggaranForm.kategoriDana !== 'BAHAN_MAKANAN' && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '3px' }}>Harga Satuan: </label>
                        <input
                            type="number"
                            placeholder="Harga Satuan (Rp)"
                            value={anggaranForm.hargaSatuan}
                            onChange={e => setAnggaranForm(prev => ({ ...prev, hargaSatuan: e.target.value }))}
                            style={{ width: '100%', padding: '5px' }}
                            required
                        />
                    </div>
                )}

                {/* Case 1: BAHAN_MAKANAN -> Sub-form & List Rincian per Kategori Penerima */}
                {anggaranForm.kategoriDana === 'BAHAN_MAKANAN' && (
                    <div style={{ border: '1px dashed #777', padding: '10px', marginTop: '10px' }}>
                        <h4 style={{ marginTop: '0', marginBottom: '10px' }}>Rincian Bahan Makanan per Kategori Penerima</h4>
                        
                        {/* Sub-form Rincian */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                            <select
                                value={tempDetail.kategoriId}
                                onChange={e => setTempDetail(prev => ({ ...prev, kategoriId: e.target.value }))}
                                style={{ padding: '5px' }}
                            >
                                <option value="">-- Pilih Kategori --</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.nama} ({cat.jenisPorsi})
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                placeholder="Jumlah Paket"
                                value={tempDetail.jumlahPaket}
                                onChange={e => setTempDetail(prev => ({ ...prev, jumlahPaket: e.target.value }))}
                                style={{ padding: '5px', width: '100px' }}
                            />
                            <input
                                type="number"
                                placeholder="Harga Satuan"
                                value={tempDetail.hargaSatuan}
                                onChange={e => setTempDetail(prev => ({ ...prev, hargaSatuan: e.target.value }))}
                                style={{ padding: '5px', width: '100px' }}
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
                                style={{ padding: '5px 10px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer' }}
                            >
                                Tambah ke Rincian
                            </button>
                        </div>

                        {/* List Rincian Sementara */}
                        <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
                            {anggaranDetailBahan.map((detail, index) => {
                                const catObj = categories.find(c => c.id === detail.kategoriId);
                                return (
                                    <li key={index} style={{ marginBottom: '5px' }}>
                                        {catObj ? catObj.nama : detail.kategoriId} — {detail.jumlahPaket} paket @ Rp{Number(detail.hargaSatuan).toLocaleString('id-ID')} (Subtotal: Rp{Number(detail.jumlahPaket * detail.hargaSatuan).toLocaleString('id-ID')})
                                        {' '}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAnggaranDetailBahan(prev => prev.filter((_, idx) => idx !== index));
                                            }}
                                            style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}
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
                    <button type="submit" style={{ padding: '6px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        Simpan Anggaran
                    </button>
                </div>
            </form>

            {/* List Anggaran */}
            <h3>Daftar Anggaran Harian</h3>
            {loading && <p>Memuat daftar anggaran...</p>}
            {!loading && (
                <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th>Tanggal</th>
                            <th>Kategori Dana</th>
                            <th style={{ textAlign: 'right' }}>Jumlah Paket</th>
                            <th style={{ textAlign: 'right' }}>Anggaran (RAB)</th>
                            <th style={{ textAlign: 'right' }}>Realisasi (Aktual)</th>
                            <th style={{ textAlign: 'right' }}>Selisih</th>
                        </tr>
                    </thead>
                    <tbody>
                        {anggaranList.map(a => (
                            <tr key={a.id}>
                                <td>{a.tanggal.split('T')[0]}</td>
                                <td>{a.kategoriDana}</td>
                                <td style={{ textAlign: 'right' }}>{a.jumlahPaket.toLocaleString('id-ID')}</td>
                                <td style={{ textAlign: 'right' }}>Rp{Number(a.rab).toLocaleString('id-ID')}</td>
                                <td style={{ textAlign: 'right' }}>Rp{Number(a.aktual).toLocaleString('id-ID')}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Rp{Number(a.selisih).toLocaleString('id-ID')}</td>
                            </tr>
                        ))}
                        {anggaranList.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '10px' }}>
                                    Belum ada data Anggaran Harian untuk periode ini.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};
