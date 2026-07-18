// frontend/src/pages/gizi/MenuHarianList.jsx
import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { DatePicker } from '../../components/DatePicker';
import Dropdown from '../../components/Dropdown';
import { NumberInput } from '../../components/NumberInput';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Table, renderStatus, renderDate } from '../../components/Table';
import { FieldButton } from '../../components/FieldButton';
import { Trash2 } from 'lucide-react';

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
    const [menuItemsByBlok, setMenuItemsByBlok] = useState({});
    const [namaMenuInput, setNamaMenuInput] = useState({});
    const [komponenInput, setKomponenInput] = useState({});
    const [bahanPokokList, setBahanPokokList] = useState([]);
    const [bahanByMenuItem, setBahanByMenuItem] = useState({});
    const [bahanForm, setBahanForm] = useState({});
    const [organoleptikByBlok, setOrganoleptikByBlok] = useState({});
    const [organoleptikForm, setOrganoleptikForm] = useState({});
    const [alergiByBlok, setAlergiByBlok] = useState({});
    const [alergiForm, setAlergiForm] = useState({});

    const [kendaraanList, setKendaraanList] = useState([]);
    const [pengirimanByMenu, setPengirimanByMenu] = useState({});
    const [pengirimanForm, setPengirimanForm] = useState({});
    const [masterMenuList, setMasterMenuList] = useState([]);

    const [activeBlokByMenu, setActiveBlokByMenu] = useState({});
    const [activeTabByBlok, setActiveTabByBlok] = useState({});
    const [selectedMenuItemByBlok, setSelectedMenuItemByBlok] = useState({});
    const [batasHargaMap, setBatasHargaMap] = useState({ KECIL: 8000, BESAR: 10000 });
    const [expandedComponents, setExpandedComponents] = useState({});
    const [expandedMenus, setExpandedMenus] = useState({});

    const KOMPONEN_OPTIONS = ['KARBOHIDRAT', 'LAUK_HEWANI', 'LAUK_NABATI', 'SAYUR', 'BUAH'];
    const KOMPONEN_LABEL = {
        KARBOHIDRAT: 'Karbohidrat',
        LAUK_HEWANI: 'Lauk Hewani',
        LAUK_NABATI: 'Lauk Nabati',
        SAYUR: 'Sayur',
        BUAH: 'Buah'
    };

    const activePeriod = periods.find(p => p.id === periodeId);
    const isEditableMenu = (menu) => menu?.status === 'DRAFT' || menu?.status === 'DITOLAK';
    const formatDate = (val) => val ? new Date(val).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-';
    const getBahanName = (bahan) => bahan.bahanPokok?.nama || bahanPokokList.find(bp => bp.id === bahan.bahanPokokId)?.nama || bahan.bahanPokokId;
    const getBahanLabel = (bp) => `${bp.nama} (${bp.satuan})`;

    const getBlokTotalHarga = (blokId) => {
        const itemsInBlok = menuItemsByBlok[blokId] || [];
        let total = 0;
        for (const item of itemsInBlok) {
            const bahanList = bahanByMenuItem[item.id] || [];
            for (const bahan of bahanList) {
                total += Number(bahan.totalHargaBahan || 0);
            }
        }
        return Math.round(total * 100) / 100;
    };

    const fieldLabel = (text) => (
        <label style={{
            textTransform: 'uppercase',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.07em',
            color: 'var(--text-muted)',
            display: 'block',
            marginBottom: 6
        }}>
            {text}
        </label>
    );

    const buttonStyle = (variant = 'primary', disabled = false) => ({
        padding: '10px 14px',
        border: variant === 'primary' ? 'none' : '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: disabled ? 'var(--bg-muted)' : (variant === 'primary' ? 'var(--btn-primary-bg)' : 'var(--bg)'),
        color: disabled ? 'var(--text-muted)' : (variant === 'primary' ? 'var(--btn-primary-text)' : 'var(--text)'),
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700,
        fontSize: 14,
        whiteSpace: 'nowrap'
    });

    const masterMenuColumns = [
        { key: 'tanggal', header: 'Tanggal', render: renderDate },
        { key: 'hari', header: 'Hari' },
        { key: 'jalur', header: 'Jalur' },
        { key: 'kelompokUmurMenu', header: 'Kelompok', render: (val) => val?.nama || '-' },
        { key: 'menuKarbohidrat', header: 'Karbohidrat', render: (val) => val || '-' },
        { key: 'menuLaukHewani', header: 'Lauk Hewani', render: (val) => val || '-' },
        { key: 'menuLaukNabati', header: 'Lauk Nabati', render: (val) => val || '-' },
        { key: 'menuSayur', header: 'Sayur', render: (val) => val || '-' },
        { key: 'menuBuah', header: 'Buah', render: (val) => val || '-' },
        {
            key: 'estimasiHargaPerPorsi',
            header: 'Estimasi / Porsi',
            align: 'right',
            render: (val, row) => val === null || val === undefined
                ? <span style={{ color: 'var(--text-muted)' }}>{row.jumlahBahanTanpaHargaPeriode || 0} bahan tanpa harga</span>
                : <strong>Rp{Number(val).toLocaleString('id-ID')}</strong>
        }
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

    useEffect(() => {
        request('/mitra/kendaraan')
            .then(r => r.json())
            .then(d => setKendaraanList(d))
            .catch(err => setError(err.message || 'Gagal memuat daftar kendaraan'));
    }, []);

    useEffect(() => {
        request('/gizi/batas-harga-porsi')
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d && d.success && d.data) {
                    const map = {};
                    d.data.forEach(item => {
                        map[item.jenisPorsi] = Number(item.batasMaksimal);
                    });
                    setBatasHargaMap(map);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!periodeId) return;
        request(`/gizi/master-menu?periodeId=${periodeId}`)
            .then(r => r.ok ? r.json() : [])
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

        const pengirimanMap = {};
        for (const p of rawPengiriman) {
            if (!pengirimanMap[p.menuHarianId]) pengirimanMap[p.menuHarianId] = [];
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

        setActiveBlokByMenu(prev => {
            const next = { ...prev };
            for (const menu of data) {
                const stillExists = menu.blok.some(blok => blok.id === next[menu.id]);
                if (!stillExists) next[menu.id] = menu.blok[0]?.id || '';
            }
            return next;
        });
        setActiveTabByBlok(prev => {
            const next = { ...prev };
            for (const menu of data) {
                for (const blok of menu.blok) {
                    if (!next[blok.id]) next[blok.id] = 'menu';
                }
            }
            return next;
        });
        setSelectedMenuItemByBlok(prev => {
            const next = { ...prev };
            for (const menu of data) {
                for (const blok of menu.blok) {
                    const blokItems = blok.menuItem || [];
                    const stillExists = blokItems.some(item => item.id === next[blok.id]);
                    if (!stillExists) next[blok.id] = blokItems[0]?.id || '';
                }
            }
            return next;
        });
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
        if (r.ok) {
            setActiveBlokByMenu(prev => ({ ...prev, [menuHarianId]: d.id }));
            load(periodeId);
        } else setError(d.error);
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
            setKomponenInput(prev => ({ ...prev, [blokId]: '' }));
            setSelectedMenuItemByBlok(prev => ({ ...prev, [blokId]: d.id }));
        } else setError(d.error);
    };

    const setBahanField = (menuItemId, field, value) => {
        setBahanForm(prev => ({ ...prev, [menuItemId]: { ...(prev[menuItemId] || {}), [field]: value } }));
    };

    const addBahan = async (menuItemId) => {
        setError('');
        const f = { ...(bahanForm[menuItemId] || {}) };
        if (f.bahanPokokId === undefined && bahanPokokList[0]) f.bahanPokokId = bahanPokokList[0].id;
        const required = ['bahanPokokId', 'beratBersihGr', 'energiKkal', 'proteinGr', 'lemakGr', 'karbohidratGr', 'seratGr', 'bddPersen', 'hargaSatuan', 'beratSatuanGr'];
        if (required.some(k => f[k] === undefined || f[k] === '')) { setError('Semua field bahan wajib diisi kecuali Berat URT'); return; }
        const r = await request('/gizi/menu-item-bahan', {
            method: 'POST',
            body: JSON.stringify({ menuItemId, ...f })
        });
        const d = await r.json();
        if (r.ok) {
            setBahanByMenuItem(prev => ({ ...prev, [menuItemId]: [...(prev[menuItemId] || []), d] }));
            setBahanForm(prev => ({ ...prev, [menuItemId]: {} }));
        } else setError(d.error);
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
        if (r.ok) setOrganoleptikByBlok(prev => ({ ...prev, [blokId]: d }));
        else setError(d.error);
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
        } else setError(d.error);
    };

    const deleteAlergi = async (blokId, alergiId) => {
        setError('');
        const r = await request(`/gizi/alergi-catatan/${alergiId}`, { method: 'DELETE' });
        if (r.ok) {
            setAlergiByBlok(prev => ({ ...prev, [blokId]: (prev[blokId] || []).filter(item => item.id !== alergiId) }));
        } else setError((await r.json()).error);
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

    const addPengiriman = async (menuHarianId) => {
        setError('');
        const form = pengirimanForm[menuHarianId] || {};
        if (!form.jenisPorsi) { setError('jenisPorsi wajib diisi'); return; }
        if (!form.kendaraanId) { setError('kendaraanId wajib diisi'); return; }
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
            setPengirimanForm(prev => ({ ...prev, [menuHarianId]: { jenisPorsi: '', kendaraanId: '', catatan: '' } }));
            load(periodeId);
        } else {
            const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
            setError(d.error || 'Terjadi kesalahan server saat menyimpan pengiriman');
        }
    };

    const deletePengiriman = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus pengiriman ini?')) return;
        const r = await request(`/gizi/pengiriman/${id}`, { method: 'DELETE' });
        if (r.ok) load(periodeId);
        else {
            const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
            setError(d.error || 'Terjadi kesalahan server saat menghapus pengiriman');
        }
    };

    const getBlokStatus = (blok) => {
        const menuItems = menuItemsByBlok[blok.id] || [];
        if (menuItems.length === 0) return { label: 'Belum ada menu', color: 'var(--text-muted)' };
        const kosongBahan = menuItems.filter(item => (bahanByMenuItem[item.id] || []).length === 0).length;
        if (kosongBahan > 0) return { label: `${kosongBahan} menu tanpa bahan`, color: 'var(--text-muted)' };
        return { label: 'Menu terisi', color: 'var(--color-success)' };
    };

    const renderBahanPanel = (blok, editable) => {
        const selectedId = selectedMenuItemByBlok[blok.id];
        const item = (menuItemsByBlok[blok.id] || []).find(menuItem => menuItem.id === selectedId);
        if (!item) {
            return <div style={{ padding: 16, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>Klik card menu item untuk mengisi bahan.</div>;
        }
        const bahanRows = bahanByMenuItem[item.id] || [];
        const form = bahanForm[item.id] || {};
        const numberFields = [
            ['beratBersihGr', 'Bersih'],
            ['bddPersen', 'BDD'],
            ['hargaSatuan', 'Harga'],
            ['beratSatuanGr', 'Basis'],
            ['energiKkal', 'Energi'],
            ['proteinGr', 'Protein'],
            ['lemakGr', 'Lemak'],
            ['karbohidratGr', 'Karbo'],
            ['seratGr', 'Serat']
        ];

        return (
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tabel bahan</div>
                        <strong>{item.namaMenu}</strong>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.komponen ? KOMPONEN_LABEL[item.komponen] : 'Tanpa komponen'}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: 1120, borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Bahan', 'Bersih', 'URT', 'BDD', 'Harga', 'Basis', 'Energi', 'Protein', 'Lemak', 'Karbo', 'Serat', 'Total'].map(label => (
                                    <th key={label} style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {bahanRows.map(bahan => (
                                <tr key={bahan.id}>
                                    <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{getBahanName(bahan)}</td>
                                    <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.beratBersihGr}</td>
                                    <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.beratURT || '-'}</td>
                                    <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.bddPersen}</td>
                                    <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.hargaSatuan}</td>
                                    <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.beratSatuanGr}</td>
                                    <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.energiKkal}</td>
                                    <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.proteinGr}</td>
                                    <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.lemakGr}</td>
                                    <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.karbohidratGr}</td>
                                    <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>{bahan.seratGr}</td>
                                    <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>Rp{Number(bahan.totalHargaBahan || 0).toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                            {editable && (
                                <tr>
                                    <td>
                                        <Dropdown
                                            style={{ minWidth: 180 }}
                                            value={form.bahanPokokId ?? bahanPokokList[0]?.id ?? ''}
                                            onChange={val => setBahanField(item.id, 'bahanPokokId', val)}
                                            options={bahanPokokList.length === 0 ? [{ value: '', label: '-- Bahan Pokok kosong --' }] : bahanPokokList.map(bp => ({ value: bp.id, label: getBahanLabel(bp) }))}
                                        />
                                    </td>
                                    <td><input className="form-field" type="number" value={form.beratBersihGr || ''} onChange={e => setBahanField(item.id, 'beratBersihGr', e.target.value)} /></td>
                                    <td><input className="form-field" value={form.beratURT || ''} onChange={e => setBahanField(item.id, 'beratURT', e.target.value)} /></td>
                                    {numberFields.slice(1).map(([field]) => (
                                        <td key={field}><input className="form-field" type="number" value={form[field] || ''} onChange={e => setBahanField(item.id, field, e.target.value)} /></td>
                                    ))}
                                    <td><button type="button" onClick={() => addBahan(item.id)} style={buttonStyle('primary')}>Tambah</button></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderMenuTab = (blok, editable) => {
        const menuItems = menuItemsByBlok[blok.id] || [];
        const tanpaKomponen = menuItems.filter(item => !item.komponen);

        const toggleComponent = (komponen, isCurrentlyExpanded) => {
            setExpandedComponents(prev => ({
                ...prev,
                [`${blok.id}-${komponen}`]: !isCurrentlyExpanded
            }));
        };

        return (
            <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
                    {KOMPONEN_OPTIONS.map(komponen => {
                        const komponenItems = menuItems.filter(item => item.komponen === komponen);
                        const isEmpty = komponenItems.length === 0;
                        const isExpanded = expandedComponents[`${blok.id}-${komponen}`] !== undefined
                            ? expandedComponents[`${blok.id}-${komponen}`]
                            : !isEmpty;

                        return (
                            <div
                                key={komponen}
                                style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--bg)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignSelf: 'start'
                                }}
                            >
                                <div
                                    onClick={() => toggleComponent(komponen, isExpanded)}
                                    style={{
                                        padding: '10px 12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        backgroundColor: 'var(--bg-elevated)',
                                        userSelect: 'none',
                                        borderBottom: isExpanded ? '1px solid var(--border)' : 'none'
                                    }}
                                >
                                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                                        {KOMPONEN_LABEL[komponen]}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {isEmpty && (
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kosong</span>
                                        )}
                                        <span style={{
                                            fontSize: 12,
                                            color: 'var(--text-muted)',
                                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s ease',
                                            display: 'inline-block'
                                        }}>
                                            ▸
                                        </span>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        maxHeight: isExpanded ? '500px' : '0px',
                                        transition: 'max-height 0.3s ease',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{ padding: 12 }}>
                                        {isEmpty ? (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Belum ada menu.</span>
                                                {editable && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setKomponenInput(prev => ({ ...prev, [blok.id]: komponen }));
                                                            toast.info(`Komponen ${KOMPONEN_LABEL[komponen]} dipilih. Silakan isi nama menu pada form di bawah.`);
                                                        }}
                                                        style={{
                                                            padding: '4px 10px',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: 'var(--radius-sm)',
                                                            backgroundColor: 'var(--bg-elevated)',
                                                            color: 'var(--text)',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        + Tambah
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gap: 8 }}>
                                                {komponenItems.map(item => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => setSelectedMenuItemByBlok(prev => ({ ...prev, [blok.id]: item.id }))}
                                                        style={{
                                                            textAlign: 'left',
                                                            padding: 10,
                                                            border: selectedMenuItemByBlok[blok.id] === item.id ? '1px solid var(--btn-primary-bg)' : '1px solid var(--border)',
                                                            borderRadius: 'var(--radius-sm)',
                                                            backgroundColor: selectedMenuItemByBlok[blok.id] === item.id ? 'rgba(59,130,246,0.08)' : 'var(--bg)',
                                                            color: 'var(--text)',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <strong>{item.namaMenu}</strong>
                                                        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{(bahanByMenuItem[item.id] || []).length} bahan</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {tanpaKomponen.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        {tanpaKomponen.map(item => (
                            <button key={item.id} type="button" onClick={() => setSelectedMenuItemByBlok(prev => ({ ...prev, [blok.id]: item.id }))} style={buttonStyle('secondary')}>
                                {item.namaMenu} - Tanpa komponen
                            </button>
                        ))}
                    </div>
                )}

                {editable && (
                    <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 220px auto', gap: 10, alignItems: 'end' }}>
                        <div>
                            {fieldLabel('Nama menu')}
                            <input className="form-field" placeholder="Contoh: Ayam Kecap" value={namaMenuInput[blok.id] || ''} onChange={e => setNamaMenuInput(prev => ({ ...prev, [blok.id]: e.target.value }))} />
                        </div>
                        <div>
                            {fieldLabel('Komponen')}
                            <Dropdown value={komponenInput[blok.id] || ''} onChange={val => setKomponenInput(prev => ({ ...prev, [blok.id]: val }))} options={[{ value: '', label: '-- Komponen (opsional) --' }, ...KOMPONEN_OPTIONS.map(k => ({ value: k, label: KOMPONEN_LABEL[k] }))]} />
                        </div>
                        <button type="button" onClick={() => addMenuItem(blok.id)} style={buttonStyle('primary')}>Tambah Menu</button>
                    </div>
                )}

                {renderBahanPanel(blok, editable)}
            </>
        );
    };

    const renderAlergiTab = (blok, editable) => (
        <div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                {(alergiByBlok[blok.id] || []).length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }}>Belum ada catatan alergi.</div>
                ) : (alergiByBlok[blok.id] || []).map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                        <div>
                            <strong>{item.jenisAlergi}</strong> - {item.jumlahSiswa} siswa
                            {item.bahanPengganti ? <span style={{ color: 'var(--text-muted)' }}> - Pengganti: {item.bahanPengganti}</span> : null}
                        </div>
                        {editable && <FieldButton onPress={() => deleteAlergi(blok.id, item.id)}><Trash2 size={14} className="text-red-600" /></FieldButton>}
                    </div>
                ))}
            </div>
            {editable && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr auto', gap: 10, alignItems: 'end' }}>
                    <div>{fieldLabel('Jenis alergi')}<input className="form-field" value={alergiForm[blok.id]?.jenisAlergi || ''} onChange={e => setAlergiField(blok.id, 'jenisAlergi', e.target.value)} /></div>
                    <div>{fieldLabel('Jumlah siswa')}<NumberInput className="form-field" value={alergiForm[blok.id]?.jumlahSiswa === '' || alergiForm[blok.id]?.jumlahSiswa === undefined ? '' : Number(alergiForm[blok.id]?.jumlahSiswa)} onChange={val => setAlergiField(blok.id, 'jumlahSiswa', val)} /></div>
                    <div>{fieldLabel('Bahan pengganti')}<input className="form-field" value={alergiForm[blok.id]?.bahanPengganti || ''} onChange={e => setAlergiField(blok.id, 'bahanPengganti', e.target.value)} /></div>
                    <button type="button" onClick={() => addAlergi(blok.id)} style={buttonStyle('primary')}>Tambah</button>
                </div>
            )}
        </div>
    );

    const renderOrganoleptikTab = (blok, editable) => {
        const current = organoleptikByBlok[blok.id];
        if (current) {
            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                    {[
                        ['Rasa', current.rasa],
                        ['Aroma', current.aroma],
                        ['Tekstur', current.tekstur],
                        ['Suhu Saji', current.suhuSaji],
                        ['Jumlah Ompreng', current.jumlahOmpreng],
                        ['Tanggal Musnah', current.tanggalMusnah ? formatDate(current.tanggalMusnah) : '-']
                    ].map(([label, value]) => (
                        <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                            <strong>{value || '-'}</strong>
                        </div>
                    ))}
                    {current.catatan && <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)' }}>{current.catatan}</div>}
                </div>
            );
        }

        if (!editable) return <div style={{ color: 'var(--text-muted)' }}>Belum ada uji organoleptik.</div>;

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr)) auto', gap: 10, alignItems: 'end' }}>
                {[
                    ['rasa', 'Rasa', 'text'],
                    ['aroma', 'Aroma', 'text'],
                    ['tekstur', 'Tekstur', 'text'],
                    ['suhuSaji', 'Suhu Saji', 'text'],
                    ['jumlahOmpreng', 'Jumlah Ompreng', 'number'],
                    ['catatan', 'Catatan', 'text']
                ].map(([field, label, type]) => (
                    <div key={field}>{fieldLabel(label)}<input className="form-field" type={type} value={organoleptikForm[blok.id]?.[field] || ''} onChange={e => setOrganoleptikField(blok.id, field, e.target.value)} /></div>
                ))}
                <button type="button" onClick={() => addOrganoleptik(blok.id)} style={buttonStyle('primary')}>Simpan Uji</button>
            </div>
        );
    };

    const renderPengiriman = (menu, editable) => {
        const usedPorsi = (pengirimanByMenu[menu.id] || []).map(p => p.jenisPorsi);
        const availableOptions = ['KECIL', 'BESAR'].filter(opt => !usedPorsi.includes(opt));
        const form = pengirimanForm[menu.id] || {};
        const aktifKendaraan = kendaraanList.filter(k => k.aktif === true);

        return (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginTop: 18 }}>
                <h4 style={{ margin: '0 0 12px 0', color: 'var(--text)' }}>Pengiriman Hari Ini</h4>
                <div style={{ display: 'grid', gap: 8, marginBottom: editable && availableOptions.length > 0 ? 14 : 0 }}>
                    {(pengirimanByMenu[menu.id] || []).length === 0 ? (
                        <div style={{ color: 'var(--text-muted)' }}>Belum ada pengiriman.</div>
                    ) : (pengirimanByMenu[menu.id] || []).map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                            <div>{p.jenisPorsi} - {p.kendaraan?.namaKendaraan || '-'}</div>
                            {editable && <FieldButton onPress={() => deletePengiriman(p.id)}><Trash2 size={14} className="text-red-600" /></FieldButton>}
                        </div>
                    ))}
                </div>
                {editable && availableOptions.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '180px 220px minmax(220px, 1fr) auto', gap: 10, alignItems: 'end' }}>
                        <div>{fieldLabel('Jenis porsi')}<Dropdown value={form.jenisPorsi || ''} onChange={val => setPengirimanForm(prev => ({ ...prev, [menu.id]: { ...(prev[menu.id] || {}), jenisPorsi: val } }))} options={[{ value: '', label: '-- Pilih --' }, ...availableOptions.map(opt => ({ value: opt, label: opt }))]} /></div>
                        <div>{fieldLabel('Kendaraan')}<Dropdown value={form.kendaraanId || ''} onChange={val => setPengirimanForm(prev => ({ ...prev, [menu.id]: { ...(prev[menu.id] || {}), kendaraanId: val } }))} options={[{ value: '', label: '-- Pilih --' }, ...aktifKendaraan.map(k => ({ value: k.id, label: k.namaKendaraan }))]} /></div>
                        <div>{fieldLabel('Catatan')}<input className="form-field" value={form.catatan || ''} onChange={e => setPengirimanForm(prev => ({ ...prev, [menu.id]: { ...(prev[menu.id] || {}), catatan: e.target.value } }))} /></div>
                        <button type="button" onClick={() => addPengiriman(menu.id)} style={buttonStyle('primary')}>Tambah</button>
                    </div>
                )}
            </div>
        );
    };

    const renderBlokWorkspace = (menu, editable) => {
        const activeBlokId = activeBlokByMenu[menu.id] || menu.blok[0]?.id || '';
        const activeBlok = menu.blok.find(blok => blok.id === activeBlokId);

        const totalBlok = activeBlok ? getBlokTotalHarga(activeBlok.id) : 0;
        const jenisPorsi = activeBlok?.kelompokUmurMenu?.kategoriPenerima?.[0]?.jenisPorsi;
        const batasMaksimal = jenisPorsi ? (batasHargaMap[jenisPorsi] || 0) : 0;
        const isOverBatas = batasMaksimal > 0 && totalBlok > batasMaksimal;
        const badgeColor = isOverBatas ? 'var(--color-danger)' : 'var(--color-success)';

        return (
            <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
                <aside style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: 'var(--bg-elevated)' }}>
                    <div style={{ padding: 14, borderBottom: '1px solid var(--border)', fontWeight: 700 }}>Kelompok Umur</div>
                    {menu.blok.length === 0 ? (
                        <div style={{ padding: 14, color: 'var(--text-muted)' }}>Belum ada blok.</div>
                    ) : menu.blok.map(blok => {
                        const status = getBlokStatus(blok);
                        const active = blok.id === activeBlokId;
                        const blokTotal = getBlokTotalHarga(blok.id);

                        if (!active) {
                            return (
                                <button
                                    key={blok.id}
                                    type="button"
                                    onClick={() => setActiveBlokByMenu(prev => ({ ...prev, [menu.id]: blok.id }))}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 14px',
                                        border: 'none',
                                        borderBottom: '1px solid var(--border)',
                                        backgroundColor: 'transparent',
                                        color: 'var(--text)',
                                        cursor: 'pointer',
                                        fontSize: 13
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontWeight: 600 }}>{blok.kelompokUmurMenu?.nama || blok.kelompokUmurMenuId}</span>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: status.color, flexShrink: 0 }} title={status.label} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rp{blokTotal.toLocaleString('id-ID')}</span>
                                        {editable && (
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteBlok(blok.id);
                                                }}
                                                style={{ color: 'var(--color-danger)', display: 'inline-flex', padding: 2 }}
                                            >
                                                <Trash2 size={12} />
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        }

                        return (
                            <div key={blok.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(59,130,246,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '12px 14px 6px 14px', alignItems: 'center' }}>
                                    <strong style={{ color: 'var(--text)', fontSize: 14 }}>{blok.kelompokUmurMenu?.nama || blok.kelompokUmurMenuId}</strong>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--btn-primary-bg)' }}>
                                            Rp{blokTotal.toLocaleString('id-ID')}
                                        </span>
                                        {editable && (
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteBlok(blok.id);
                                                }}
                                                style={{ color: 'var(--color-danger)', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={14} />
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ padding: '0 14px 12px 14px', fontSize: 12, color: status.color }}>
                                    {status.label}
                                </div>
                            </div>
                        );
                    })}
                    {editable && (
                        <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                            <Dropdown value={selectedKelompokUmurId} onChange={setSelectedKelompokUmurId} options={kelompokUmur.map(k => ({ value: k.id, label: k.nama }))} />
                            <button type="button" onClick={() => addBlok(menu.id)} style={buttonStyle('primary')}>Tambah Blok</button>
                        </div>
                    )}
                </aside>

                <main style={{ minWidth: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18, backgroundColor: 'var(--bg-elevated)' }}>
                    {!activeBlok ? (
                        <div style={{ color: 'var(--text-muted)' }}>Pilih atau tambah kelompok umur terlebih dahulu.</div>
                    ) : (
                        <>
                            <div style={{
                                position: 'sticky',
                                top: 72,
                                zIndex: 3,
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 12,
                                alignItems: 'center',
                                paddingBottom: 14,
                                marginBottom: 14,
                                borderBottom: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-elevated)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Blok aktif</div>
                                        <h4 style={{ margin: 0, color: 'var(--text)' }}>{activeBlok.kelompokUmurMenu?.nama || activeBlok.kelompokUmurMenuId}</h4>
                                    </div>
                                    {batasMaksimal > 0 && (
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '4px 10px',
                                            borderRadius: 'var(--radius-sm)',
                                            backgroundColor: isOverBatas ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            color: badgeColor,
                                            fontWeight: 700,
                                            fontSize: 13,
                                            border: `1px solid ${isOverBatas ? 'var(--color-danger)' : 'var(--color-success)'}`
                                        }}>
                                            Total: Rp{totalBlok.toLocaleString('id-ID')} / Rp{batasMaksimal.toLocaleString('id-ID')}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {[
                                        ['menu', 'Menu & Bahan'],
                                        ['alergi', 'Alergi'],
                                        ['organoleptik', 'Organoleptik']
                                    ].map(([key, label]) => (
                                        <button key={key} type="button" onClick={() => setActiveTabByBlok(prev => ({ ...prev, [activeBlok.id]: key }))} style={{ padding: '8px 12px', border: (activeTabByBlok[activeBlok.id] || 'menu') === key ? '1px solid var(--btn-primary-bg)' : '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: (activeTabByBlok[activeBlok.id] || 'menu') === key ? 'rgba(59,130,246,0.08)' : 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {(activeTabByBlok[activeBlok.id] || 'menu') === 'menu' && renderMenuTab(activeBlok, editable)}
                            {activeTabByBlok[activeBlok.id] === 'alergi' && renderAlergiTab(activeBlok, editable)}
                            {activeTabByBlok[activeBlok.id] === 'organoleptik' && renderOrganoleptikTab(activeBlok, editable)}
                        </>
                    )}
                </main>
            </div>
        );
    };

    const renderMenuHarianWorkspace = (menu) => {
        const editable = isEditableMenu(menu);
        const isDetailExpanded = expandedMenus[menu.id] !== undefined ? expandedMenus[menu.id] : true;

        return (
            <section key={menu.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow)', overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
                    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span
                            onClick={() => setExpandedMenus(prev => ({ ...prev, [menu.id]: !isDetailExpanded }))}
                            style={{
                                fontSize: 16,
                                cursor: 'pointer',
                                userSelect: 'none',
                                color: 'var(--text-muted)',
                                transform: isDetailExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                                display: 'inline-block',
                                paddingRight: 6
                            }}
                        >
                            ▸
                        </span>
                        <div>{fieldLabel('Periode')}<strong>{activePeriod ? `${activePeriod.tanggalMulai.split('T')[0]} - ${activePeriod.tanggalSelesai.split('T')[0]}` : '-'}</strong></div>
                        <div>{fieldLabel('Tanggal')}<strong>{formatDate(menu.tanggal)}</strong></div>
                        <div>{fieldLabel('Status')}{renderStatus(menu.status)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" disabled={!editable} onClick={() => toast.success('Draft tersimpan melalui setiap aksi tambah/simpan.')} style={buttonStyle('secondary', !editable)}>Simpan Draft</button>
                        <button type="button" disabled={!editable} onClick={() => triggerAjukanMenu(menu.id)} style={buttonStyle('primary', !editable)}>Ajukan</button>
                    </div>
                </div>
                <div
                    style={{
                        maxHeight: isDetailExpanded ? '5000px' : '0px',
                        transition: 'max-height 0.4s ease-in-out',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{ padding: 18 }}>
                        {!editable && (
                            <div style={{ marginBottom: 14, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
                                Mode baca saja. Menu dengan status {menu.status} tidak dapat diubah oleh Ahli Gizi.
                            </div>
                        )}
                        {renderBlokWorkspace(menu, editable)}
                        {renderPengiriman(menu, editable)}
                    </div>
                </div>
            </section>
        );
    };

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: 20 }}>Menu Harian</h2>
            {error && (
                <div style={{ color: 'var(--color-danger)', margin: '10px 0', padding: 8, border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                    {error}
                </div>
            )}

            <section style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20, backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow)', marginBottom: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) minmax(280px, 520px)', gap: 20, alignItems: 'end' }}>
                    <div>
                        {fieldLabel('Pilih Periode Aktif')}
                        <Dropdown value={periodeId} onChange={setPeriodeId} options={periods.map(p => ({ value: p.id, label: `${p.tanggalMulai.split('T')[0]} - ${p.tanggalSelesai.split('T')[0]}` }))} />
                    </div>
                    <form onSubmit={create} style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
                        <div style={{ flex: 1 }}>
                            {fieldLabel('Pilih Tanggal Menu Harian')}
                            <DatePicker value={tanggal} onChange={setTanggal} defaultFocusMonth={activePeriod?.tanggalMulai} required />
                        </div>
                        <button type="submit" style={buttonStyle('primary')}>Buat Menu Harian</button>
                    </form>
                </div>
            </section>

            <section style={{ border: '1px solid var(--border)', padding: 24, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow)', marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 20px 0', color: 'var(--text)' }}>Master Menu Mingguan (Referensi)</h3>
                <Table columns={masterMenuColumns} data={masterMenuList} emptyText="Belum ada histori menu disetujui untuk periode ini." />
            </section>

            <section>
                <h3 style={{ margin: '0 0 16px 0', color: 'var(--text)' }}>Input Menu Harian Aktual</h3>
                {items.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                        Belum ada menu harian untuk periode ini.
                    </div>
                ) : items.map(renderMenuHarianWorkspace)}
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
