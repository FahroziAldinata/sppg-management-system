import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

export const SaldoAwalBarangPage = () => {
    const { request } = useApi();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [bahanPokokList, setBahanPokokList] = useState([]);
    const [saldoAwalList, setSaldoAwalList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [saldoAwalForm, setSaldoAwalForm] = useState({
        bahanPokokId: '',
        saldoAwalQty: '',
        hargaBeliAwal: ''
    });

    // Fetch periods & materials on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => setError('Gagal memuat daftar periode.'));

        request('/mitra/bahan-pokok')
            .then(r => r.json())
            .then(d => setBahanPokokList(d))
            .catch(() => {});
    }, []);

    const loadSaldoAwalList = async (pid) => {
        if (!pid) return;
        setLoading(true);
        setError('');
        try {
            const r = await request(`/akuntan/saldo-awal-barang?periodeId=${pid}`);
            if (r.ok) {
                setSaldoAwalList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat riwayat saldo awal' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setLoading(false);
        }
    };

    // Load initial stock list when period changes
    useEffect(() => {
        if (periodeId) {
            loadSaldoAwalList(periodeId);
        }
    }, [periodeId]);

    const handleCreateSaldoAwal = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const { bahanPokokId, saldoAwalQty, hargaBeliAwal } = saldoAwalForm;

        if (!periodeId) {
            setError('Periode wajib dipilih.');
            return;
        }
        if (!bahanPokokId) {
            setError('Bahan pokok wajib dipilih.');
            return;
        }
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    periodeId,
                    bahanPokokId,
                    saldoAwalQty: valQty,
                    hargaBeliAwal: valHarga
                })
            });

            if (r.ok) {
                setSuccess('Saldo Awal Barang berhasil disimpan.');
                setSaldoAwalForm({ bahanPokokId: '', saldoAwalQty: '', hargaBeliAwal: '' });
                loadSaldoAwalList(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Gagal menyimpan Saldo Awal Barang');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    return (
        <div>
            <h2>Input Saldo Awal Barang (Persediaan Awal)</h2>
            {error && <div style={{ color: 'red', marginBottom: '10px', padding: '8px', border: '1px solid red' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '10px', padding: '8px', border: '1px solid green' }}>{success}</div>}

            {/* Pilihan Periode */}
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

            {/* Form Saldo Awal */}
            <h3>Input Saldo Awal Barang (per Periode)</h3>
            <form onSubmit={handleCreateSaldoAwal} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Bahan Pokok: </label>
                    <select
                        value={saldoAwalForm.bahanPokokId}
                        onChange={e => setSaldoAwalForm(prev => ({ ...prev, bahanPokokId: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '5px' }}
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
                    <label style={{ display: 'block', marginBottom: '3px' }}>Saldo Awal Qty: </label>
                    <input
                        type="number"
                        step="0.001"
                        placeholder="Jumlah Stok Awal"
                        value={saldoAwalForm.saldoAwalQty}
                        onChange={e => setSaldoAwalForm(prev => ({ ...prev, saldoAwalQty: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Harga Beli Awal (Rp): </label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="Harga Beli Awal"
                        value={saldoAwalForm.hargaBeliAwal}
                        onChange={e => setSaldoAwalForm(prev => ({ ...prev, hargaBeliAwal: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>
                <div style={{ marginTop: '10px' }}>
                    <button type="submit" style={{ padding: '6px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        Simpan Saldo Awal
                    </button>
                </div>
            </form>

            {/* List Saldo Awal */}
            <h3>Daftar Saldo Awal Barang Terdaftar</h3>
            {loading && <p>Memuat daftar saldo awal...</p>}
            {!loading && (
                <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th>Nama Bahan Pokok</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Satuan</th>
                            <th style={{ textAlign: 'right' }}>Saldo Awal (Qty)</th>
                            <th style={{ textAlign: 'right' }}>Harga Beli Awal</th>
                            <th style={{ textAlign: 'right' }}>Total Nilai Saldo Awal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {saldoAwalList.map(s => {
                            const totalNilai = s.saldoAwalQty * s.hargaBeliAwal;
                            return (
                                <tr key={s.id}>
                                    <td>{s.bahanPokok ? s.bahanPokok.nama : '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{s.bahanPokok ? s.bahanPokok.satuan : '—'}</td>
                                    <td style={{ textAlign: 'right' }}>{Number(s.saldoAwalQty).toLocaleString('id-ID')}</td>
                                    <td style={{ textAlign: 'right' }}>Rp{Number(s.hargaBeliAwal).toLocaleString('id-ID')}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Rp{totalNilai.toLocaleString('id-ID')}</td>
                                </tr>
                            );
                        })}
                        {saldoAwalList.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '10px' }}>
                                    Belum ada data saldo awal barang untuk periode ini.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};
