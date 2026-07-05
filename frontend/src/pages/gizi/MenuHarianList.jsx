// frontend/src/pages/gizi/MenuHarianList.jsx
import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

export const MenuHarianList = () => {
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

    const load = async (pid) => {
        if (!pid) return;
        const r = await request(`/gizi/menu-harian?periodeId=${pid}`);
        if (r.ok) setItems(await r.json());
        else setError((await r.json()).error);
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

    // TODO: MenuItem gak persist ke GET /menu-harian, backend include blm nyantol menuItem — nunggu keputusan tim backend.
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
            <table border="1" cellPadding="5">
                <thead><tr><th>Tanggal</th><th>Status</th><th>Jumlah Blok</th><th>Aksi</th></tr></thead>
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
                                        </li>
                                    ))}
                                </ul>
                            </td>
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