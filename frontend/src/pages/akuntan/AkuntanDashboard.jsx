import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

export const AkuntanDashboard = () => {
    const { request } = useApi();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [tanggalInput, setTanggalInput] = useState('');
    const [error, setError] = useState('');
    const [rabList, setRabList] = useState([]);

    // State Anggaran Harian & Kategori
    const [anggaranList, setAnggaranList] = useState([]);
    const [anggaranForm, setAnggaranForm] = useState({
        periodeId: '',
        tanggal: '',
        kategoriDana: '',
        jumlahPaket: '',
        hargaSatuan: '',
        keterangan: ''
    });
    const [anggaranDetailBahan, setAnggaranDetailBahan] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tempDetail, setTempDetail] = useState({ kategoriId: '', jumlahPaket: '', hargaSatuan: '' });

    // State Jurnal Transaksi
    const [jurnalList, setJurnalList] = useState([]);
    const [akunList, setAkunList] = useState([]);
    const [jurnalForm, setJurnalForm] = useState({
        periodeId: '',
        tanggal: '',
        uraian: '',
        jenis: '',
        nominal: '',
        akunDanaBiayaId: '',
        akunKasId: ''
    });

    // State Dokumen Resmi
    const [dokumenList, setDokumenList] = useState([]);
    const [dokumenForm, setDokumenForm] = useState({ jenisDokumen: '', nomorDokumen: '' });
    const [previewData, setPreviewData] = useState(null);

    // State Daftar Nominatif Upah
    const [upahList, setUpahList] = useState([]);
    const [upahForm, setUpahForm] = useState({
        periodeId: '',
        jenisPekerjaan: '',
        namaRelawan: '',
        danaKesehatan: '',
        tk: '',
        pj: ''
    });
    const [upahDetailList, setUpahDetailList] = useState([]); // Array of { tanggal, nominal }
    const [tempUpahDetail, setTempUpahDetail] = useState({ tanggal: '', nominal: '' });

    // Fetch list periode pada saat mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            });
    }, []);

    // Fetch list kategori penerima pada saat mount
    useEffect(() => {
        request('/aslap/kategori')
            .then(r => r.json())
            .then(d => setCategories(d))
            .catch(() => {});
    }, []);

    // Fetch list akun aktif saat mount
    useEffect(() => {
        request('/akuntan/akun')
            .then(r => r.json())
            .then(d => setAkunList(d))
            .catch(() => {});
    }, []);

    // Fungsi load data RAB Harian
    const load = async (pid) => {
        if (!pid) return;
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
        }
    };

    // Fungsi load data Anggaran Harian
    const loadAnggaran = async (pid) => {
        if (!pid) return;
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
        }
    };

    // Fungsi load data Jurnal Transaksi
    const loadJurnal = async (pid) => {
        if (!pid) return;
        try {
            const r = await request(`/akuntan/jurnal-transaksi?periodeId=${pid}`);
            if (r.ok) {
                setJurnalList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar Jurnal Transaksi' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // Fungsi load daftar dokumen resmi terbitan
    const loadDokumenList = async (pid) => {
        if (!pid) return;
        try {
            const r = await request(`/akuntan/dokumen-resmi?periodeId=${pid}`);
            if (r.ok) {
                setDokumenList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar dokumen resmi' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // Fungsi load daftar nominatif upah
    const loadUpahList = async (pid) => {
        if (!pid) return;
        try {
            const r = await request(`/akuntan/daftar-nominatif-upah?periodeId=${pid}`);
            if (r.ok) {
                setUpahList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar Nominatif Upah' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // Trigger load data RabHarian, AnggaranHarian, JurnalTransaksi, DokumenResmi, dan DaftarNominatifUpah setiap kali periodeId berubah
    useEffect(() => {
        if (periodeId) {
            load(periodeId);
            loadAnggaran(periodeId);
            loadJurnal(periodeId);
            loadDokumenList(periodeId);
            loadUpahList(periodeId);
        }
    }, [periodeId]);

    const createRabHarian = async (e) => {
        e.preventDefault();
        setError('');
        
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
                body: JSON.stringify({
                    periodeId,
                    tanggal: tanggalInput
                })
            });

            if (r.ok) {
                setTanggalInput('');
                // Refresh list data RAB Harian
                load(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Gagal membuat RAB Harian');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const createAnggaranHarian = async (e) => {
        e.preventDefault();
        setError('');

        const {
            periodeId: fPeriodeId,
            tanggal,
            kategoriDana,
            jumlahPaket,
            hargaSatuan,
            keterangan
        } = anggaranForm;

        // Fallback ke state periodeId global jika di anggaranForm kosong
        const targetPeriodeId = fPeriodeId || periodeId;

        if (!targetPeriodeId) {
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
            periodeId: targetPeriodeId,
            tanggal,
            kategoriDana,
            jumlahPaket: parseInt(jumlahPaket, 10),
            keterangan: keterangan || undefined
        };

        if (kategoriDana === 'BAHAN_MAKANAN') {
            // Case 1: BAHAN_MAKANAN -> detailBahanMakanan array, NO hargaSatuan flat
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
            // Case 2: Non BAHAN_MAKANAN -> hargaSatuan + jumlahPaket flat, NO detailBahanMakanan
            if (hargaSatuan === undefined || hargaSatuan === '') {
                setError('Harga satuan wajib diisi untuk kategori selain bahan makanan.');
                return;
            }
            body.hargaSatuan = parseFloat(hargaSatuan);
        }

        try {
            const r = await request('/akuntan/anggaran-harian', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (r.ok) {
                // Reset form & rincian
                setAnggaranForm({
                    periodeId: '',
                    tanggal: '',
                    kategoriDana: '',
                    jumlahPaket: '',
                    hargaSatuan: '',
                    keterangan: ''
                });
                setAnggaranDetailBahan([]);
                
                // Refresh list anggaran
                loadAnggaran(targetPeriodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Gagal menyimpan Anggaran Harian');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const createJurnal = async (e) => {
        e.preventDefault();
        setError('');

        const {
            periodeId: fPeriodeId,
            tanggal,
            uraian,
            jenis,
            nominal,
            akunDanaBiayaId,
            akunKasId
        } = jurnalForm;

        const targetPeriodeId = fPeriodeId || periodeId;

        if (!targetPeriodeId) {
            setError('Periode wajib dipilih.');
            return;
        }
        if (!tanggal) {
            setError('Tanggal transaksi wajib diisi.');
            return;
        }
        if (!uraian) {
            setError('Uraian transaksi wajib diisi.');
            return;
        }
        if (!jenis) {
            setError('Jenis transaksi wajib dipilih (MASUK/KELUAR).');
            return;
        }
        if (nominal === undefined || nominal === '') {
            setError('Nominal wajib diisi.');
            return;
        }
        const valNominal = parseFloat(nominal);
        if (isNaN(valNominal) || valNominal <= 0) {
            setError('Nominal harus berupa angka positif.');
            return;
        }
        if (!akunDanaBiayaId) {
            setError('Akun Dana/Biaya wajib dipilih.');
            return;
        }
        if (!akunKasId) {
            setError('Akun Kas wajib dipilih.');
            return;
        }

        try {
            const r = await request('/akuntan/jurnal-transaksi', {
                method: 'POST',
                body: JSON.stringify({
                    periodeId: targetPeriodeId,
                    tanggal,
                    uraian,
                    jenis,
                    nominal: valNominal,
                    akunDanaBiayaId,
                    akunKasId
                })
            });

            if (r.ok) {
                // Reset Form
                setJurnalForm({
                    periodeId: '',
                    tanggal: '',
                    uraian: '',
                    jenis: '',
                    nominal: '',
                    akunDanaBiayaId: '',
                    akunKasId: ''
                });
                
                // Refresh list jurnal
                loadJurnal(targetPeriodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Gagal menyimpan Jurnal Transaksi');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const generateDokumen = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setPreviewData(null);

        const { jenisDokumen, nomorDokumen } = dokumenForm;

        if (!periodeId) {
            setError('Periode wajib dipilih.');
            return;
        }
        if (!jenisDokumen) {
            setError('Jenis dokumen wajib dipilih.');
            return;
        }
        // Validasi nomor dokumen opsional untuk SPTJ, tapi wajib untuk LPA & BAPSD
        if ((jenisDokumen === 'LPA' || jenisDokumen === 'BAPSD') && !nomorDokumen) {
            setError('Nomor dokumen wajib diisi untuk LPA dan BAPSD.');
            return;
        }

        try {
            const query = new URLSearchParams({
                periodeId,
                jenisDokumen,
                nomorDokumen: nomorDokumen || ''
            }).toString();

            const r = await request(`/akuntan/dokumen-resmi/generate?${query}`);
            if (r.ok) {
                setPreviewData(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal men-generate preview dokumen' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const publishDokumen = async () => {
        setError('');
        
        const { jenisDokumen, nomorDokumen } = dokumenForm;

        if (!periodeId) {
            setError('Periode wajib dipilih.');
            return;
        }
        if (!jenisDokumen) {
            setError('Jenis dokumen wajib dipilih.');
            return;
        }

        try {
            const r = await request('/akuntan/dokumen-resmi', {
                method: 'POST',
                body: JSON.stringify({
                    periodeId,
                    jenisDokumen,
                    nomorDokumen: nomorDokumen || null
                })
            });

            if (r.ok) {
                // Reset input form & sembunyikan preview
                setDokumenForm({ jenisDokumen: '', nomorDokumen: '' });
                setPreviewData(null);
                
                // Refresh list dokumen resmi terbitan
                loadDokumenList(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Gagal menerbitkan dokumen resmi');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // Helper untuk memasukkan rincian harian ke list sebelum submit
    const addUpahDetail = () => {
        if (!tempUpahDetail.tanggal || !tempUpahDetail.nominal) {
            alert('Lengkapi tanggal dan nominal detail harian.');
            return;
        }
        
        // Cek jika ada duplikasi tanggal di list sementara
        if (upahDetailList.some(item => item.tanggal === tempUpahDetail.tanggal)) {
            alert('Tanggal tersebut sudah diinput pada detail harian.');
            return;
        }

        setUpahDetailList(prev => [...prev, { ...tempUpahDetail }]);
        setTempUpahDetail({ tanggal: '', nominal: '' });
    };

    const createNominatifUpah = async (e) => {
        e.preventDefault();
        setError('');

        const {
            periodeId: fPeriodeId,
            jenisPekerjaan,
            namaRelawan,
            danaKesehatan,
            tk,
            pj
        } = upahForm;

        const targetPeriodeId = fPeriodeId || periodeId;

        if (!targetPeriodeId) {
            setError('Periode wajib dipilih.');
            return;
        }
        if (!jenisPekerjaan) {
            setError('Jenis pekerjaan wajib diisi.');
            return;
        }
        if (!namaRelawan) {
            setError('Nama relawan wajib diisi.');
            return;
        }

        const body = {
            periodeId: targetPeriodeId,
            jenisPekerjaan,
            namaRelawan,
            danaKesehatan: danaKesehatan !== '' ? parseFloat(danaKesehatan) : undefined,
            tk: tk !== '' ? parseFloat(tk) : undefined,
            pj: pj !== '' ? parseFloat(pj) : undefined,
            detailHarian: upahDetailList.map(item => ({
                tanggal: item.tanggal,
                nominal: parseFloat(item.nominal)
            }))
        };

        try {
            const r = await request('/akuntan/daftar-nominatif-upah', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (r.ok) {
                // Reset form & rincian detail harian
                setUpahForm({
                    periodeId: '',
                    jenisPekerjaan: '',
                    namaRelawan: '',
                    danaKesehatan: '',
                    tk: '',
                    pj: ''
                });
                setUpahDetailList([]);
                
                // Refresh list nominatif upah
                loadUpahList(targetPeriodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Gagal menyimpan Daftar Nominatif Upah');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    return (
        <div>
            <h2>Dashboard Akuntan — RAB Harian</h2>
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

            {/* Form Buat RAB Harian */}
            <form onSubmit={createRabHarian} style={{ marginBottom: '20px' }}>
                <input
                    type="date"
                    value={tanggalInput}
                    onChange={e => setTanggalInput(e.target.value)}
                    required
                />
                <button type="submit">Buat RAB Harian</button>
            </form>

            {/* Tabel Daftar RAB Harian (Read-Only) */}
            <table border="1" cellPadding="5">
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Status</th>
                        <th>Dibuat Oleh</th>
                        <th>Jumlah Transaksi Pembelian</th>
                    </tr>
                </thead>
                <tbody>
                    {rabList.map(r => (
                        <tr key={r.id}>
                            <td>{r.tanggal.split('T')[0]}</td>
                            <td>{r.status}</td>
                            <td>{r.createdBy?.nama || r.createdBy?.username || '—'}</td>
                            <td>{(r.transaksiPembelian || []).length} transaksi</td>
                        </tr>
                    ))}
                    {rabList.length === 0 && (
                        <tr>
                            <td colSpan={4} style={{ textAlign: 'center' }}>
                                Belum ada data RAB Harian untuk periode ini.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <hr style={{ margin: '30px 0' }} />

            {/* ================================================ */}
            {/* SECTION: ANGGARAN HARIAN                        */}
            {/* ================================================ */}
            <h3>Buat Anggaran Harian</h3>
            <form onSubmit={createAnggaranHarian} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}>
                <div>
                    <label>Tanggal: </label>
                    <input
                        type="date"
                        value={anggaranForm.tanggal || ''}
                        onChange={e => setAnggaranForm(prev => ({ ...prev, tanggal: e.target.value }))}
                        required
                    />
                </div>
                <div>
                    <label>Kategori Dana: </label>
                    <select
                        value={anggaranForm.kategoriDana || ''}
                        onChange={e => setAnggaranForm(prev => ({ ...prev, kategoriDana: e.target.value }))}
                        required
                    >
                        <option value="">-- Pilih Kategori Dana --</option>
                        <option value="BAHAN_MAKANAN">BAHAN_MAKANAN</option>
                        <option value="OPERASIONAL">OPERASIONAL</option>
                        <option value="INSENTIF_FASILITAS">INSENTIF_FASILITAS</option>
                    </select>
                </div>
                <div>
                    <label>Jumlah Paket (Total): </label>
                    <input
                        type="number"
                        placeholder="Jumlah Paket"
                        value={anggaranForm.jumlahPaket || ''}
                        onChange={e => setAnggaranForm(prev => ({ ...prev, jumlahPaket: e.target.value }))}
                        required
                    />
                </div>
                <div>
                    <label>Keterangan (opsional): </label>
                    <input
                        type="text"
                        placeholder="Keterangan"
                        value={anggaranForm.keterangan || ''}
                        onChange={e => setAnggaranForm(prev => ({ ...prev, keterangan: e.target.value }))}
                    />
                </div>

                {/* Case 2: Non BAHAN_MAKANAN -> Input Harga Satuan Flat */}
                {anggaranForm.kategoriDana && anggaranForm.kategoriDana !== 'BAHAN_MAKANAN' && (
                    <div>
                        <label>Harga Satuan: </label>
                        <input
                            type="number"
                            placeholder="Harga Satuan"
                            value={anggaranForm.hargaSatuan || ''}
                            onChange={e => setAnggaranForm(prev => ({ ...prev, hargaSatuan: e.target.value }))}
                            required
                        />
                    </div>
                )}

                {/* Case 1: BAHAN_MAKANAN -> Sub-form & List Rincian per Kategori Penerima */}
                {anggaranForm.kategoriDana === 'BAHAN_MAKANAN' && (
                    <div style={{ border: '1px dashed #777', padding: '10px', marginTop: '10px' }}>
                        <h4>Rincian Bahan Makanan per Kategori Penerima</h4>
                        
                        {/* Sub-form Rincian */}
                        <div style={{ marginBottom: '10px' }}>
                            <select
                                value={tempDetail.kategoriId || ''}
                                onChange={e => setTempDetail(prev => ({ ...prev, kategoriId: e.target.value }))}
                            >
                                <option value="">-- Pilih Kategori Penerima --</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.nama} ({cat.jenisPorsi})
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                placeholder="Jumlah Paket"
                                value={tempDetail.jumlahPaket || ''}
                                onChange={e => setTempDetail(prev => ({ ...prev, jumlahPaket: e.target.value }))}
                            />
                            <input
                                type="number"
                                placeholder="Harga Satuan"
                                value={tempDetail.hargaSatuan || ''}
                                onChange={e => setTempDetail(prev => ({ ...prev, hargaSatuan: e.target.value }))}
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
                            >
                                Tambah ke Rincian
                            </button>
                        </div>

                        {/* List Rincian Sementara */}
                        <ul>
                            {anggaranDetailBahan.map((detail, index) => {
                                const catObj = categories.find(c => c.id === detail.kategoriId);
                                return (
                                    <li key={index}>
                                        {catObj ? catObj.nama : detail.kategoriId} — {detail.jumlahPaket} paket @ Rp{detail.hargaSatuan} (Subtotal: Rp{detail.jumlahPaket * detail.hargaSatuan})
                                        {' '}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAnggaranDetailBahan(prev => prev.filter((_, idx) => idx !== index));
                                            }}
                                        >
                                            Hapus
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                <div style={{ marginTop: '10px' }}>
                    <button type="submit">Simpan Anggaran</button>
                </div>
            </form>

            <h3>Daftar Anggaran Harian</h3>
            <table border="1" cellPadding="5" style={{ marginBottom: '20px' }}>
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Kategori Dana</th>
                        <th>Jumlah Paket</th>
                        <th>RAB</th>
                        <th>Aktual</th>
                        <th>Selisih</th>
                    </tr>
                </thead>
                <tbody>
                    {anggaranList.map(a => (
                        <tr key={a.id}>
                            <td>{a.tanggal.split('T')[0]}</td>
                            <td>{a.kategoriDana}</td>
                            <td>{a.jumlahPaket}</td>
                            <td>Rp{a.rab}</td>
                            <td>Rp{a.aktual}</td>
                            <td>Rp{a.selisih}</td>
                        </tr>
                    ))}
                    {anggaranList.length === 0 && (
                        <tr>
                            <td colSpan={6} style={{ textAlign: 'center' }}>
                                Belum ada data Anggaran Harian untuk periode ini.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <hr style={{ margin: '30px 0' }} />

            {/* ================================================ */}
            {/* SECTION: JURNAL TRANSAKSI                        */}
            {/* ================================================ */}
            <h3>Buat Jurnal Transaksi</h3>
            <form onSubmit={createJurnal} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}>
                <div>
                    <label>Tanggal: </label>
                    <input
                        type="date"
                        value={jurnalForm.tanggal || ''}
                        onChange={e => setJurnalForm(prev => ({ ...prev, tanggal: e.target.value }))}
                        required
                    />
                </div>
                <div>
                    <label>Uraian: </label>
                    <input
                        type="text"
                        placeholder="Uraian Transaksi"
                        value={jurnalForm.uraian || ''}
                        onChange={e => setJurnalForm(prev => ({ ...prev, uraian: e.target.value }))}
                        required
                    />
                </div>
                <div>
                    <label>Jenis Transaksi: </label>
                    <select
                        value={jurnalForm.jenis || ''}
                        onChange={e => setJurnalForm(prev => ({ ...prev, jenis: e.target.value }))}
                        required
                    >
                        <option value="">-- Pilih Jenis --</option>
                        <option value="MASUK">MASUK</option>
                        <option value="KELUAR">KELUAR</option>
                    </select>
                </div>
                <div>
                    <label>Nominal: </label>
                    <input
                        type="number"
                        placeholder="Nominal (Rp)"
                        value={jurnalForm.nominal || ''}
                        onChange={e => setJurnalForm(prev => ({ ...prev, nominal: e.target.value }))}
                        required
                    />
                </div>
                <div>
                    <label>Akun Kas: </label>
                    <select
                        value={jurnalForm.akunKasId || ''}
                        onChange={e => setJurnalForm(prev => ({ ...prev, akunKasId: e.target.value }))}
                        required
                    >
                        <option value="">-- Pilih Akun Kas --</option>
                        {akunList.map(a => (
                            <option key={a.id} value={a.id}>
                                [{a.kode}] {a.nama} ({a.tipe})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label>Akun Dana / Biaya: </label>
                    <select
                        value={jurnalForm.akunDanaBiayaId || ''}
                        onChange={e => setJurnalForm(prev => ({ ...prev, akunDanaBiayaId: e.target.value }))}
                        required
                    >
                        <option value="">-- Pilih Akun Dana / Biaya --</option>
                        {akunList.map(a => (
                            <option key={a.id} value={a.id}>
                                [{a.kode}] {a.nama} ({a.tipe})
                            </option>
                        ))}
                    </select>
                </div>
                <div style={{ marginTop: '10px' }}>
                    <button type="submit">Simpan Jurnal</button>
                </div>
            </form>

            <h3>Daftar Jurnal Transaksi</h3>
            <table border="1" cellPadding="5" style={{ marginBottom: '20px' }}>
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Nomor Bukti</th>
                        <th>Uraian</th>
                        <th>Jenis</th>
                        <th>Nominal</th>
                        <th>Akun Kas</th>
                        <th>Akun Dana / Biaya</th>
                    </tr>
                </thead>
                <tbody>
                    {jurnalList.map(j => (
                        <tr key={j.id}>
                            <td>{j.tanggal.split('T')[0]}</td>
                            <td>{j.nomorBukti}</td>
                            <td>{j.uraian}</td>
                            <td>{j.jenis}</td>
                            <td>Rp{j.nominal}</td>
                            <td>{j.akunKas ? `[${j.akunKas.kode}] ${j.akunKas.nama}` : '—'}</td>
                            <td>{j.akunDanaBiaya ? `[${j.akunDanaBiaya.kode}] ${j.akunDanaBiaya.nama}` : '—'}</td>
                        </tr>
                    ))}
                    {jurnalList.length === 0 && (
                        <tr>
                            <td colSpan={7} style={{ textAlign: 'center' }}>
                                Belum ada data Jurnal Transaksi untuk periode ini.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <hr style={{ margin: '30px 0' }} />

            {/* ================================================ */}
            {/* SECTION: DOKUMEN RESMI (GENERATOR & PUBLIKASI)   */}
            {/* ================================================ */}
            <h3>Dokumen Resmi (Generator & Publikasi)</h3>
            <form onSubmit={generateDokumen} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}>
                <div>
                    <label>Jenis Dokumen: </label>
                    <select
                        value={dokumenForm.jenisDokumen}
                        onChange={e => setDokumenForm(prev => ({ ...prev, jenisDokumen: e.target.value }))}
                        required
                    >
                        <option value="">-- Pilih Jenis --</option>
                        <option value="LPA">LPA (Laporan Pertanggungjawaban Anggaran)</option>
                        <option value="SPTJ">SPTJ (Surat Pernyataan Tanggung Jawab)</option>
                        <option value="BAPSD">BAPSD (Berita Acara Penyerahan Selisih Dana)</option>
                    </select>
                </div>
                <div>
                    <label>Nomor Dokumen: </label>
                    <input
                        type="text"
                        placeholder="Nomor Dokumen"
                        value={dokumenForm.nomorDokumen}
                        onChange={e => setDokumenForm(prev => ({ ...prev, nomorDokumen: e.target.value }))}
                    />
                </div>
                <div style={{ marginTop: '10px' }}>
                    <button type="submit">Preview Dokumen</button>
                </div>
            </form>

            {/* Area Preview Data & Tombol Publish */}
            {previewData && (
                <div style={{ border: '1px dashed #777', padding: '10px', marginBottom: '20px', backgroundColor: '#f9f9f9' }}>
                    <h4>Preview Data Dokumen Resmi</h4>
                    <pre style={{ overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '300px' }}>
                        {JSON.stringify(previewData, null, 2)}
                    </pre>
                    <button type="button" onClick={publishDokumen}>Terbitkan Dokumen Resmi</button>
                </div>
            )}

            {/* Tabel Dokumen Diterbitkan */}
            <h3>Daftar Dokumen Resmi Diterbitkan</h3>
            <table border="1" cellPadding="5" style={{ marginBottom: '20px' }}>
                <thead>
                    <tr>
                        <th>Jenis Dokumen</th>
                        <th>Nomor Dokumen</th>
                        <th>Diterbitkan Oleh</th>
                        <th>Tanggal Terbit</th>
                    </tr>
                </thead>
                <tbody>
                    {dokumenList.map(d => (
                        <tr key={d.id}>
                            <td>{d.jenisDokumen}</td>
                            <td>{d.nomorDokumen || '—'}</td>
                            <td>{d.createdBy?.nama || '—'}</td>
                            <td>{new Date(d.createdAt).toLocaleString('id-ID')}</td>
                        </tr>
                    ))}
                    {dokumenList.length === 0 && (
                        <tr>
                            <td colSpan={4} style={{ textAlign: 'center' }}>
                                Belum ada dokumen resmi diterbitkan untuk periode ini.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <hr style={{ margin: '30px 0' }} />

            {/* ================================================ */}
            {/* SECTION: DAFTAR NOMINATIF UPAH                   */}
            {/* ================================================ */}
            <h3>Buat Daftar Nominatif Upah</h3>
            <form onSubmit={createNominatifUpah} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}>
                <div>
                    <label>Jenis Pekerjaan: </label>
                    <input
                        type="text"
                        placeholder="Misal: RELAWAN, TUKANG, STAF"
                        value={upahForm.jenisPekerjaan || ''}
                        onChange={e => setUpahForm(prev => ({ ...prev, jenisPekerjaan: e.target.value }))}
                        required
                    />
                </div>
                <div>
                    <label>Nama Relawan: </label>
                    <input
                        type="text"
                        placeholder="Nama Lengkap"
                        value={upahForm.namaRelawan || ''}
                        onChange={e => setUpahForm(prev => ({ ...prev, namaRelawan: e.target.value }))}
                        required
                    />
                </div>
                <div>
                    <label>Dana Kesehatan (opsional): </label>
                    <input
                        type="number"
                        placeholder="Dana Kesehatan"
                        value={upahForm.danaKesehatan || ''}
                        onChange={e => setUpahForm(prev => ({ ...prev, danaKesehatan: e.target.value }))}
                    />
                </div>
                <div>
                    <label>TK/BPJS Ketenagakerjaan (opsional): </label>
                    <input
                        type="number"
                        placeholder="Nominal TK"
                        value={upahForm.tk || ''}
                        onChange={e => setUpahForm(prev => ({ ...prev, tk: e.target.value }))}
                    />
                </div>
                <div>
                    <label>PJ/Asuransi Lain (opsional): </label>
                    <input
                        type="number"
                        placeholder="Nominal PJ"
                        value={upahForm.pj || ''}
                        onChange={e => setUpahForm(prev => ({ ...prev, pj: e.target.value }))}
                    />
                </div>

                {/* Sub-form Detail Harian */}
                <div style={{ border: '1px dashed #777', padding: '10px', marginTop: '10px' }}>
                    <h4>Rincian Upah Harian</h4>
                    <div style={{ marginBottom: '10px' }}>
                        <input
                            type="date"
                            value={tempUpahDetail.tanggal || ''}
                            onChange={e => setTempUpahDetail(prev => ({ ...prev, tanggal: e.target.value }))}
                        />
                        <input
                            type="number"
                            placeholder="Nominal Harian (Rp)"
                            value={tempUpahDetail.nominal || ''}
                            onChange={e => setTempUpahDetail(prev => ({ ...prev, nominal: e.target.value }))}
                        />
                        <button type="button" onClick={addUpahDetail}>Tambah Rincian</button>
                    </div>

                    {/* List Sementara Rincian Harian */}
                    <ul>
                        {upahDetailList.map((item, index) => (
                            <li key={index}>
                                {item.tanggal} — Rp{item.nominal}
                                {' '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUpahDetailList(prev => prev.filter((_, idx) => idx !== index));
                                    }}
                                >
                                    Hapus
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div style={{ marginTop: '10px' }}>
                    <button type="submit">Simpan Daftar Nominatif Upah</button>
                </div>
            </form>

            <h3>Daftar Nominatif Upah</h3>
            <table border="1" cellPadding="5">
                <thead>
                    <tr>
                        <th>Jenis Pekerjaan</th>
                        <th>Nama Relawan</th>
                        <th>Total Honorarium</th>
                        <th>Total Upah</th>
                    </tr>
                </thead>
                <tbody>
                    {upahList.map(u => (
                        <tr key={u.id}>
                            <td>{u.jenisPekerjaan}</td>
                            <td>{u.namaRelawan}</td>
                            <td>Rp{u.totalHonorarium}</td>
                            <td>Rp{u.totalUpah}</td>
                        </tr>
                    ))}
                    {upahList.length === 0 && (
                        <tr>
                            <td colSpan={4} style={{ textAlign: 'center' }}>
                                Belum ada data Daftar Nominatif Upah untuk periode ini.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
