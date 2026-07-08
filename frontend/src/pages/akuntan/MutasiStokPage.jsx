import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Table, renderDate, renderStatus, renderTruncate } from '../../components/Table';

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
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ color: 'var(--text)' }}>Pencatatan Mutasi Stok Gudang (Masuk / Keluar)</h2>
            {error && (
                <div style={{
                    color: 'var(--color-danger)',
                    marginBottom: '20px',
                    padding: '8px',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)'
                }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{
                    color: 'var(--color-success)',
                    marginBottom: '20px',
                    padding: '8px',
                    border: '1px solid var(--color-success)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)'
                }}>
                    {success}
                </div>
            )}

            {/* Pilihan Periode */}
            <div style={{ marginBottom: '20px' }}>
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
                <select
                    value={periodeId}
                    onChange={e => setPeriodeId(e.target.value)}
                    style={{
                        width: '300px',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--input-border)',
                        backgroundColor: 'var(--bg)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                    }}
                >
                    {periods.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.tanggalMulai} - {p.tanggalSelesai}
                        </option>
                    ))}
                </select>
            </div>

            {/* Form Mutasi */}
            <form onSubmit={handleCreateMutasi} style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Buat Mutasi Stok</h3>
                
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
                            Bahan Pokok
                        </label>
                        <select
                            value={mutasiForm.bahanPokokId}
                            onChange={e => setMutasiForm(prev => ({ ...prev, bahanPokokId: e.target.value }))}
                            required
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--input-border)',
                                backgroundColor: 'var(--bg)',
                                color: 'var(--text)',
                                fontSize: '14px',
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="">-- Pilih Bahan Pokok --</option>
                            {bahanPokokList.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.nama} ({b.satuan})
                                </option>
                            ))}
                        </select>
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
                            Tanggal
                        </label>
                        <input
                            type="date"
                            value={mutasiForm.tanggal}
                            onChange={e => setMutasiForm(prev => ({ ...prev, tanggal: e.target.value }))}
                            required
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--input-border)',
                                backgroundColor: 'var(--bg)',
                                color: 'var(--text)',
                                fontSize: '14px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>

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
                            Jenis Mutasi
                        </label>
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
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--input-border)',
                                backgroundColor: 'var(--bg)',
                                color: 'var(--text)',
                                fontSize: '14px',
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="">-- Pilih Jenis --</option>
                            <option value="MASUK">MASUK (Barang Datang / PO)</option>
                            <option value="KELUAR">KELUAR (Penggunaan Dapur)</option>
                        </select>
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
                            Jumlah (Qty)
                        </label>
                        <input
                            type="number"
                            step="0.001"
                            placeholder="Jumlah (Qty)"
                            value={mutasiForm.qty}
                            onChange={e => setMutasiForm(prev => ({ ...prev, qty: e.target.value }))}
                            required
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--input-border)',
                                backgroundColor: 'var(--bg)',
                                color: 'var(--text)',
                                fontSize: '14px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '6px'
                    }}>
                        Keterangan (opsional)
                    </label>
                    <input
                        type="text"
                        placeholder="Catatan / Keterangan"
                        value={mutasiForm.keterangan}
                        onChange={e => setMutasiForm(prev => ({ ...prev, keterangan: e.target.value }))}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--input-border)',
                            backgroundColor: 'var(--bg)',
                            color: 'var(--text)',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                {/* Conditional Form fields: MASUK */}
                {mutasiForm.jenis === 'MASUK' && (
                    <div style={{
                        border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '16px',
                        marginTop: '10px',
                        backgroundColor: 'var(--bg)',
                        color: 'var(--text)'
                    }}>
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                            Detail Mutasi Masuk
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
                                    Supplier
                                </label>
                                <select
                                    value={mutasiForm.supplierId}
                                    onChange={e => setMutasiForm(prev => ({ ...prev, supplierId: e.target.value }))}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--input-border)',
                                        backgroundColor: 'var(--bg-elevated)',
                                        color: 'var(--text)',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <option value="">-- Pilih Supplier --</option>
                                    {supplierList.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.nama}
                                        </option>
                                    ))}
                                </select>
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
                                    Harga Beli (Rp)
                                </label>
                                <input
                                    type="number"
                                    placeholder="Harga Beli"
                                    value={mutasiForm.hargaBeli}
                                    onChange={e => setMutasiForm(prev => ({ ...prev, hargaBeli: e.target.value }))}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--input-border)',
                                        backgroundColor: 'var(--bg-elevated)',
                                        color: 'var(--text)',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Conditional Form fields: KELUAR */}
                {mutasiForm.jenis === 'KELUAR' && (
                    <div style={{
                        border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '16px',
                        marginTop: '10px',
                        backgroundColor: 'var(--bg)',
                        color: 'var(--text)'
                    }}>
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                            Detail Mutasi Keluar
                        </h4>
                        <div>
                            <label style={{
                                textTransform: 'uppercase',
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                color: 'var(--text-muted)',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Kelompok Penerima
                            </label>
                            <select
                                value={mutasiForm.kelompokPenerima}
                                onChange={e => setMutasiForm(prev => ({ ...prev, kelompokPenerima: e.target.value }))}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--input-border)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    fontSize: '14px',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <option value="">-- Pilih Kelompok --</option>
                                <option value="SISWA">SISWA</option>
                                <option value="B3">B3 (Pendidik/Masyarakat)</option>
                            </select>
                        </div>
                    </div>
                )}

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
                        Simpan Mutasi Stok
                    </button>
                </div>
            </form>

            {/* List Mutasi */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Mutasi Stok</h3>
            {loading && <p style={{ color: 'var(--text-muted)' }}>Memuat riwayat mutasi...</p>}
            <Table
                columns={[
                    { key: 'tanggal', header: 'Tanggal', render: (v) => renderDate(v) },
                    { key: 'bahanPokok', header: 'Bahan Pokok', render: (v) => v?.nama || '—' },
                    { key: 'jenis', header: 'Jenis', render: (v) => renderStatus(v) },
                    {
                        key: 'qty',
                        header: 'Qty',
                        align: 'right',
                        render: (v, row) => (
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                {Number(v).toLocaleString('id-ID')} {row.bahanPokok?.satuan}
                            </span>
                        )
                    },
                    {
                        key: 'id',
                        header: 'Supplier / Penerima',
                        render: (_, row) => row.jenis === 'MASUK'
                            ? `Supplier: ${row.supplier?.nama || '—'}`
                            : `Penerima: ${row.kelompokPenerima || '—'}`
                    },
                    {
                        key: 'hargaBeli',
                        header: 'Harga Beli',
                        align: 'right',
                        render: (v, row) => row.jenis === 'MASUK' && v !== null
                            ? (
                                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </span>
                            )
                            : '—'
                    },
                    { key: 'keterangan', header: 'Keterangan', render: (v) => renderTruncate(v) }
                ]}
                data={mutasiStokList}
                emptyText="Belum ada data Mutasi Stok untuk periode ini."
            />
        </div>
    );
};
