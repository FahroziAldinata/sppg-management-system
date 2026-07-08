// frontend/src/pages/gizi/MenuHarianList.jsx
import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

export const MenuHarianPage = () => {
    const { request } = useApi();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [items, setItems] = useState([]);
    const [tanggal, setTanggal] = useState('');
    const [error, setError] = useState('');
    const [kelompokUmur, setKelompokUmur] = useState([]);
    const [selectedKelompokUmurId, setSelectedKelompokUmurId] = useState('');
    const [menuItemsByBlok, setMenuItemsByBlok] = useState({}); // { [blokId]: [item, ...] }
    const [namaMenuInput, setNamaMenuInput] = useState({}); // { [blokId]: string }
    const [komponenInput, setKomponenInput] = useState({}); // { [blokId]: string }
    const [bahanPokokList, setBahanPokokList] = useState([]);
    const [bahanByMenuItem, setBahanByMenuItem] = useState({}); // { [menuItemId]: [bahan,...] }
    const [bahanForm, setBahanForm] = useState({}); // { [menuItemId]: { field: value } }
    const [organoleptikByBlok, setOrganoleptikByBlok] = useState({}); // { [blokId]: data }
    const [organoleptikForm, setOrganoleptikForm] = useState({}); // { [blokId]: { field: value } }
    const [alergiByBlok, setAlergiByBlok] = useState({}); // { [blokId]: [item, ...] }
    const [alergiForm, setAlergiForm] = useState({}); // { [blokId]: { field: value } }
    // Kendaraan & Pengiriman state
    const [kendaraanList, setKendaraanList] = useState([]);
    const [pengirimanByMenu, setPengirimanByMenu] = useState({}); // { [menuHarianId]: [...] }
    const [pengirimanForm, setPengirimanForm] = useState({}); // { [menuHarianId]: { jenisPorsi, kendaraanId, catatan } }
    const [kendaraanForm, setKendaraanForm] = useState({ namaKendaraan: '', platNomor: '', aktif: true });
    const [editingKendaraan, setEditingKendaraan] = useState(null); // null = mode tambah, object = mode edit
    // State Master Menu
    const [masterMenuList, setMasterMenuList] = useState([]);
    const [masterMenuForm, setMasterMenuForm] = useState({
        jalur: 'SISWA',
        hari: 'SENIN',
        menuKarbohidrat: '',
        menuLaukHewani: '',
        menuLaukNabati: '',
        menuSayur: '',
        menuBuah: ''
    });

    const KOMPONEN_OPTIONS = ["KARBOHIDRAT", "LAUK_HEWANI", "LAUK_NABATI", "SAYUR", "BUAH"];
    const BAHAN_FIELDS = ['bahanPokokId', 'beratBersihGr', 'beratURT', 'energiKkal', 'proteinGr', 'lemakGr', 'karbohidratGr', 'seratGr', 'bddPersen', 'hargaSatuan', 'beratSatuanGr'];

    useEffect(() => {
        request('/aslap/periode').then(r => r.json()).then(d => {
            setPeriods(d);
            if (d.length) setPeriodeId(d[0].id);
        });
    }, []);

    useEffect(() => {
        request('/gizi/kelompok-umur-menu').then(r => r.json()).then(d => {
            setKelompokUmur(d);
            if (d.length) setSelectedKelompokUmurId(d[0].id);
        });
    }, []);

    useEffect(() => {
        request('/mitra/bahan-pokok').then(r => r.json()).then(d => setBahanPokokList(d));
    }, []);

    // Fetch kendaraan once on mount (global master data, not tied to periodeId)
    useEffect(() => {
        request('/gizi/kendaraan')
            .then(r => r.json())
            .then(d => setKendaraanList(d))
            .catch(err => setError(err.message || 'Gagal memuat daftar kendaraan'));
    }, []);

    // Fetch Master Menu list saat periodeId berubah
    useEffect(() => {
        if (!periodeId) return;
        request(`/gizi/master-menu?periodeId=${periodeId}`)
            .then(r => {
                if (r.ok) return r.json();
                return [];
            })
            .then(d => setMasterMenuList(d))
            .catch(() => {});
    }, [periodeId]);

    const load = async (pid) => {
        if (!pid) return;
        const [rMenu, rPengiriman] = await Promise.all([
            request(`/gizi/menu-harian?periodeId=${pid}`),
            request('/gizi/pengiriman')
        ]);

        if (!rMenu.ok) { setError((await rMenu.json()).error); return; }
        if (!rPengiriman.ok) { setError((await rPengiriman.json()).error); return; }

        const data = await rMenu.json();
        const rawPengiriman = await rPengiriman.json();
        setItems(data);

        // Group pengiriman by menuHarianId
        const pengirimanMap = {};
        for (const p of rawPengiriman) {
            if (!pengirimanMap[p.menuHarianId]) {
                pengirimanMap[p.menuHarianId] = [];
            }
            pengirimanMap[p.menuHarianId].push(p);
        }
        setPengirimanByMenu(pengirimanMap);

        const orgMap = {};
        const alergiMap = {};
        const menuItemMap = {};
        const bahanMap = {};
        for (const menu of data) {
            for (const blok of menu.blok) {
                if (blok.organoleptik) orgMap[blok.id] = blok.organoleptik;
                alergiMap[blok.id] = blok.alergi || [];
                menuItemMap[blok.id] = blok.menuItem || [];
                for (const item of (blok.menuItem || [])) {
                    bahanMap[item.id] = item.bahan || [];
                }
            }
        }
        setOrganoleptikByBlok(orgMap);
        setAlergiByBlok(alergiMap);
        setMenuItemsByBlok(menuItemMap);
        setBahanByMenuItem(bahanMap);
    };

    useEffect(() => { load(periodeId); }, [periodeId]);

    const create = async (e) => {
        e.preventDefault();
        setError('');
        const r = await request('/gizi/menu-harian', {
            method: 'POST',
            body: JSON.stringify({ periodeId, tanggal })
        });
        const d = await r.json();
        if (r.ok) { setTanggal(''); load(periodeId); }
        else setError(d.error);
    };

    const addBlok = async (menuHarianId) => {
        setError('');
        const r = await request('/gizi/menu-harian-blok', {
            method: 'POST',
            body: JSON.stringify({ menuHarianId, kelompokUmurMenuId: selectedKelompokUmurId })
        });
        const d = await r.json();
        if (r.ok) load(periodeId);
        else setError(d.error);
    };

    const deleteBlok = async (blokId) => {
        setError('');
        const r = await request(`/gizi/menu-harian-blok/${blokId}`, { method: 'DELETE' });
        if (r.ok) load(periodeId);
        else setError((await r.json()).error);
    };

    const addMenuItem = async (blokId) => {
        setError('');
        const namaMenu = namaMenuInput[blokId];
        if (!namaMenu) { setError('namaMenu wajib diisi'); return; }
        const r = await request('/gizi/menu-item', {
            method: 'POST',
            body: JSON.stringify({ blokId, namaMenu, komponen: komponenInput[blokId] || undefined })
        });
        const d = await r.json();
        if (r.ok) {
            setMenuItemsByBlok(prev => ({ ...prev, [blokId]: [...(prev[blokId] || []), d] }));
            setNamaMenuInput(prev => ({ ...prev, [blokId]: '' }));
        } else {
            setError(d.error);
        }
    };

    const setBahanField = (menuItemId, field, value) => {
        setBahanForm(prev => ({ ...prev, [menuItemId]: { ...(prev[menuItemId] || {}), [field]: value } }));
    };

    const addBahan = async (menuItemId) => {
        setError('');
        const f = { ...(bahanForm[menuItemId] || {}) };
        if (f.bahanPokokId === undefined && bahanPokokList[0]) f.bahanPokokId = bahanPokokList[0].id;
        const required = ['bahanPokokId', 'beratBersihGr', 'energiKkal', 'proteinGr', 'lemakGr', 'karbohidratGr', 'seratGr', 'bddPersen', 'hargaSatuan', 'beratSatuanGr'];
        if (required.some(k => f[k] === undefined || f[k] === '')) { setError('Semua field wajib diisi (kecuali Berat URT)'); return; }
        const r = await request('/gizi/menu-item-bahan', {
            method: 'POST',
            body: JSON.stringify({ menuItemId, ...f })
        });
        const d = await r.json();
        if (r.ok) {
            setBahanByMenuItem(prev => ({ ...prev, [menuItemId]: [...(prev[menuItemId] || []), d] }));
            setBahanForm(prev => ({ ...prev, [menuItemId]: {} }));
        } else {
            setError(d.error);
        }
    };

    const setOrganoleptikField = (blokId, field, value) => {
        setOrganoleptikForm(prev => ({ ...prev, [blokId]: { ...(prev[blokId] || {}), [field]: value } }));
    };

    const addOrganoleptik = async (blokId) => {
        setError('');
        const f = organoleptikForm[blokId] || {};
        if (!f.rasa || !f.aroma || !f.tekstur || !f.suhuSaji) {
            setError('Rasa, aroma, tekstur, suhuSaji wajib diisi');
            return;
        }
        const r = await request('/gizi/menu-organoleptik', {
            method: 'POST',
            body: JSON.stringify({
                blokId,
                rasa: f.rasa,
                aroma: f.aroma,
                tekstur: f.tekstur,
                suhuSaji: f.suhuSaji,
                catatan: f.catatan || undefined,
                jumlahOmpreng: f.jumlahOmpreng || undefined
            })
        });
        const d = await r.json();
        if (r.ok) {
            setOrganoleptikByBlok(prev => ({ ...prev, [blokId]: d }));
        } else {
            setError(d.error);
        }
    };

    const setAlergiField = (blokId, field, value) => {
        setAlergiForm(prev => ({ ...prev, [blokId]: { ...(prev[blokId] || {}), [field]: value } }));
    };

    const addAlergi = async (blokId) => {
        setError('');
        const f = alergiForm[blokId] || {};
        if (!f.jenisAlergi || f.jumlahSiswa === undefined || f.jumlahSiswa === '') {
            setError('jenisAlergi dan jumlahSiswa wajib diisi');
            return;
        }
        const cleanJumlah = parseInt(f.jumlahSiswa, 10);
        if (isNaN(cleanJumlah) || cleanJumlah < 0) {
            setError('jumlahSiswa harus berupa bilangan bulat non-negatif');
            return;
        }
        const r = await request('/gizi/alergi-catatan', {
            method: 'POST',
            body: JSON.stringify({
                blokId,
                jenisAlergi: f.jenisAlergi,
                jumlahSiswa: cleanJumlah,
                bahanPengganti: f.bahanPengganti || undefined
            })
        });
        const d = await r.json();
        if (r.ok) {
            setAlergiByBlok(prev => ({ ...prev, [blokId]: [...(prev[blokId] || []), d] }));
            setAlergiForm(prev => ({ ...prev, [blokId]: {} }));
        } else {
            setError(d.error);
        }
    };

    const deleteAlergi = async (blokId, alergiId) => {
        setError('');
        const r = await request(`/gizi/alergi-catatan/${alergiId}`, { method: 'DELETE' });
        if (r.ok) {
            setAlergiByBlok(prev => ({
                ...prev,
                [blokId]: (prev[blokId] || []).filter(item => item.id !== alergiId)
            }));
        } else {
            setError((await r.json()).error);
        }
    };

    // ==========================================
    // CRUD KENDARAAN
    // ==========================================

    const addKendaraan = async (e) => {
        e.preventDefault();
        setError('');
        if (!kendaraanForm.namaKendaraan) {
            setError('Nama kendaraan wajib diisi');
            return;
        }
        try {
            const r = await request('/gizi/kendaraan', {
                method: 'POST',
                body: JSON.stringify({
                    namaKendaraan: kendaraanForm.namaKendaraan,
                    platNomor: kendaraanForm.platNomor || undefined,
                    aktif: kendaraanForm.aktif !== undefined ? kendaraanForm.aktif : true
                })
            });
            if (r.ok) {
                const rList = await request('/gizi/kendaraan');
                if (rList.ok) setKendaraanList(await rList.json());
                setKendaraanForm({ namaKendaraan: '', platNomor: '', aktif: true });
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Terjadi kesalahan server saat menyimpan kendaraan');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const updateKendaraan = async (e) => {
        e.preventDefault();
        setError('');
        if (!editingKendaraan || !editingKendaraan.id) {
            setError('Tidak ada kendaraan yang sedang diedit');
            return;
        }
        if (!kendaraanForm.namaKendaraan) {
            setError('Nama kendaraan wajib diisi');
            return;
        }
        try {
            const r = await request(`/gizi/kendaraan/${editingKendaraan.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    namaKendaraan: kendaraanForm.namaKendaraan,
                    platNomor: kendaraanForm.platNomor || undefined,
                    aktif: kendaraanForm.aktif !== undefined ? kendaraanForm.aktif : true
                })
            });
            if (r.ok) {
                const rList = await request('/gizi/kendaraan');
                if (rList.ok) setKendaraanList(await rList.json());
                setEditingKendaraan(null);
                setKendaraanForm({ namaKendaraan: '', platNomor: '', aktif: true });
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Terjadi kesalahan server saat memperbarui kendaraan');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const startEditKendaraan = (k) => {
        setError('');
        setEditingKendaraan(k);
        setKendaraanForm({
            namaKendaraan: k.namaKendaraan || '',
            platNomor: k.platNomor || '',
            aktif: k.aktif !== undefined ? k.aktif : true
        });
    };

    const deleteKendaraan = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus kendaraan ini?')) return;
        setError('');
        try {
            const r = await request(`/gizi/kendaraan/${id}`, { method: 'DELETE' });
            if (r.ok) {
                const rList = await request('/gizi/kendaraan');
                if (rList.ok) setKendaraanList(await rList.json());
                if (editingKendaraan && editingKendaraan.id === id) {
                    setEditingKendaraan(null);
                    setKendaraanForm({ namaKendaraan: '', platNomor: '', aktif: true });
                }
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Terjadi kesalahan server saat menghapus kendaraan');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // ==========================================
    // CRUD PENGIRIMAN HARIAN
    // ==========================================

    const addPengiriman = async (menuHarianId) => {
        setError('');
        const form = pengirimanForm[menuHarianId] || {};
        if (!form.jenisPorsi) {
            setError('jenisPorsi wajib diisi');
            return;
        }
        if (!form.kendaraanId) {
            setError('kendaraanId wajib diisi');
            return;
        }
        try {
            const r = await request('/gizi/pengiriman', {
                method: 'POST',
                body: JSON.stringify({
                    menuHarianId,
                    jenisPorsi: form.jenisPorsi,
                    kendaraanId: form.kendaraanId,
                    catatan: form.catatan || undefined
                })
            });
            if (r.ok) {
                const rPengiriman = await request('/gizi/pengiriman');
                if (rPengiriman.ok) {
                    const rawPengiriman = await rPengiriman.json();
                    const pengirimanMap = {};
                    for (const p of rawPengiriman) {
                        if (!pengirimanMap[p.menuHarianId]) {
                            pengirimanMap[p.menuHarianId] = [];
                        }
                        pengirimanMap[p.menuHarianId].push(p);
                    }
                    setPengirimanByMenu(pengirimanMap);
                }
                setPengirimanForm(prev => ({
                    ...prev,
                    [menuHarianId]: { jenisPorsi: '', kendaraanId: '', catatan: '' }
                }));
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Terjadi kesalahan server saat menyimpan pengiriman');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const deletePengiriman = async (id, menuHarianId) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus pengiriman ini?')) return;
        setError('');
        try {
            const r = await request(`/gizi/pengiriman/${id}`, { method: 'DELETE' });
            if (r.ok) {
                const rPengiriman = await request('/gizi/pengiriman');
                if (rPengiriman.ok) {
                    const rawPengiriman = await rPengiriman.json();
                    const pengirimanMap = {};
                    for (const p of rawPengiriman) {
                        if (!pengirimanMap[p.menuHarianId]) {
                            pengirimanMap[p.menuHarianId] = [];
                        }
                        pengirimanMap[p.menuHarianId].push(p);
                    }
                    setPengirimanByMenu(pengirimanMap);
                }
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Terjadi kesalahan server saat menghapus pengiriman');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    // ==========================================
    // MASTER MENU MINGGUAN
    // ==========================================

    const addMasterMenu = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!periodeId) {
            setError('Periode tidak valid. Silakan pilih periode terlebih dahulu.');
            return;
        }

        const {
            jalur,
            hari,
            menuKarbohidrat,
            menuLaukHewani,
            menuLaukNabati,
            menuSayur,
            menuBuah
        } = masterMenuForm;

        // Validasi frontend sebelum request
        if (!jalur || !hari || !menuKarbohidrat || !menuLaukHewani || !menuLaukNabati || !menuSayur || !menuBuah) {
            setError('Semua field wajib diisi.');
            return;
        }

        try {
            const r = await request('/gizi/master-menu', {
                method: 'POST',
                body: JSON.stringify({
                    periodeId,
                    jalur,
                    hari,
                    menuKarbohidrat,
                    menuLaukHewani,
                    menuLaukNabati,
                    menuSayur,
                    menuBuah
                })
            });

            if (r.ok) {
                // Refresh list master menu berdasarkan periodeId yang sedang aktif
                const rList = await request(`/gizi/master-menu?periodeId=${periodeId}`);
                if (rList.ok) {
                    setMasterMenuList(await rList.json());
                }
                // Reset form (kembalikan menu ke string kosong, pertahankan default jalur/hari)
                setMasterMenuForm({
                    jalur: 'SISWA',
                    hari: 'SENIN',
                    menuKarbohidrat: '',
                    menuLaukHewani: '',
                    menuLaukNabati: '',
                    menuSayur: '',
                    menuBuah: ''
                });
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Terjadi kesalahan server saat menyimpan master menu');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    return (
        <div>
            <h2>Menu Harian</h2>
            {error && <div style={{ color: 'red' }}>{error}</div>}
            <select value={periodeId} onChange={e => setPeriodeId(e.target.value)}>
                {periods.map(p => <option key={p.id} value={p.id}>{p.tanggalMulai.split('T')[0]} - {p.tanggalSelesai.split('T')[0]}</option>)}
            </select>
            <form onSubmit={create}>
                <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} required />
                <button type="submit">Buat Menu Harian</button>
            </form>

            {/* ================================================ */}
            {/* SECTION 1 — MANAJEMEN KENDARAAN (render 1x saja) */}
            {/* ================================================ */}
            <section style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '15px' }}>
                <h3>Manajemen Kendaraan</h3>

                {/* Form Tambah / Edit */}
                <form onSubmit={editingKendaraan ? updateKendaraan : addKendaraan}>
                    <input
                        placeholder="Nama Kendaraan"
                        value={kendaraanForm.namaKendaraan}
                        onChange={e => setKendaraanForm(prev => ({ ...prev, namaKendaraan: e.target.value }))}
                        required
                    />
                    <input
                        placeholder="Plat Nomor (opsional)"
                        value={kendaraanForm.platNomor}
                        onChange={e => setKendaraanForm(prev => ({ ...prev, platNomor: e.target.value }))}
                    />
                    <label>
                        <input
                            type="checkbox"
                            checked={kendaraanForm.aktif}
                            onChange={e => setKendaraanForm(prev => ({ ...prev, aktif: e.target.checked }))}
                        />
                        {' '}Aktif
                    </label>
                    <button type="submit">
                        {editingKendaraan ? 'Simpan Perubahan' : 'Tambah Kendaraan'}
                    </button>
                    {editingKendaraan && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingKendaraan(null);
                                setKendaraanForm({ namaKendaraan: '', platNomor: '', aktif: true });
                            }}
                        >
                            Batal
                        </button>
                    )}
                </form>

                {/* Daftar semua kendaraan — tanpa filter aktif */}
                <table border="1" cellPadding="4" style={{ marginTop: '8px' }}>
                    <thead>
                        <tr>
                            <th>Nama</th>
                            <th>Plat Nomor</th>
                            <th>Aktif</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {kendaraanList.map(k => (
                            <tr key={k.id}>
                                <td>{k.namaKendaraan}</td>
                                <td>{k.platNomor || '—'}</td>
                                <td>{k.aktif ? 'Ya' : 'Tidak'}</td>
                                <td>
                                    <button onClick={() => startEditKendaraan(k)}>Edit</button>
                                    {' '}
                                    <button onClick={() => deleteKendaraan(k.id)}>Hapus</button>
                                </td>
                            </tr>
                        ))}
                        {kendaraanList.length === 0 && (
                            <tr>
                                <td colSpan={4}>Belum ada kendaraan terdaftar.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>

            {/* ================================================ */}
            {/* SECTION 3 — MASTER MENU MINGGUAN (REFERENSI)     */}
            {/* ================================================ */}
            <section style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '15px' }}>
                <h3>Master Menu Mingguan (Referensi)</h3>

                {/* Form Tambah Master Menu */}
                <form onSubmit={addMasterMenu}>
                    <select
                        value={masterMenuForm.jalur}
                        onChange={e => setMasterMenuForm(prev => ({ ...prev, jalur: e.target.value }))}
                        required
                    >
                        <option value="SISWA">SISWA</option>
                        <option value="TIGA_B">TIGA_B</option>
                    </select>

                    <select
                        value={masterMenuForm.hari}
                        onChange={e => setMasterMenuForm(prev => ({ ...prev, hari: e.target.value }))}
                        required
                    >
                        <option value="SENIN">SENIN</option>
                        <option value="SELASA">SELASA</option>
                        <option value="RABU">RABU</option>
                        <option value="KAMIS">KAMIS</option>
                        <option value="JUMAT">JUMAT</option>
                        <option value="SABTU">SABTU</option>
                    </select>

                    <input
                        placeholder="Menu Karbohidrat"
                        value={masterMenuForm.menuKarbohidrat}
                        onChange={e => setMasterMenuForm(prev => ({ ...prev, menuKarbohidrat: e.target.value }))}
                        required
                    />
                    <input
                        placeholder="Menu Lauk Hewani"
                        value={masterMenuForm.menuLaukHewani}
                        onChange={e => setMasterMenuForm(prev => ({ ...prev, menuLaukHewani: e.target.value }))}
                        required
                    />
                    <input
                        placeholder="Menu Lauk Nabati"
                        value={masterMenuForm.menuLaukNabati}
                        onChange={e => setMasterMenuForm(prev => ({ ...prev, menuLaukNabati: e.target.value }))}
                        required
                    />
                    <input
                        placeholder="Menu Sayur"
                        value={masterMenuForm.menuSayur}
                        onChange={e => setMasterMenuForm(prev => ({ ...prev, menuSayur: e.target.value }))}
                        required
                    />
                    <input
                        placeholder="Menu Buah"
                        value={masterMenuForm.menuBuah}
                        onChange={e => setMasterMenuForm(prev => ({ ...prev, menuBuah: e.target.value }))}
                        required
                    />

                    <button type="submit">Tambah Master Menu</button>
                </form>

                {/* Tabel Read-only Daftar Master Menu */}
                <table border="1" cellPadding="4" style={{ marginTop: '8px', width: '100%' }}>
                    <thead>
                        <tr>
                            <th>Jalur</th>
                            <th>Hari</th>
                            <th>Karbohidrat</th>
                            <th>Lauk Hewani</th>
                            <th>Lauk Nabati</th>
                            <th>Sayur</th>
                            <th>Buah</th>
                        </tr>
                    </thead>
                    <tbody>
                        {masterMenuList.map(m => (
                            <tr key={m.id}>
                                <td>{m.jalur}</td>
                                <td>{m.hari}</td>
                                <td>{m.menuKarbohidrat}</td>
                                <td>{m.menuLaukHewani}</td>
                                <td>{m.menuLaukNabati}</td>
                                <td>{m.menuSayur}</td>
                                <td>{m.menuBuah}</td>
                            </tr>
                        ))}
                        {masterMenuList.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center' }}>
                                    Belum ada data master menu untuk periode ini.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>

            {/* ============================================== */}
            {/* SECTION 2 — TABEL MENU HARIAN                 */}
            {/* ============================================== */}
            <table border="1" cellPadding="5">
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Status</th>
                        <th>Jumlah Blok</th>
                        <th>Pengiriman</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(m => (
                        <tr key={m.id}>
                            <td>{m.tanggal.split('T')[0]}</td>
                            <td>{m.status}</td>
                            <td>
                                <ul>
                                    {m.blok.map(b => (
                                        <li key={b.id}>
                                            {b.kelompokUmurMenu.nama}
                                            <button onClick={() => deleteBlok(b.id)}>Hapus</button>
                                            <ul>
                                                {(menuItemsByBlok[b.id] || []).map(item => (
                                                    <li key={item.id}>
                                                        {item.namaMenu} ({item.komponen || '-'})
                                                        <ul>
                                                            {(bahanByMenuItem[item.id] || []).map(bahan => {
                                                                const namaBahan = bahan.bahanPokok?.nama || bahanPokokList.find(bp => bp.id === bahan.bahanPokokId)?.nama || bahan.bahanPokokId;
                                                                return (
                                                                    <li key={bahan.id}>
                                                                        {namaBahan} — bersih {bahan.beratBersihGr}g, kotor {bahan.beratKotorGr}g, total Rp{bahan.totalHargaBahan}
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                        <div>
                                                            <select value={bahanForm[item.id]?.bahanPokokId ?? bahanPokokList[0]?.id ?? ''} onChange={e => setBahanField(item.id, 'bahanPokokId', e.target.value)}>
                                                                {bahanPokokList.length === 0 && <option value="">-- Bahan Pokok kosong, cek fetch --</option>}
                                                                {bahanPokokList.map(bp => <option key={bp.id} value={bp.id}>{bp.nama} ({bp.satuan})</option>)}
                                                            </select>
                                                            <input placeholder="Berat Bersih (g)" type="number" value={bahanForm[item.id]?.beratBersihGr || ''} onChange={e => setBahanField(item.id, 'beratBersihGr', e.target.value)} />
                                                            <input placeholder="Berat URT (opsional)" value={bahanForm[item.id]?.beratURT || ''} onChange={e => setBahanField(item.id, 'beratURT', e.target.value)} />
                                                            <input placeholder="BDD % (1-100)" type="number" value={bahanForm[item.id]?.bddPersen || ''} onChange={e => setBahanField(item.id, 'bddPersen', e.target.value)} />
                                                            <input placeholder="Harga Satuan" type="number" value={bahanForm[item.id]?.hargaSatuan || ''} onChange={e => setBahanField(item.id, 'hargaSatuan', e.target.value)} />
                                                            <input placeholder="Berat Satuan (g)" type="number" value={bahanForm[item.id]?.beratSatuanGr || ''} onChange={e => setBahanField(item.id, 'beratSatuanGr', e.target.value)} />
                                                            <input placeholder="Energi (kkal)" type="number" value={bahanForm[item.id]?.energiKkal || ''} onChange={e => setBahanField(item.id, 'energiKkal', e.target.value)} />
                                                            <input placeholder="Protein (g)" type="number" value={bahanForm[item.id]?.proteinGr || ''} onChange={e => setBahanField(item.id, 'proteinGr', e.target.value)} />
                                                            <input placeholder="Lemak (g)" type="number" value={bahanForm[item.id]?.lemakGr || ''} onChange={e => setBahanField(item.id, 'lemakGr', e.target.value)} />
                                                            <input placeholder="Karbohidrat (g)" type="number" value={bahanForm[item.id]?.karbohidratGr || ''} onChange={e => setBahanField(item.id, 'karbohidratGr', e.target.value)} />
                                                            <input placeholder="Serat (g)" type="number" value={bahanForm[item.id]?.seratGr || ''} onChange={e => setBahanField(item.id, 'seratGr', e.target.value)} />
                                                            <button onClick={() => addBahan(item.id)}>Tambah Bahan</button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                            <input
                                                placeholder="Nama menu"
                                                value={namaMenuInput[b.id] || ''}
                                                onChange={e => setNamaMenuInput(prev => ({ ...prev, [b.id]: e.target.value }))}
                                            />
                                            <select
                                                value={komponenInput[b.id] || ''}
                                                onChange={e => setKomponenInput(prev => ({ ...prev, [b.id]: e.target.value }))}
                                            >
                                                <option value="">-- Komponen (opsional) --</option>
                                                {KOMPONEN_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                                            </select>
                                            <button onClick={() => addMenuItem(b.id)}>Tambah Menu Item</button>
                                            <div style={{ border: '1px dashed gray', margin: '5px 0', padding: '5px' }}>
                                                <strong>Uji Organoleptik</strong>
                                                {organoleptikByBlok[b.id] ? (
                                                    <div>
                                                        Rasa: {organoleptikByBlok[b.id].rasa}, Aroma: {organoleptikByBlok[b.id].aroma}, Tekstur: {organoleptikByBlok[b.id].tekstur}, Suhu: {organoleptikByBlok[b.id].suhuSaji}
                                                        <br />
                                                        Ompreng: {organoleptikByBlok[b.id].jumlahOmpreng}, Musnah: {new Date(organoleptikByBlok[b.id].tanggalMusnah).toLocaleDateString('id-ID')} (chiller 3 hari)
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <input placeholder="Rasa" value={organoleptikForm[b.id]?.rasa || ''} onChange={e => setOrganoleptikField(b.id, 'rasa', e.target.value)} />
                                                        <input placeholder="Aroma" value={organoleptikForm[b.id]?.aroma || ''} onChange={e => setOrganoleptikField(b.id, 'aroma', e.target.value)} />
                                                        <input placeholder="Tekstur" value={organoleptikForm[b.id]?.tekstur || ''} onChange={e => setOrganoleptikField(b.id, 'tekstur', e.target.value)} />
                                                        <input placeholder="Suhu Saji" value={organoleptikForm[b.id]?.suhuSaji || ''} onChange={e => setOrganoleptikField(b.id, 'suhuSaji', e.target.value)} />
                                                        <input placeholder="Jumlah Ompreng (default 1)" type="number" value={organoleptikForm[b.id]?.jumlahOmpreng || ''} onChange={e => setOrganoleptikField(b.id, 'jumlahOmpreng', e.target.value)} />
                                                        <input placeholder="Catatan (opsional)" value={organoleptikForm[b.id]?.catatan || ''} onChange={e => setOrganoleptikField(b.id, 'catatan', e.target.value)} />
                                                        <button onClick={() => addOrganoleptik(b.id)}>Simpan Uji Organoleptik</button>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ border: '1px dashed gray', margin: '5px 0', padding: '5px' }}>
                                                <strong>Catatan Alergi</strong>
                                                <ul>
                                                    {(alergiByBlok[b.id] || []).map(item => (
                                                        <li key={item.id}>
                                                            {item.jenisAlergi} — {item.jumlahSiswa} siswa
                                                            {item.bahanPengganti ? ` (pengganti: ${item.bahanPengganti})` : ''}
                                                            <button onClick={() => deleteAlergi(b.id, item.id)}>Hapus</button>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <input placeholder="Jenis Alergi" value={alergiForm[b.id]?.jenisAlergi || ''} onChange={e => setAlergiField(b.id, 'jenisAlergi', e.target.value)} />
                                                <input placeholder="Jumlah Siswa" type="number" value={alergiForm[b.id]?.jumlahSiswa || ''} onChange={e => setAlergiField(b.id, 'jumlahSiswa', e.target.value)} />
                                                <input placeholder="Bahan Pengganti (opsional)" value={alergiForm[b.id]?.bahanPengganti || ''} onChange={e => setAlergiField(b.id, 'bahanPengganti', e.target.value)} />
                                                <button onClick={() => addAlergi(b.id)}>Tambah Alergi</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </td>

                            {/* ===== KOLOM PENGIRIMAN (new) ===== */}
                            <td>
                                {/* List pengiriman existing */}
                                <ul>
                                    {(pengirimanByMenu[m.id] || []).map(p => (
                                        <li key={p.id}>
                                            {p.jenisPorsi} — {p.kendaraan?.namaKendaraan || '—'}
                                            {' '}
                                            <button onClick={() => deletePengiriman(p.id, m.id)}>Hapus</button>
                                        </li>
                                    ))}
                                </ul>

                                {/* Form tambah baru — hanya render kalau masih ada slot porsi */}
                                {(() => {
                                    const usedPorsi = (pengirimanByMenu[m.id] || []).map(p => p.jenisPorsi);
                                    const availableOptions = ['KECIL', 'BESAR'].filter(opt => !usedPorsi.includes(opt));
                                    if (availableOptions.length === 0) return null;

                                    const form = pengirimanForm[m.id] || {};
                                    const aktifKendaraan = kendaraanList.filter(k => k.aktif === true);

                                    return (
                                        <div>
                                            <select
                                                value={form.jenisPorsi || ''}
                                                onChange={e => setPengirimanForm(prev => ({
                                                    ...prev,
                                                    [m.id]: { ...(prev[m.id] || {}), jenisPorsi: e.target.value }
                                                }))}
                                            >
                                                <option value="">-- Pilih Jenis Porsi --</option>
                                                {availableOptions.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={form.kendaraanId || ''}
                                                onChange={e => setPengirimanForm(prev => ({
                                                    ...prev,
                                                    [m.id]: { ...(prev[m.id] || {}), kendaraanId: e.target.value }
                                                }))}
                                            >
                                                <option value="">-- Pilih Kendaraan --</option>
                                                {aktifKendaraan.map(k => (
                                                    <option key={k.id} value={k.id}>{k.namaKendaraan}</option>
                                                ))}
                                            </select>
                                            <input
                                                placeholder="Catatan (opsional)"
                                                value={form.catatan || ''}
                                                onChange={e => setPengirimanForm(prev => ({
                                                    ...prev,
                                                    [m.id]: { ...(prev[m.id] || {}), catatan: e.target.value }
                                                }))}
                                            />
                                            <button onClick={() => addPengiriman(m.id)}>Tambah</button>
                                        </div>
                                    );
                                })()}
                            </td>

                            {/* ===== KOLOM AKSI ===== */}
                            <td>
                                <select value={selectedKelompokUmurId} onChange={e => setSelectedKelompokUmurId(e.target.value)}>
                                    {kelompokUmur.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                                <button onClick={() => addBlok(m.id)}>Tambah Blok</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};