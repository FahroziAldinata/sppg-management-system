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

    useEffect(() => {
        request('/aslap/periode').then(r => r.json()).then(d => {
            setPeriods(d);
            if (d.length) setPeriodeId(d[0].id);
        });
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

    return (
        <div>
            <h2>Menu Harian</h2>
            {error && <div style={{ color: 'red' }}>{error}</div>}
            <select value={periodeId} onChange={e => setPeriodeId(e.target.value)}>
                {periods.map(p => <option key={p.id} value={p.id}>{p.tanggalMulai} - {p.tanggalSelesai}</option>)}
            </select>
            <form onSubmit={create}>
                <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} required />
                <button type="submit">Buat Menu Harian</button>
            </form>
            <table border="1" cellPadding="5">
                <thead><tr><th>Tanggal</th><th>Status</th><th>Jumlah Blok</th></tr></thead>
                <tbody>
                    {items.map(m => (
                        <tr key={m.id}>
                            <td>{m.tanggal.split('T')[0]}</td>
                            <td>{m.status}</td>
                            <td>{m.blok.length}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};