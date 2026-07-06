import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

export const MutasiStokPage = () => {
    const { request } = useApi();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [supplierList, setSupplierList] = useState([]);
    const [bahanPokokList, setBahanPokokList] = useState([]);
    const [mutasiStokList, setMutasiStokList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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

    // Fetch periods, suppliers, materials on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => setError('Gagal memuat daftar periode.'));

        request('/akuntan/supplier')
            .then(r => r.json())
            .then(d => setSupplierList(d))
            .catch(() => {});

        request('/mitra/bahan-pokok')
            .then(r => r.json())
            .then(d => setBahanPokokList(d))
            .catch(() => {});
    }, []);

    const loadMutasiStok = async (pid) => {
        if (!pid) return;
        setLoading(true);
        setError('');
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
        } finally {
            setLoading(false);
        }
    };

    // Load mutations when period changes
    useEffect(() => {
        if (periodeId) {
            loadMutasiStok(periodeId);
        }
    }, [periodeId]);

    const handleCreateMutasi = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (r.ok) {
                setSuccess('Mutasi Stok berhasil disimpan.');
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

    return (
        <div>
            <h2>Pencatatan Mutasi Stok Gudang (Masuk / Keluar)</h2>
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

            {/* Form Mutasi */}
            <h3>Buat Mutasi Stok</h3>
            <form onSubmit={handleCreateMutasi} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Bahan Pokok: </label>
                    <select
                        value={mutasiForm.bahanPokokId}
                        onChange={e => setMutasiForm(prev => ({ ...prev, bahanPokokId: e.target.value }))}
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
                    <label style={{ display: 'block', marginBottom: '3px' }}>Tanggal: </label>
                    <input
                        type="date"
                        value={mutasiForm.tanggal}
                        onChange={e => setMutasiForm(prev => ({ ...prev, tanggal: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Jenis Mutasi: </label>
                    <select
                        value={mutasiForm.jenis}
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
                        style={{ width: '100%', padding: '5px' }}
                    >
                        <option value="">-- Pilih Jenis --</option>
                        <option value="MASUK">MASUK (Barang Datang / PO)</option>
                        <option value="KELUAR">KELUAR (Penggunaan Dapur)</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Jumlah (Qty): </label>
                    <input
                        type="number"
                        step="0.001"
                        placeholder="Jumlah (Qty)"
                        value={mutasiForm.qty}
                        onChange={e => setMutasiForm(prev => ({ ...prev, qty: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Keterangan (opsional): </label>
                    <input
                        type="text"
                        placeholder="Catatan / Keterangan"
                        value={mutasiForm.keterangan}
                        onChange={e => setMutasiForm(prev => ({ ...prev, keterangan: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>

                {/* Conditional Form fields: MASUK */}
                {mutasiForm.jenis === 'MASUK' && (
                    <div style={{ border: '1px dashed #777', padding: '10px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h4 style={{ margin: '0 0 5px 0' }}>Detail Mutasi Masuk</h4>
                        <div>
                            <label style={{ display: 'block', marginBottom: '3px' }}>Supplier: </label>
                            <select
                                value={mutasiForm.supplierId}
                                onChange={e => setMutasiForm(prev => ({ ...prev, supplierId: e.target.value }))}
                                required
                                style={{ width: '100%', padding: '5px' }}
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
                            <label style={{ display: 'block', marginBottom: '3px' }}>Harga Beli (Rp): </label>
                            <input
                                type="number"
                                placeholder="Harga Beli"
                                value={mutasiForm.hargaBeli}
                                onChange={e => setMutasiForm(prev => ({ ...prev, hargaBeli: e.target.value }))}
                                required
                                style={{ width: '100%', padding: '5px' }}
                            />
                        </div>
                    </div>
                )}

                {/* Conditional Form fields: KELUAR */}
                {mutasiForm.jenis === 'KELUAR' && (
                    <div style={{ border: '1px dashed #777', padding: '10px', marginTop: '10px' }}>
                        <h4 style={{ margin: '0 0 5px 0' }}>Detail Mutasi Keluar</h4>
                        <div>
                            <label style={{ display: 'block', marginBottom: '3px' }}>Kelompok Penerima: </label>
                            <select
                                value={mutasiForm.kelompokPenerima}
                                onChange={e => setMutasiForm(prev => ({ ...prev, kelompokPenerima: e.target.value }))}
                                required
                                style={{ width: '100%', padding: '5px' }}
                            >
                                <option value="">-- Pilih Kelompok --</option>
                                <option value="SISWA">SISWA</option>
                                <option value="B3">B3 (Pendidik/Masyarakat)</option>
                            </select>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '10px' }}>
                    <button type="submit" style={{ padding: '6px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        Simpan Mutasi Stok
                    </button>
                </div>
            </form>

            {/* List Mutasi */}
            <h3>Daftar Mutasi Stok</h3>
            {loading && <p>Memuat riwayat mutasi...</p>}
            {!loading && (
                <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th>Tanggal</th>
                            <th>Bahan Pokok</th>
                            <th>Jenis</th>
                            <th style={{ textAlign: 'right' }}>Qty</th>
                            <th>Supplier / Penerima</th>
                            <th style={{ textAlign: 'right' }}>Harga Beli</th>
                            <th>Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mutasiStokList.map(m => (
                            <tr key={m.id}>
                                <td>{m.tanggal.split('T')[0]}</td>
                                <td>{m.bahanPokok?.nama}</td>
                                <td style={{ fontWeight: 'bold', color: m.jenis === 'MASUK' ? 'green' : 'red' }}>{m.jenis}</td>
                                <td style={{ textAlign: 'right' }}>{Number(m.qty).toLocaleString('id-ID')} {m.bahanPokok?.satuan}</td>
                                <td>
                                    {m.jenis === 'MASUK'
                                        ? `Supplier: ${m.supplier?.nama || '—'}`
                                        : `Penerima: ${m.kelompokPenerima || '—'}`}
                                </td>
                                <td style={{ textAlign: 'right' }}>{m.jenis === 'MASUK' && m.hargaBeli !== null ? `Rp${Number(m.hargaBeli).toLocaleString('id-ID')}` : '—'}</td>
                                <td>{m.keterangan || '—'}</td>
                            </tr>
                        ))}
                        {mutasiStokList.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '10px' }}>
                                    Belum ada data Mutasi Stok untuk periode ini.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};
