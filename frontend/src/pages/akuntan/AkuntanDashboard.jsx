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

    // State Mutasi Stok
    const [supplierList, setSupplierList] = useState([]);
    const [bahanPokokList, setBahanPokokList] = useState([]);
    const [mutasiStokList, setMutasiStokList] = useState([]);
    const [mutasiForm, setMutasiForm] = useState({
        bahanPokokId: '',
        tanggal: '',
        jenis: '',
        qty: '',
        keterangan: '',
        supplierId: '',
        hargaBeli: '',
        kelompokPenerima: ''
    });

    // State Validasi Stok
    const [validasiList, setValidasiList] = useState([]);
    const [validasiPreview, setValidasiPreview] = useState(null);
    const [validasiForm, setValidasiForm] = useState({
        bahanPokokId: '',
        tanggal: '',
        qtyDibeli: '',
        qtyTerpakai: '',
        catatan: ''
    });

    // State Saldo Awal Barang
    const [saldoAwalForm, setSaldoAwalForm] = useState({
        bahanPokokId: '',
        saldoAwalQty: '',
        hargaBeliAwal: ''
    });

    // Fetch list periode pada saat mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            });
        loadValidasiStok();
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

    // Fetch list supplier aktif saat mount
    useEffect(() => {
        request('/akuntan/supplier')
            .then(r => r.json())
            .then(d => setSupplierList(d))
            .catch(() => {});
    }, []);

    // Fetch list bahan pokok aktif saat mount
    useEffect(() => {
        request('/mitra/bahan-pokok')
            .then(r => r.json())
            .then(d => setBahanPokokList(d))
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

    // Fungsi load daftar mutasi stok
    const loadMutasiStok = async (pid) => {
        if (!pid) return;
        try {
            const r = await request(`/akuntan/mutasi-stok?periodeId=${pid}`);
            if (r.ok) {
                setMutasiStokList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar mutasi stok' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // Trigger load data RabHarian, AnggaranHarian, JurnalTransaksi, DokumenResmi, DaftarNominatifUpah, dan MutasiStok setiap kali periodeId berubah
    useEffect(() => {
        if (periodeId) {
            load(periodeId);
            loadAnggaran(periodeId);
            loadJurnal(periodeId);
            loadDokumenList(periodeId);
            loadUpahList(periodeId);
            loadMutasiStok(periodeId);
        }
    }, [periodeId]);

    const createMutasiStok = async (e) => {
        e.preventDefault();
        setError('');

        const {
            bahanPokokId,
            tanggal,
            jenis,
            qty,
            keterangan,
            supplierId,
            hargaBeli,
            kelompokPenerima
        } = mutasiForm;

        if (!bahanPokokId) { setError('Bahan pokok wajib dipilih.'); return; }
        if (!tanggal) { setError('Tanggal wajib diisi.'); return; }
        if (!jenis) { setError('Jenis mutasi wajib dipilih (MASUK/KELUAR).'); return; }
        if (qty === '' || qty === undefined) { setError('Qty wajib diisi.'); return; }
        const valQty = parseFloat(qty);
        if (isNaN(valQty) || valQty <= 0) { setError('Qty harus berupa angka positif.'); return; }

        const body = {
            bahanPokokId,
            tanggal,
            jenis,
            qty: valQty,
            keterangan: keterangan || null
        };

        if (jenis === 'MASUK') {
            if (!supplierId) { setError('Supplier wajib dipilih untuk mutasi MASUK.'); return; }
            if (hargaBeli === '' || hargaBeli === undefined) { setError('Harga beli wajib diisi untuk mutasi MASUK.'); return; }
            const valHarga = parseFloat(hargaBeli);
            if (isNaN(valHarga) || valHarga < 0) { setError('Harga beli harus berupa angka non-negatif.'); return; }
            body.supplierId = supplierId;
            body.hargaBeli = valHarga;
            body.kelompokPenerima = null;
        } else if (jenis === 'KELUAR') {
            if (!kelompokPenerima) { setError('Kelompok penerima wajib dipilih untuk mutasi KELUAR.'); return; }
            body.kelompokPenerima = kelompokPenerima;
            body.supplierId = null;
            body.hargaBeli = null;
        }

        try {
            const r = await request('/akuntan/mutasi-stok', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (r.ok) {
                setMutasiForm({
                    bahanPokokId: '',
                    tanggal: '',
                    jenis: '',
                    qty: '',
                    keterangan: '',
                    supplierId: '',
                    hargaBeli: '',
                    kelompokPenerima: ''
                });
                loadMutasiStok(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Gagal menyimpan Mutasi Stok');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // Fungsi load riwayat validasi stok (10 data terbaru)
    const loadValidasiStok = async () => {
        try {
            setError('');
            const r = await request('/akuntan/validasi-stok');
            if (r.ok) {
                const resJson = await r.json();
                setValidasiList(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat riwayat validasi stok' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // Trigger preview ketika bahan pokok atau tanggal di form validasi berubah
    useEffect(() => {
        let active = true;

        const loadValidationPreview = async (bpId, tgl) => {
            if (!bpId || !tgl) {
                if (active) setValidasiPreview(null);
                return;
            }
            try {
                setError('');
                const query = new URLSearchParams({
                    bahanPokokId: bpId,
                    tanggal: tgl
                }).toString();

                const r = await request(`/akuntan/validasi-stok/preview?${query}`);
                
                // Mencegah race condition jika state input sudah berubah sebelum response tiba
                if (!active) return;

                if (r.ok) {
                    const data = await r.json();
                    setValidasiPreview(data);
                    // Auto-fill form input fisik dengan angka akumulasi sistem
                    setValidasiForm(prev => ({
                        ...prev,
                        qtyDibeli: data.qtyDibeli,
                        qtyTerpakai: data.qtyTerpakai
                    }));
                } else {
                    const d = await r.json().catch(() => ({ error: 'Gagal memuat preview data sistem' }));
                    setError(d.error);
                    setValidasiPreview(null);
                    // Reset input agar tidak menyisakan angka stale
                    setValidasiForm(prev => ({
                        ...prev,
                        qtyDibeli: '',
                        qtyTerpakai: ''
                    }));
                }
            } catch (err) {
                if (!active) return;
                setError(err.message || 'Terjadi kesalahan koneksi');
                setValidasiPreview(null);
                // Reset input agar tidak menyisakan angka stale
                setValidasiForm(prev => ({
                    ...prev,
                    qtyDibeli: '',
                    qtyTerpakai: ''
                }));
            }
        };

        if (validasiForm.bahanPokokId && validasiForm.tanggal) {
            loadValidationPreview(validasiForm.bahanPokokId, validasiForm.tanggal);
        } else {
            setValidasiPreview(null);
            setValidasiForm(prev => ({
                ...prev,
                qtyDibeli: '',
                qtyTerpakai: ''
            }));
        }

        // Cleanup function untuk membatalkan penulisan state jika component unmount/input berganti
        return () => {
            active = false;
        };
    }, [validasiForm.bahanPokokId, validasiForm.tanggal]);

    const createValidasiStok = async (e) => {
        e.preventDefault();
        setError('');

        const { bahanPokokId, tanggal, qtyDibeli, qtyTerpakai, catatan } = validasiForm;

        if (!bahanPokokId) {
            setError('Bahan pokok wajib dipilih.');
            return;
        }
        if (!tanggal) {
            setError('Tanggal validasi wajib diisi.');
            return;
        }
        
        // Pengecekan presisi agar input 0 (nol) tetap dianggap valid dan tidak ter-reject
        if (qtyDibeli === undefined || qtyDibeli === null || qtyDibeli === '') {
            setError('Jumlah pembelian fisik wajib diisi.');
            return;
        }
        if (qtyTerpakai === undefined || qtyTerpakai === null || qtyTerpakai === '') {
            setError('Jumlah pemakaian fisik wajib diisi.');
            return;
        }

        const valQtyDibeli = parseFloat(qtyDibeli);
        const valQtyTerpakai = parseFloat(qtyTerpakai);

        if (isNaN(valQtyDibeli) || valQtyDibeli < 0) {
            setError('Jumlah pembelian fisik harus berupa angka non-negatif.');
            return;
        }
        if (isNaN(valQtyTerpakai) || valQtyTerpakai < 0) {
            setError('Jumlah pemakaian fisik harus berupa angka non-negatif.');
            return;
        }

        try {
            const r = await request('/akuntan/validasi-stok', {
                method: 'POST',
                body: JSON.stringify({
                    bahanPokokId,
                    tanggal,
                    qtyDibeli: valQtyDibeli,
                    qtyTerpakai: valQtyTerpakai,
                    catatan: catatan || null
                })
            });

            if (r.ok) {
                // Reset form validasi
                setValidasiForm({
                    bahanPokokId: '',
                    tanggal: '',
                    qtyDibeli: '',
                    qtyTerpakai: '',
                    catatan: ''
                });
                // Refresh list riwayat validasi stok
                loadValidasiStok();
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Gagal menyimpan Validasi Stok');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const createSaldoAwal = async (e) => {
        e.preventDefault();
        setError('');

        const { bahanPokokId, saldoAwalQty, hargaBeliAwal } = saldoAwalForm;

        if (!periodeId) {
            setError('Periode wajib dipilih.');
            return;
        }
        if (!bahanPokokId) {
            setError('Bahan pokok wajib dipilih.');
            return;
        }
        // Pengecekan presisi — 0 valid (identik dengan validasi backend === undefined)
        if (saldoAwalQty === undefined || saldoAwalQty === null || saldoAwalQty === '') {
            setError('Saldo awal qty wajib diisi.');
            return;
        }
        if (hargaBeliAwal === undefined || hargaBeliAwal === null || hargaBeliAwal === '') {
            setError('Harga beli awal wajib diisi.');
            return;
        }

        const valQty = parseFloat(saldoAwalQty);
        const valHarga = parseFloat(hargaBeliAwal);

        if (isNaN(valQty) || valQty < 0) {
            setError('Saldo awal qty harus berupa angka non-negatif.');
            return;
        }
        if (isNaN(valHarga) || valHarga < 0) {
            setError('Harga beli awal harus berupa angka non-negatif.');
            return;
        }

        try {
            const r = await request('/akuntan/saldo-awal-barang', {
                method: 'POST',
                body: JSON.stringify({
                    periodeId,
                    bahanPokokId,
                    saldoAwalQty: valQty,
                    hargaBeliAwal: valHarga
                })
            });

            if (r.ok) {
                setSaldoAwalForm({ bahanPokokId: '', saldoAwalQty: '', hargaBeliAwal: '' });
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Gagal menyimpan Saldo Awal Barang');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

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

            <hr style={{ margin: '30px 0' }} />

            {/* ================================================ */}
            {/* SECTION: MUTASI STOK                             */}
            {/* ================================================ */}
            <h3>Buat Mutasi Stok</h3>
            <form onSubmit={createMutasiStok} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}>
                <div>
                    <label>Bahan Pokok: </label>
                    <select
                        value={mutasiForm.bahanPokokId || ''}
                        onChange={e => setMutasiForm(prev => ({ ...prev, bahanPokokId: e.target.value }))}
                        required
                    >
                        <option value="">-- Pilih Bahan Pokok --</option>
                        {bahanPokokList.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.nama} ({b.satuan})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label>Tanggal: </label>
                    <input
                        type="date"
                        value={mutasiForm.tanggal || ''}
                        onChange={e => setMutasiForm(prev => ({ ...prev, tanggal: e.target.value }))}
                        required
                    />
                </div>
                <div>
                    <label>Jenis Mutasi: </label>
                    <select
                        value={mutasiForm.jenis || ''}
                        onChange={e => {
                            const val = e.target.value;
                            setMutasiForm(prev => ({
                                ...prev,
                                jenis: val,
                                supplierId: val === 'KELUAR' ? '' : prev.supplierId,
                                hargaBeli: val === 'KELUAR' ? '' : prev.hargaBeli,
                                kelompokPenerima: val === 'MASUK' ? '' : prev.kelompokPenerima
                            }));
                        }}
                        required
                    >
                        <option value="">-- Pilih Jenis --</option>
                        <option value="MASUK">MASUK</option>
                        <option value="KELUAR">KELUAR</option>
                    </select>
                </div>
                <div>
                    <label>Qty: </label>
                    <input
                        type="number"
                        step="0.001"
                        placeholder="Jumlah (Qty)"
                        value={mutasiForm.qty || ''}
                        onChange={e => setMutasiForm(prev => ({ ...prev, qty: e.target.value }))}
                        required
                    />
                </div>
                <div>
                    <label>Keterangan (opsional): </label>
                    <input
                        type="text"
                        placeholder="Catatan / Keterangan"
                        value={mutasiForm.keterangan || ''}
                        onChange={e => setMutasiForm(prev => ({ ...prev, keterangan: e.target.value }))}
                    />
                </div>

                {/* Conditional Form fields: MASUK */}
                {mutasiForm.jenis === 'MASUK' && (
                    <div style={{ border: '1px dashed #777', padding: '10px', marginTop: '10px' }}>
                        <h4>Detail Mutasi Masuk</h4>
                        <div>
                            <label>Supplier: </label>
                            <select
                                value={mutasiForm.supplierId || ''}
                                onChange={e => setMutasiForm(prev => ({ ...prev, supplierId: e.target.value }))}
                                required
                            >
                                <option value="">-- Pilih Supplier --</option>
                                {supplierList.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.nama}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label>Harga Beli: </label>
                            <input
                                type="number"
                                placeholder="Harga Beli (Rp)"
                                value={mutasiForm.hargaBeli || ''}
                                onChange={e => setMutasiForm(prev => ({ ...prev, hargaBeli: e.target.value }))}
                                required
                            />
                        </div>
                    </div>
                )}

                {/* Conditional Form fields: KELUAR */}
                {mutasiForm.jenis === 'KELUAR' && (
                    <div style={{ border: '1px dashed #777', padding: '10px', marginTop: '10px' }}>
                        <h4>Detail Mutasi Keluar</h4>
                        <div>
                            <label>Kelompok Penerima: </label>
                            <select
                                value={mutasiForm.kelompokPenerima || ''}
                                onChange={e => setMutasiForm(prev => ({ ...prev, kelompokPenerima: e.target.value }))}
                                required
                            >
                                <option value="">-- Pilih Kelompok --</option>
                                <option value="SISWA">SISWA</option>
                                <option value="B3">B3</option>
                            </select>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '10px' }}>
                    <button type="submit">Simpan Mutasi Stok</button>
                </div>
            </form>

            <h3>Daftar Mutasi Stok</h3>
            <table border="1" cellPadding="5">
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Bahan Pokok</th>
                        <th>Jenis</th>
                        <th>Qty</th>
                        <th>Supplier / Penerima</th>
                        <th>Harga Beli</th>
                        <th>Keterangan</th>
                    </tr>
                </thead>
                <tbody>
                    {mutasiStokList.map(m => (
                        <tr key={m.id}>
                            <td>{m.tanggal.split('T')[0]}</td>
                            <td>{m.bahanPokok?.nama}</td>
                            <td>{m.jenis}</td>
                            <td>{m.qty} {m.bahanPokok?.satuan}</td>
                            <td>
                                {m.jenis === 'MASUK'
                                    ? `Supplier: ${m.supplier?.nama || '—'}`
                                    : `Penerima: ${m.kelompokPenerima || '—'}`}
                            </td>
                            <td>{m.jenis === 'MASUK' && m.hargaBeli !== null ? `Rp${m.hargaBeli}` : '—'}</td>
                            <td>{m.keterangan || '—'}</td>
                        </tr>
                    ))}
                    {mutasiStokList.length === 0 && (
                        <tr>
                            <td colSpan={7} style={{ textAlign: 'center' }}>
                                Belum ada data Mutasi Stok untuk periode ini.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <hr style={{ margin: '30px 0' }} />

            {/* ================================================ */}
            {/* SECTION: VALIDASI & REKONSILIASI STOK            */}
            {/* ================================================ */}
            <h3>Validasi & Rekonsiliasi Stok Fisik</h3>
            <form onSubmit={createValidasiStok} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}>
                <div>
                    <label>Bahan Pokok: </label>
                    <select
                        value={validasiForm.bahanPokokId || ''}
                        onChange={e => setValidasiForm(prev => ({ ...prev, bahanPokokId: e.target.value }))}
                        required
                    >
                        <option value="">-- Pilih Bahan Pokok --</option>
                        {bahanPokokList.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.nama} ({b.satuan})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label>Tanggal Validasi: </label>
                    <input
                        type="date"
                        value={validasiForm.tanggal || ''}
                        onChange={e => setValidasiForm(prev => ({ ...prev, tanggal: e.target.value }))}
                        required
                    />
                </div>

                {/* Tampilan Preview Akumulasi Catatan Sistem */}
                {validasiPreview && (
                    <div style={{ border: '1px dashed #777', padding: '10px', margin: '10px 0', backgroundColor: '#f0f4f8' }}>
                        <h4>Akumulasi Catatan Sistem s.d. Tanggal Terpilih:</h4>
                        <p style={{ margin: '4px 0' }}>Total Pembelian (Sistem): <strong>{validasiPreview.qtyDibeli}</strong></p>
                        <p style={{ margin: '4px 0' }}>Total Penggunaan (Sistem): <strong>{validasiPreview.qtyTerpakai}</strong></p>
                        <p style={{ margin: '4px 0' }}>Sisa Stok (Sistem): <strong>{validasiPreview.sisaSistem}</strong></p>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                            * Kolom input fisik di bawah terisi otomatis dari data sistem untuk mempermudah pencatatan.
                        </span>
                    </div>
                )}

                <div style={{ marginTop: '10px' }}>
                    <label>Jumlah Pembelian Fisik: </label>
                    <input
                        type="number"
                        step="0.001"
                        placeholder="Qty Pembelian Fisik"
                        value={validasiForm.qtyDibeli}
                        onChange={e => setValidasiForm(prev => ({ ...prev, qtyDibeli: e.target.value }))}
                        required
                    />
                </div>
                <div>
                    <label>Jumlah Pemakaian Fisik: </label>
                    <input
                        type="number"
                        step="0.001"
                        placeholder="Qty Pemakaian Fisik"
                        value={validasiForm.qtyTerpakai}
                        onChange={e => setValidasiForm(prev => ({ ...prev, qtyTerpakai: e.target.value }))}
                        required
                    />
                </div>
                <div>
                    <label>Catatan Penyesuaian (opsional): </label>
                    <input
                        type="text"
                        placeholder="Catatan / Selisih / Stok Hilang"
                        value={validasiForm.catatan || ''}
                        onChange={e => setValidasiForm(prev => ({ ...prev, catatan: e.target.value }))}
                    />
                </div>

                <div style={{ marginTop: '10px' }}>
                    <button type="submit">Simpan Validasi Stok</button>
                </div>
            </form>

            <h3>Riwayat Validasi Stok Fisik</h3>
            <table border="1" cellPadding="5" style={{ marginBottom: '20px' }}>
                <thead>
                    <tr>
                        <th>Tanggal Validasi</th>
                        <th>Bahan Pokok</th>
                        <th>Pembelian (Fisik)</th>
                        <th>Pemakaian (Fisik)</th>
                        <th>Selisih Rekonsiliasi</th>
                        <th>Catatan</th>
                        <th>Divalidasi Oleh</th>
                        <th>Waktu Input</th>
                    </tr>
                </thead>
                <tbody>
                    {validasiList.map(v => (
                        <tr key={v.id}>
                            <td>{v.tanggal.split('T')[0]}</td>
                            <td>{v.bahanPokok?.nama}</td>
                            <td>{v.qtyDibeli}</td>
                            <td>{v.qtyTerpakai}</td>
                            <td>{v.selisih}</td>
                            <td>{v.catatan || '—'}</td>
                            <td>{v.validatedBy?.nama || v.validatedBy?.username || '—'}</td>
                            <td>{new Date(v.createdAt).toLocaleString('id-ID')}</td>
                        </tr>
                    ))}
                    {validasiList.length === 0 && (
                        <tr>
                            <td colSpan={8} style={{ textAlign: 'center' }}>
                                Belum ada riwayat validasi stok fisik.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <hr style={{ margin: '30px 0' }} />

            {/* ================================================ */}
            {/* SECTION: SALDO AWAL BARANG                       */}
            {/* ================================================ */}
            <h3>Input Saldo Awal Barang (per Periode)</h3>
            <form onSubmit={createSaldoAwal} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}>
                <div>
                    <label>Bahan Pokok: </label>
                    <select
                        value={saldoAwalForm.bahanPokokId || ''}
                        onChange={e => setSaldoAwalForm(prev => ({ ...prev, bahanPokokId: e.target.value }))}
                        required
                    >
                        <option value="">-- Pilih Bahan Pokok --</option>
                        {bahanPokokList.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.nama} ({b.satuan})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label>Saldo Awal Qty: </label>
                    <input
                        type="number"
                        step="0.001"
                        placeholder="Jumlah Stok Awal"
                        value={saldoAwalForm.saldoAwalQty}
                        onChange={e => setSaldoAwalForm(prev => ({ ...prev, saldoAwalQty: e.target.value }))}
                        required
                    />
                </div>
                <div>
                    <label>Harga Beli Awal (Rp): </label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="Harga Beli Awal"
                        value={saldoAwalForm.hargaBeliAwal}
                        onChange={e => setSaldoAwalForm(prev => ({ ...prev, hargaBeliAwal: e.target.value }))}
                        required
                    />
                </div>
                <div style={{ marginTop: '10px' }}>
                    <button type="submit">Simpan Saldo Awal</button>
                </div>
            </form>
        </div>
    );
};
