// frontend/src/pages/gizi/MenuHarianList.jsx
import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { DatePicker } from '../../components/DatePicker';
import Dropdown from '../../components/Dropdown';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Table, renderStatus, renderDate } from '../../components/Table';
import { FieldButton } from '../../components/FieldButton';
import { Pencil, Trash2, Plus } from 'lucide-react';

export const MenuHarianPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [items, setItems] = useState([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingMenuId, setPendingMenuId] = useState(null);
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

    const kendaraanColumns = [
        { key: 'namaKendaraan', header: 'Nama' },
        { key: 'platNomor', header: 'Plat Nomor', render: (val) => val || '—' },
        {
            key: 'aktif',
            header: 'Aktif',
            render: (val) => renderStatus(val ? 'AKTIF' : 'PENDING', val ? 'Ya' : 'Tidak')
        },
        {
            key: 'aksi',
            header: 'Aksi',
            render: (_, row) => (
                <div style={{ display: 'flex', gap: 4 }}>
                    <FieldButton onPress={() => handleEditKendaraan(row)}>
                        <Pencil size={14} />
                    </FieldButton>
                    <FieldButton onPress={() => handleHapusKendaraan(row.id)}>
                        <Trash2 size={14} className="text-red-600" />
                    </FieldButton>
                </div>
            )
        }
    ];

    const masterMenuColumns = [
        { key: 'jalur', header: 'Jalur' },
        { key: 'hari', header: 'Hari' },
        { key: 'menuKarbohidrat', header: 'Karbohidrat' },
        { key: 'menuLaukHewani', header: 'Lauk Hewani' },
        { key: 'menuLaukNabati', header: 'Lauk Nabati' },
        { key: 'menuSayur', header: 'Sayur' },
        { key: 'menuBuah', header: 'Buah' }
    ];

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
            .catch(() => { });
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

    const triggerAjukanMenu = (id) => {
        setPendingMenuId(id);
        setConfirmOpen(true);
    };

    const handleAjukanMenu = async () => {
        if (!pendingMenuId) return;
        setConfirmOpen(false);
        try {
            const r = await request(`/gizi/menu-harian/${pendingMenuId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'DIAJUKAN' })
            });
            if (r.ok) {
                toast.success('Menu Harian berhasil diajukan ke Kepala SPPG.');
                load(periodeId);
            } else {
                const err = await r.json().catch(() => ({ error: 'Gagal mengajukan Menu Harian' }));
                toast.error(err.error || 'Gagal mengajukan Menu Harian');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setPendingMenuId(null);
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

    const renderBlokKolom = (m) => (
        <ul>
            {m.blok.map(b => (
                <li key={b.id}>
                    {b.kelompokUmurMenu.nama}
                    <FieldButton onPress={() => deleteBlok(b.id)}>
                        <Trash2 size={14} className="text-red-600" />
                    </FieldButton>
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
                                    <Dropdown
                                        style={{ width: '100%', marginBottom: '6px' }}
                                        value={bahanForm[item.id]?.bahanPokokId ?? bahanPokokList[0]?.id ?? ''}
                                        onChange={val => setBahanField(item.id, 'bahanPokokId', val)}
                                        options={bahanPokokList.length === 0
                                            ? [{ value: '', label: '-- Bahan Pokok kosong, cek fetch --' }]
                                            : bahanPokokList.map(bp => ({ value: bp.id, label: `${bp.nama} (${bp.satuan})` }))
                                        }
                                    />
                                    <input className="form-field" placeholder="Berat Bersih (g)" type="number" value={bahanForm[item.id]?.beratBersihGr || ''} onChange={e => setBahanField(item.id, 'beratBersihGr', e.target.value)} />
                                    <input className="form-field" placeholder="Berat URT (opsional)" value={bahanForm[item.id]?.beratURT || ''} onChange={e => setBahanField(item.id, 'beratURT', e.target.value)} />
                                    <input className="form-field" placeholder="BDD % (1-100)" type="number" value={bahanForm[item.id]?.bddPersen || ''} onChange={e => setBahanField(item.id, 'bddPersen', e.target.value)} />
                                    <input className="form-field" placeholder="Harga Satuan" type="number" value={bahanForm[item.id]?.hargaSatuan || ''} onChange={e => setBahanField(item.id, 'hargaSatuan', e.target.value)} />
                                    <input className="form-field" placeholder="Berat Satuan (g)" type="number" value={bahanForm[item.id]?.beratSatuanGr || ''} onChange={e => setBahanField(item.id, 'beratSatuanGr', e.target.value)} />
                                    <input className="form-field" placeholder="Energi (kkal)" type="number" value={bahanForm[item.id]?.energiKkal || ''} onChange={e => setBahanField(item.id, 'energiKkal', e.target.value)} />
                                    <input className="form-field" placeholder="Protein (g)" type="number" value={bahanForm[item.id]?.proteinGr || ''} onChange={e => setBahanField(item.id, 'proteinGr', e.target.value)} />
                                    <input className="form-field" placeholder="Lemak (g)" type="number" value={bahanForm[item.id]?.lemakGr || ''} onChange={e => setBahanField(item.id, 'lemakGr', e.target.value)} />
                                    <input className="form-field" placeholder="Karbohidrat (g)" type="number" value={bahanForm[item.id]?.karbohidratGr || ''} onChange={e => setBahanField(item.id, 'karbohidratGr', e.target.value)} />
                                    <input className="form-field" placeholder="Serat (g)" type="number" value={bahanForm[item.id]?.seratGr || ''} onChange={e => setBahanField(item.id, 'seratGr', e.target.value)} />
                                    <button onClick={() => addBahan(item.id)}>Tambah Bahan</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <input
                        className="form-field"
                        placeholder="Nama menu"
                        value={namaMenuInput[b.id] || ''}
                        onChange={e => setNamaMenuInput(prev => ({ ...prev, [b.id]: e.target.value }))}
                    />
                    <Dropdown
                        style={{ width: '100%', marginTop: '6px', marginBottom: '6px' }}
                        value={komponenInput[b.id] || ''}
                        onChange={val => setKomponenInput(prev => ({ ...prev, [b.id]: val }))}
                        options={[
                            { value: '', label: '-- Komponen (opsional) --' },
                            ...KOMPONEN_OPTIONS.map(k => ({ value: k, label: k })),
                        ]}
                    />
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
                                <input className="form-field" placeholder="Rasa" value={organoleptikForm[b.id]?.rasa || ''} onChange={e => setOrganoleptikField(b.id, 'rasa', e.target.value)} />
                                <input className="form-field" placeholder="Aroma" value={organoleptikForm[b.id]?.aroma || ''} onChange={e => setOrganoleptikField(b.id, 'aroma', e.target.value)} />
                                <input className="form-field" placeholder="Tekstur" value={organoleptikForm[b.id]?.tekstur || ''} onChange={e => setOrganoleptikField(b.id, 'tekstur', e.target.value)} />
                                <input className="form-field" placeholder="Suhu Saji" value={organoleptikForm[b.id]?.suhuSaji || ''} onChange={e => setOrganoleptikField(b.id, 'suhuSaji', e.target.value)} />
                                <input className="form-field" placeholder="Jumlah Ompreng (default 1)" type="number" value={organoleptikForm[b.id]?.jumlahOmpreng || ''} onChange={e => setOrganoleptikField(b.id, 'jumlahOmpreng', e.target.value)} />
                                <input className="form-field" placeholder="Catatan (opsional)" value={organoleptikForm[b.id]?.catatan || ''} onChange={e => setOrganoleptikField(b.id, 'catatan', e.target.value)} />
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
                                    <FieldButton onPress={() => deleteAlergi(b.id, item.id)}>
                                        <Trash2 size={14} className="text-red-600" />
                                    </FieldButton>
                                </li>
                            ))}
                        </ul>
                        <input className="form-field" placeholder="Jenis Alergi" value={alergiForm[b.id]?.jenisAlergi || ''} onChange={e => setAlergiField(b.id, 'jenisAlergi', e.target.value)} />
                        <input className="form-field" placeholder="Jumlah Siswa" type="number" value={alergiForm[b.id]?.jumlahSiswa || ''} onChange={e => setAlergiField(b.id, 'jumlahSiswa', e.target.value)} />
                        <input className="form-field" placeholder="Bahan Pengganti (opsional)" value={alergiForm[b.id]?.bahanPengganti || ''} onChange={e => setAlergiField(b.id, 'bahanPengganti', e.target.value)} />
                        <button onClick={() => addAlergi(b.id)}>Tambah Alergi</button>
                    </div>
                </li>
            ))}
        </ul>
    );

    const renderPengirimanKolom = (m) => {
        const usedPorsi = (pengirimanByMenu[m.id] || []).map(p => p.jenisPorsi);
        const availableOptions = ['KECIL', 'BESAR'].filter(opt => !usedPorsi.includes(opt));
        const form = pengirimanForm[m.id] || {};
        const aktifKendaraan = kendaraanList.filter(k => k.aktif === true);

        return (
            <>
                <ul>
                    {(pengirimanByMenu[m.id] || []).map(p => (
                        <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {p.jenisPorsi} — {p.kendaraan?.namaKendaraan || '—'}
                            <FieldButton onPress={() => deletePengiriman(p.id, m.id)}>
                                <Trash2 size={14} className="text-red-600" />
                            </FieldButton>
                        </li>
                    ))}
                </ul>
                {availableOptions.length > 0 && (
                    <div>
                        <Dropdown
                            style={{ width: '100%', marginBottom: '6px', marginTop: '6px' }}
                            value={form.jenisPorsi || ''}
                            onChange={val => setPengirimanForm(prev => ({
                                ...prev,
                                [m.id]: { ...(prev[m.id] || {}), jenisPorsi: val }
                            }))}
                            options={[
                                { value: '', label: '-- Pilih Jenis Porsi --' },
                                ...availableOptions.map(opt => ({ value: opt, label: opt })),
                            ]}
                        />
                        <Dropdown
                            style={{ width: '100%', marginBottom: '6px' }}
                            value={form.kendaraanId || ''}
                            onChange={val => setPengirimanForm(prev => ({
                                ...prev,
                                [m.id]: { ...(prev[m.id] || {}), kendaraanId: val }
                            }))}
                            options={[
                                { value: '', label: '-- Pilih Kendaraan --' },
                                ...aktifKendaraan.map(k => ({ value: k.id, label: k.namaKendaraan })),
                            ]}
                        />
                        <input
                            className="form-field"
                            placeholder="Catatan (opsional)"
                            value={form.catatan || ''}
                            onChange={e => setPengirimanForm(prev => ({
                                ...prev,
                                [m.id]: { ...(prev[m.id] || {}), catatan: e.target.value }
                            }))}
                        />
                        <FieldButton onPress={() => addPengiriman(m.id)} style={{ marginTop: '12px' }} title="Tambah Pengiriman">
                            Tambah
                        </FieldButton>
                    </div>
                )}
            </>
        );
    };

    const renderAksiKolom = (m) => (
        <>
            <Dropdown
                style={{ width: '100%', marginBottom: '6px' }}
                value={selectedKelompokUmurId}
                onChange={setSelectedKelompokUmurId}
                options={kelompokUmur.map(k => ({ value: k.id, label: k.nama }))}
            />
            <FieldButton onPress={() => addBlok(m.id)} style={{ marginBottom: '6px' }}>
                + Blok
            </FieldButton>
            {(m.status === 'DRAFT' || m.status === 'DITOLAK') && (
                <button
                    onClick={() => triggerAjukanMenu(m.id)}
                    style={{
                        display: 'block',
                        marginTop: '8px',
                        padding: '5px 12px',
                        backgroundColor: 'var(--btn-primary-bg)',
                        color: 'var(--btn-primary-text)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '12px'
                    }}
                >
                    Ajukan
                </button>
            )}
        </>
    );

    const itemsColumns = [
        { key: 'tanggal', header: 'Tanggal', render: (val) => renderDate(val?.split?.('T')[0] ?? val) },
        { key: 'status', header: 'Status', render: (val) => renderStatus(val) },
        { key: 'blok', header: 'Jumlah Blok', render: (_, row) => renderBlokKolom(row) },
        { key: 'pengiriman', header: 'Pengiriman', render: (_, row) => renderPengirimanKolom(row) },
        { key: 'aksi', header: 'Aksi', render: (_, row) => renderAksiKolom(row) },
    ];

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Menu Harian</h2>
            {error && (
                <div style={{
                    color: 'var(--color-danger)',
                    margin: '10px 0',
                    padding: '8px',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)'
                }}>
                    {error}
                </div>
            )}

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
                    Pilih Periode Aktif
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

            <form onSubmit={create} style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-end',
                marginBottom: '30px',
                maxWidth: '500px'
            }}>
                <div style={{ flex: 1 }}>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Pilih Tanggal Menu Harian
                    </label>
                    <DatePicker
                        value={tanggal}
                        onChange={setTanggal}
                        required
                    />
                </div>
                <button type="submit" style={{
                    padding: '10px 20px',
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    height: '42px'
                }}>
                    Buat Menu Harian
                </button>
            </form>

            {/* ================================================ */}
            {/* SECTION 1 — MANAJEMEN KENDARAAN (render 1x saja) */}
            {/* ================================================ */}
            <section style={{
                border: '1px solid var(--border)',
                padding: '24px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px'
            }}>
                <h3 style={{ margin: '0 0 20px 0', color: 'var(--text)' }}>Manajemen Kendaraan</h3>

                {/* Form Tambah / Edit */}
                <form onSubmit={editingKendaraan ? updateKendaraan : addKendaraan} style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    backgroundColor: 'var(--bg-elevated)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                        {editingKendaraan ? 'Edit Kendaraan' : 'Tambah Kendaraan Baru'}
                    </h4>

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
                                Nama Kendaraan
                            </label>
                            <input
                                className="form-field"
                                placeholder="Nama Kendaraan"
                                value={kendaraanForm.namaKendaraan}
                                onChange={e => setKendaraanForm(prev => ({ ...prev, namaKendaraan: e.target.value }))}
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
                                Plat Nomor (opsional)
                            </label>
                            <input
                                className="form-field"
                                placeholder="Plat Nomor (opsional)"
                                value={kendaraanForm.platNomor}
                                onChange={e => setKendaraanForm(prev => ({ ...prev, platNomor: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: 'var(--text)'
                        }}>
                            <input
                                type="checkbox"
                                checked={kendaraanForm.aktif}
                                onChange={e => setKendaraanForm(prev => ({ ...prev, aktif: e.target.checked }))}
                                style={{ cursor: 'pointer' }}
                            />
                            Kendaraan Aktif
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
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
                            {editingKendaraan ? 'Simpan Perubahan' : 'Tambah Kendaraan'}
                        </button>
                        {editingKendaraan && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingKendaraan(null);
                                    setKendaraanForm({ namaKendaraan: '', platNomor: '', aktif: true });
                                }}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-cancel-bg)',
                                    border: '1px solid var(--btn-cancel-border)',
                                    color: 'var(--btn-cancel-text)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '14px'
                                }}
                            >
                                Batal
                            </button>
                        )}
                    </div>
                </form>

                {/* Daftar semua kendaraan — tanpa filter aktif */}
                <Table
                    columns={kendaraanColumns}
                    data={kendaraanList}
                    emptyText="Belum ada kendaraan terdaftar."
                />
            </section>

            {/* ================================================ */}
            {/* SECTION 3 — MASTER MENU MINGGUAN (REFERENSI)     */}
            {/* ================================================ */}
            <section style={{
                border: '1px solid var(--border)',
                padding: '24px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px'
            }}>
                <h3 style={{ margin: '0 0 20px 0', color: 'var(--text)' }}>Master Menu Mingguan (Referensi)</h3>

                {/* Form Tambah Master Menu */}
                <form onSubmit={addMasterMenu} style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    backgroundColor: 'var(--bg-elevated)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                        Tambah Master Menu
                    </h4>

                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 120px' }}>
                            <label style={{
                                textTransform: 'uppercase',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--text-muted)',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Jalur
                            </label>
                            <Dropdown
                                style={{ width: '100%' }}
                                value={masterMenuForm.jalur}
                                onChange={val => setMasterMenuForm(prev => ({ ...prev, jalur: val }))}
                                options={[
                                    { value: 'SISWA', label: 'SISWA' },
                                    { value: 'TIGA_B', label: 'TIGA_B' },
                                ]}
                            />
                        </div>

                        <div style={{ flex: '1 1 120px' }}>
                            <label style={{
                                textTransform: 'uppercase',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--text-muted)',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Hari
                            </label>
                            <Dropdown
                                style={{ width: '100%' }}
                                value={masterMenuForm.hari}
                                onChange={val => setMasterMenuForm(prev => ({ ...prev, hari: val }))}
                                options={[
                                    { value: 'SENIN', label: 'SENIN' },
                                    { value: 'SELASA', label: 'SELASA' },
                                    { value: 'RABU', label: 'RABU' },
                                    { value: 'KAMIS', label: 'KAMIS' },
                                    { value: 'JUMAT', label: 'JUMAT' },
                                    { value: 'SABTU', label: 'SABTU' },
                                ]}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                        <div>
                            <label style={{
                                textTransform: 'uppercase',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--text-muted)',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Menu Karbohidrat
                            </label>
                            <input
                                className="form-field"
                                placeholder="Menu Karbohidrat"
                                value={masterMenuForm.menuKarbohidrat}
                                onChange={e => setMasterMenuForm(prev => ({ ...prev, menuKarbohidrat: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label style={{
                                textTransform: 'uppercase',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--text-muted)',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Menu Lauk Hewani
                            </label>
                            <input
                                className="form-field"
                                placeholder="Menu Lauk Hewani"
                                value={masterMenuForm.menuLaukHewani}
                                onChange={e => setMasterMenuForm(prev => ({ ...prev, menuLaukHewani: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label style={{
                                textTransform: 'uppercase',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--text-muted)',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Menu Lauk Nabati
                            </label>
                            <input
                                className="form-field"
                                placeholder="Menu Lauk Nabati"
                                value={masterMenuForm.menuLaukNabati}
                                onChange={e => setMasterMenuForm(prev => ({ ...prev, menuLaukNabati: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label style={{
                                textTransform: 'uppercase',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--text-muted)',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Menu Sayur
                            </label>
                            <input
                                className="form-field"
                                placeholder="Menu Sayur"
                                value={masterMenuForm.menuSayur}
                                onChange={e => setMasterMenuForm(prev => ({ ...prev, menuSayur: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label style={{
                                textTransform: 'uppercase',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--text-muted)',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Menu Buah
                            </label>
                            <input
                                className="form-field"
                                placeholder="Menu Buah"
                                value={masterMenuForm.menuBuah}
                                onChange={e => setMasterMenuForm(prev => ({ ...prev, menuBuah: e.target.value }))}
                                required
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
                            Tambah Master Menu
                        </button>
                    </div>
                </form>

                {/* Tabel Read-only Daftar Master Menu */}
                <Table
                    columns={masterMenuColumns}
                    data={masterMenuList}
                    emptyText="Belum ada data master menu untuk periode ini."
                />
            </section>

            {/* ============================================== */}
            {/* SECTION 2 — TABEL MENU HARIAN                 */}
            {/* ============================================== */}
            <section style={{
                border: '1px solid var(--border)',
                padding: '24px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px'
            }}>
                <h3 style={{ margin: '0 0 20px 0', color: 'var(--text)' }}>Master Menu Harian</h3>
                <Table columns={itemsColumns} data={items} />
            </section>
            <ConfirmDialog
                open={confirmOpen}
                title="Konfirmasi Pengajuan"
                message="Ajukan Menu Harian ini ke Kepala SPPG untuk persetujuan?"
                onConfirm={handleAjukanMenu}
                onCancel={() => {
                    setConfirmOpen(false);
                    setPendingMenuId(null);
                }}
            />
        </div>
    );
};