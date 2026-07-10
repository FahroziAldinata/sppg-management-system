import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Table, renderCurrency } from '../../components/Table';
import Dropdown from '../../components/Dropdown';

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
            .catch(() => { });
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
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Input Saldo Awal Barang (Persediaan Awal)</h2>
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
                    options={periods.map(p => ({ value: p.id, label: `${p.tanggalMulai} - ${p.tanggalSelesai}` }))}
                />
            </div>

            {/* Form Saldo Awal */}
            <form onSubmit={handleCreateSaldoAwal} style={{
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
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Input Saldo Awal Barang (per Periode)</h3>

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
                            value={saldoAwalForm.bahanPokokId}
                            onChange={val => setSaldoAwalForm(prev => ({ ...prev, bahanPokokId: val }))}
                            options={[
                                { value: '', label: '-- Pilih Bahan Pokok --' },
                                ...bahanPokokList.map(b => ({ value: b.id, label: `${b.nama} (${b.satuan})` }))
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
                            Saldo Awal Qty
                        </label>
                        <input
                            type="number"
                            step="0.001"
                            placeholder="Jumlah Stok Awal"
                            value={saldoAwalForm.saldoAwalQty}
                            onChange={e => setSaldoAwalForm(prev => ({ ...prev, saldoAwalQty: e.target.value }))}
                            required
                            className="form-field"
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
                            Harga Beli Awal (Rp)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Harga Beli Awal"
                            value={saldoAwalForm.hargaBeliAwal}
                            onChange={e => setSaldoAwalForm(prev => ({ ...prev, hargaBeliAwal: e.target.value }))}
                            required
                            className="form-field"
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
                        Simpan Saldo Awal
                    </button>
                </div>
            </form>

            {/* List Saldo Awal */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Saldo Awal Barang Terdaftar</h3>
            {loading && <p style={{ color: 'var(--text-muted)' }}>Memuat daftar saldo awal...</p>}
            <Table
                columns={[
                    { key: 'bahanPokok', header: 'Nama Bahan Pokok', render: (v) => v ? v.nama : '—' },
                    { key: 'bahanPokokSatuan', header: 'Satuan', align: 'center', width: '100px', render: (_, row) => row.bahanPokok ? row.bahanPokok.satuan : '—' },
                    {
                        key: 'saldoAwalQty',
                        header: 'Saldo Awal (Qty)',
                        align: 'right',
                        render: (v) => (
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                {Number(v).toLocaleString('id-ID')}
                            </span>
                        )
                    },
                    {
                        key: 'hargaBeliAwal',
                        header: 'Harga Beli Awal',
                        align: 'right',
                        render: (v) => (
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                Rp{Number(v).toLocaleString('id-ID')}
                            </span>
                        )
                    },
                    {
                        key: 'id',
                        header: 'Total Nilai Saldo Awal',
                        align: 'right',
                        render: (_, row) => {
                            const totalNilai = row.saldoAwalQty * row.hargaBeliAwal;
                            return (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                    Rp{totalNilai.toLocaleString('id-ID')}
                                </strong>
                            );
                        }
                    }
                ]}
                data={saldoAwalList}
                emptyText="Belum ada data saldo awal barang untuk periode ini."
            />
        </div>
    );
};
