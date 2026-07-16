import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table, renderDate, renderStatus, renderTruncate } from '../../components/Table';
import { DatePicker } from '../../components/DatePicker';
import Dropdown from '../../components/Dropdown';
import { NumberInput } from '../../components/NumberInput';

export const MutasiStokPage = () => {
    const { request } = useApi();
  const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [supplierList, setSupplierList] = useState([]);
    const [bahanPokokList, setBahanPokokList] = useState([]);
    const [mutasiStokList, setMutasiStokList] = useState([]);
    const [loading, setLoading] = useState(false);
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
            .catch(() => toast.error('Gagal memuat daftar periode.'));

        request('/akuntan/supplier')
            .then(r => r.json())
            .then(d => setSupplierList(d))
            .catch(() => { });

        request('/mitra/bahan-pokok')
            .then(r => r.json())
            .then(d => setBahanPokokList(d))
            .catch(() => { });
    }, []);

    const loadMutasiStok = async (pid) => {
        if (!pid) return;
        setLoading(true);
        try {
            const r = await request(`/akuntan/mutasi-stok?periodeId=${pid}`);
            if (r.ok) {
                setMutasiStokList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar mutasi stok' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
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

    const activePeriod = periods.find(p => p.id === periodeId);

    const handleCreateMutasi = async (e) => {
        e.preventDefault();
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

        if (!bahanPokokId) { toast.error('Bahan pokok wajib dipilih.'); return; }
        if (!tanggal) { toast.error('Tanggal wajib diisi.'); return; }
        if (!jenis) { toast.error('Jenis mutasi wajib dipilih (MASUK/KELUAR).'); return; }
        if (qty === '' || qty === undefined) { toast.error('Qty wajib diisi.'); return; }
        const valQty = parseFloat(qty);
        if (isNaN(valQty) || valQty <= 0) { toast.error('Qty harus berupa angka positif.'); return; }

        const body = {
            bahanPokokId,
            tanggal,
            jenis,
            qty: valQty,
            keterangan: keterangan || null
        };

        if (jenis === 'MASUK') {
            if (!supplierId) { toast.error('Supplier wajib dipilih untuk mutasi MASUK.'); return; }
            if (hargaBeli === '' || hargaBeli === undefined) { toast.error('Harga beli wajib diisi untuk mutasi MASUK.'); return; }
            const valHarga = parseFloat(hargaBeli);
            if (isNaN(valHarga) || valHarga < 0) { toast.error('Harga beli harus berupa angka non-negatif.'); return; }
            body.supplierId = supplierId;
            body.hargaBeli = valHarga;
            body.kelompokPenerima = null;
        } else if (jenis === 'KELUAR') {
            if (!kelompokPenerima) { toast.error('Kelompok penerima wajib dipilih untuk mutasi KELUAR.'); return; }
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
                toast.success('Mutasi Stok berhasil disimpan.');
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
                toast.error(d.error || 'Gagal menyimpan Mutasi Stok');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Pencatatan Mutasi Stok Gudang (Masuk / Keluar)</h2>
            {/* Pilihan Periode */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                width: '30%',
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
                    onChange={val => setPeriodeId(val)}
                    options={periods.map(p => ({
                        value: p.id,
                        label: `${p.tanggalMulai} - ${p.tanggalSelesai}`
                    }))}
                />
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
                        <Dropdown
                            style={{ width: '100%' }}
                            value={mutasiForm.bahanPokokId}
                            onChange={val => setMutasiForm(prev => ({ ...prev, bahanPokokId: val }))}
                            options={[
                                { value: '', label: '-- Pilih Bahan Pokok --' },
                                ...bahanPokokList.map(b => ({
                                    value: b.id,
                                    label: `${b.nama} (${b.satuan})`
                                }))
                            ]}
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
                            Tanggal
                        </label>
                        <DatePicker
                            value={mutasiForm.tanggal}
                            onChange={val => setMutasiForm(prev => ({ ...prev, tanggal: val }))}
                            defaultFocusMonth={activePeriod?.tanggalMulai}
                            required
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
                        <Dropdown
                            style={{ width: '100%' }}
                            value={mutasiForm.jenis}
                            onChange={val => {
                                setMutasiForm(prev => ({
                                    ...prev,
                                    jenis: val,
                                    supplierId: val === 'KELUAR' ? '' : prev.supplierId,
                                    hargaBeli: val === 'KELUAR' ? '' : prev.hargaBeli,
                                    kelompokPenerima: val === 'MASUK' ? '' : prev.kelompokPenerima
                                }));
                            }}
                            options={[
                                { value: '', label: '-- Pilih Jenis --' },
                                { value: 'MASUK', label: 'MASUK (Barang Datang / PO)' },
                                { value: 'KELUAR', label: 'KELUAR (Penggunaan Dapur)' }
                            ]}
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
                            Jumlah (Qty)
                        </label>
                        <input
                            type="number"
                            step="0.001"
                            placeholder="Jumlah (Qty)"
                            value={mutasiForm.qty}
                            onChange={e => setMutasiForm(prev => ({ ...prev, qty: e.target.value }))}
                            required
                            className="form-field"
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
                        className="form-field"
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
                                <Dropdown
                                    style={{ width: '100%' }}
                                    value={mutasiForm.supplierId}
                                    onChange={val => setMutasiForm(prev => ({ ...prev, supplierId: val }))}
                                    options={[
                                        { value: '', label: '-- Pilih Supplier --' },
                                        ...supplierList.map(s => ({ value: s.id, label: s.nama }))
                                    ]}
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
                                    Harga Beli (Rp)
                                </label>
                                <NumberInput

                                    placeholder="Harga Beli"
                                    value={mutasiForm.hargaBeli}
                                    onChange={val => setMutasiForm(prev => ({ ...prev, hargaBeli: val }))}
                                    required
                                    className="form-field"
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
                            <Dropdown
                                style={{ width: '100%' }}
                                value={mutasiForm.kelompokPenerima}
                                onChange={val => setMutasiForm(prev => ({ ...prev, kelompokPenerima: val }))}
                                options={[
                                    { value: '', label: '-- Pilih Kelompok --' },
                                    { value: 'SISWA', label: 'SISWA' },
                                    { value: 'B3', label: 'B3 (Pendidik/Masyarakat)' }
                                ]}
                            />
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
