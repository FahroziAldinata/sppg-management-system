import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table, renderDate } from '../../components/Table';
import { DatePicker } from '../../components/DatePicker';
import Dropdown from '../../components/Dropdown';
import { NumberInput } from '../../components/NumberInput';
import { Skeleton } from '../../components/Skeleton';
import { Card } from '../../components/Card';

export const AkuntanPoPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [suppliers, setSuppliers] = useState([]);
    const [supplierId, setSupplierId] = useState('');
    const [poDate, setPoDate] = useState('');
    const [catatan, setCatatan] = useState('');

    const [menuDescription, setMenuDescription] = useState('');
    const [poItems, setPoItems] = useState([]);
    const [poList, setPoList] = useState([]);

    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    
    // Print State
    const [isPrinting, setIsPrinting] = useState(false);
    const [printPoData, setPrintPoData] = useState(null);
    const [detailPoData, setDetailPoData] = useState(null);
    const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState({ nama: '', kontak: '' });
    const [supplierSubmitting, setSupplierSubmitting] = useState(false);

    // Fetch master data on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setSelectedPeriodId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode.'));

        request('/akuntan/supplier')
            .then(r => r.json())
            .then(d => {
                setSuppliers(d);
                if (d.length) setSupplierId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar supplier.'));
    }, []);

    // Load PO list when period changes
    const loadPoList = async (pid) => {
        if (!pid) return;
        setListLoading(true);
        try {
            const r = await request(`/mitra/po/list?periodeId=${pid}`);
            if (r.ok) {
                const resJson = await r.json();
                setPoList(resJson.data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setListLoading(false);
        }
    };

    useEffect(() => {
        if (selectedPeriodId) {
            loadPoList(selectedPeriodId);
        }
    }, [selectedPeriodId]);

    // Load ingredient requirements when date changes
    useEffect(() => {
        if (!poDate || !selectedPeriodId) {
            setPoItems([]);
            setMenuDescription('');
            return;
        }

        const fetchKebutuhan = async () => {
            setLoading(true);
            try {
                const r = await request(`/mitra/po/kebutuhan?tanggal=${poDate}&periodeId=${selectedPeriodId}`);
                if (r.ok) {
                    const data = await r.json();
                    setMenuDescription(data.menuDescription || '—');
                    setPoItems(data.ingredients || []);
                } else {
                    const errData = await r.json().catch(() => ({ error: 'Gagal memuat kebutuhan bahan.' }));
                    toast.error(errData.error);
                    setPoItems([]);
                    setMenuDescription('');
                }
            } catch (err) {
                toast.error('Koneksi server gagal.');
            } finally {
                setLoading(false);
            }
        };

        fetchKebutuhan();
    }, [poDate, selectedPeriodId]);

    // Update Qty or Price manually in the form
    const handleItemChange = (idx, field, val) => {
        const parsed = parseFloat(val) || 0;
        setPoItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const updated = { ...item, [field]: val };
            const q = field === 'qtyTotal' ? parsed : parseFloat(item.qtyTotal) || 0;
            const p = field === 'hargaSatuan' ? parsed : parseFloat(item.hargaSatuan) || 0;
            updated.subtotal = Math.round((q * p) * 100) / 100;
            return updated;
        }));
    };

    const handleCreatePo = async (e) => {
        e.preventDefault();
        if (!selectedPeriodId) return toast.error('Periode wajib dipilih.');
        if (!poDate) return toast.error('Tanggal wajib diisi.');
        if (!supplierId) return toast.error('Supplier wajib dipilih.');
        if (poItems.length === 0) return toast.error('Tidak ada item PO yang tersedia untuk tanggal ini.');

        const itemsPayload = poItems.map(item => ({
            bahanPokokId: item.bahanPokokId,
            qtyTotal: parseFloat(item.qtyTotal) || 0,
            hargaSatuan: parseFloat(item.hargaSatuan) || 0
        }));

        try {
            const r = await request('/akuntan/po', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    periodeId: selectedPeriodId,
                    tanggal: poDate,
                    supplierId,
                    items: itemsPayload,
                    catatan
                })
            });

            if (r.ok) {
                toast.success('Nota Pesanan (PO) berhasil diinisiasi.');
                setPoDate('');
                setCatatan('');
                setPoItems([]);
                setMenuDescription('');
                loadPoList(selectedPeriodId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan server saat menyimpan PO' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error('Terjadi kesalahan koneksi.');
        }
    };

    const handleAddSupplier = async (e) => {
        e.preventDefault();
        if (!newSupplier.nama) {
            return toast.error('Nama supplier wajib diisi.');
        }
        setSupplierSubmitting(true);
        try {
            const r = await request('/akuntan/supplier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSupplier)
            });
            if (r.ok) {
                const data = await r.json();
                toast.success('Supplier baru berhasil ditambahkan.');
                const res = await request('/akuntan/supplier');
                if (res.ok) {
                    const list = await res.json();
                    setSuppliers(list);
                    setSupplierId(data.id);
                }
                setNewSupplier({ nama: '', kontak: '' });
                setIsAddSupplierOpen(false);
            } else {
                const errData = await r.json().catch(() => ({ error: 'Gagal menambahkan supplier.' }));
                toast.error(errData.error);
            }
        } catch (err) {
            toast.error('Terjadi kesalahan koneksi.');
        } finally {
            setSupplierSubmitting(false);
        }
    };

    // Prepare active period & SPPG info for print layout
    const activePeriod = periods.find(p => p.id === selectedPeriodId);
    const namaLembaga = activePeriod?.setupLembaga?.namaLembaga || 'SPPG SUMEDANG UJUNGJAYA PALABUAN';
    const idLembaga = activePeriod?.setupLembaga?.id || 'ZEZ3TM0G';
    const ketuaYayasan = activePeriod?.setupLembaga?.ketuaYayasan || 'Dizhar Priatama';

    // Helper to get status styling
    const getStatusStyle = (status) => {
        switch (status) {
            case 'DITERIMA':
                return { backgroundColor: 'rgba(40, 167, 69, 0.1)', color: '#28a745', border: '1px solid rgba(40, 167, 69, 0.2)' };
            case 'DIREALISASI':
                return { backgroundColor: 'rgba(0, 123, 255, 0.1)', color: '#007bff', border: '1px solid rgba(0, 123, 255, 0.2)' };
            case 'DIAJUKAN':
            default:
                return { backgroundColor: 'rgba(253, 126, 20, 0.1)', color: '#fd7e14', border: '1px solid rgba(253, 126, 20, 0.2)' };
        }
    };

    if (isPrinting && printPoData) {
        const totalHargaDiminta = printPoData.items.reduce((sum, item) => sum + Number(item.subtotal), 0);
        const totalHargaRealisasi = printPoData.items.reduce((sum, item) => sum + Number(item.subtotalRealisasi || 0), 0);
        const isRealized = printPoData.status !== 'DIAJUKAN';

        return (
            <div style={{ padding: '25px', backgroundColor: '#fff', minHeight: '100vh', color: '#000', fontFamily: 'Courier New, monospace' }}>
                <style>{`
                    @media print {
                        .no-print { display: none !important; }
                        body { background-color: #fff; color: #000; }
                    }
                `}</style>
                <div className="no-print" style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#eaeaea', display: 'flex', gap: '10px' }}>
                    <button onClick={() => window.print()} style={{ padding: '8px 16px', fontWeight: 'bold', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                        Cetak Sekarang (Print)
                    </button>
                    <button onClick={() => { setIsPrinting(false); setPrintPoData(null); }} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', cursor: 'pointer' }}>
                        Kembali
                    </button>
                </div>

                {/* PO Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>BADAN GIZI NASIONAL (NATIONAL NUTRITION AGENCY)</div>
                        <div style={{ fontSize: '11px' }}>Gedung E Kompleks Kementrian Pertanian</div>
                        <div style={{ fontSize: '11px' }}>Jalan Harsono RM Nomor 3 Ragunan, Pasar Minggu Jakarta 12550</div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', textDecoration: 'underline', marginBottom: '15px' }}>
                    NOTA PESANAN &amp; REALISASI BELANJA BAHAN MAKANAN
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px', fontSize: '13px', marginBottom: '20px' }}>
                    <div>
                        <table style={{ width: '100%' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '100px' }}>SPPG</td>
                                    <td>: {namaLembaga}</td>
                                </tr>
                                <tr>
                                    <td>ID SPPG</td>
                                    <td>: {idLembaga}</td>
                                </tr>
                                <tr>
                                    <td>Kepada</td>
                                    <td>: {printPoData.supplier?.nama}</td>
                                </tr>
                                <tr>
                                    <td>Status PO</td>
                                    <td>: {printPoData.status}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <table style={{ width: '100%' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '100px' }}>Waktu</td>
                                    <td>: {printPoData.tanggal.split('T')[0]}</td>
                                </tr>
                                <tr>
                                    <td>Catatan</td>
                                    <td>: {printPoData.catatan || '—'}</td>
                                </tr>
                                {printPoData.diterimaAt && (
                                    <tr>
                                        <td>Diterima</td>
                                        <td>: {printPoData.diterimaAt.split('T')[0]} oleh Aslap</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '25px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th style={{ width: '30px' }} rowspan="2">No</th>
                            <th rowspan="2">Uraian Jenis Bahan Makanan</th>
                            <th rowspan="2" style={{ width: '50px' }}>Satuan</th>
                            <th colSpan="3" style={{ textAlign: 'center' }}>Rencana (PO Diminta)</th>
                            {isRealized && <th colSpan="3" style={{ textAlign: 'center' }}>Realisasi (Belanja Aktual)</th>}
                        </tr>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th style={{ width: '70px', textAlign: 'right' }}>Qty</th>
                            <th style={{ width: '90px', textAlign: 'right' }}>Harga Satuan</th>
                            <th style={{ width: '100px', textAlign: 'right' }}>Subtotal</th>
                            {isRealized && (
                                <>
                                    <th style={{ width: '70px', textAlign: 'right' }}>Qty</th>
                                    <th style={{ width: '90px', textAlign: 'right' }}>Harga Satuan</th>
                                    <th style={{ width: '100px', textAlign: 'right' }}>Subtotal</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {printPoData.items.map((item, idx) => (
                            <tr key={item.id}>
                                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                <td>{item.bahanPokok?.nama}</td>
                                <td style={{ textAlign: 'center' }}>{item.bahanPokok?.satuan}</td>
                                <td style={{ textAlign: 'right' }}>{Number(item.qty).toLocaleString('id-ID')}</td>
                                <td style={{ textAlign: 'right' }}>Rp{Number(item.hargaSatuan).toLocaleString('id-ID')}</td>
                                <td style={{ textAlign: 'right' }}>Rp{Number(item.subtotal).toLocaleString('id-ID')}</td>
                                {isRealized && (
                                    <>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            {item.qtyRealisasi !== null ? Number(item.qtyRealisasi).toLocaleString('id-ID') : '—'}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {item.hargaSatuanRealisasi !== null ? `Rp${Number(item.hargaSatuanRealisasi).toLocaleString('id-ID')}` : '—'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            {item.subtotalRealisasi !== null ? `Rp${Number(item.subtotalRealisasi).toLocaleString('id-ID')}` : '—'}
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                        <tr style={{ fontWeight: 'bold', backgroundColor: '#eaeaea' }}>
                            <td colSpan="3" style={{ textAlign: 'right' }}>Total:</td>
                            <td colSpan="3" style={{ textAlign: 'right' }}>Rp{totalHargaDiminta.toLocaleString('id-ID')}</td>
                            {isRealized && <td colSpan="3" style={{ textAlign: 'right' }}>Rp{totalHargaRealisasi.toLocaleString('id-ID')}</td>}
                        </tr>
                    </tbody>
                </table>

                <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <div style={{ textAlign: 'center', width: '250px' }}>
                        <div>Pembuat Pesanan,</div>
                        <div style={{ fontWeight: '500', marginTop: '5px' }}>Akuntan SPPG</div>
                        <div style={{ marginTop: '60px', fontWeight: 'bold' }}>
                            {printPoData.createdBy?.nama || 'Akuntan SPPG'}
                        </div>
                    </div>
                    {isRealized && (
                        <div style={{ textAlign: 'center', width: '250px' }}>
                            <div>Penerima &amp; Pembelanja,</div>
                            <div style={{ fontWeight: '500', marginTop: '5px' }}>Mitra SPPG</div>
                            <div style={{ marginTop: '60px', textDecoration: 'underline', fontWeight: 'bold' }}>
                                {ketuaYayasan}
                            </div>
                        </div>
                    )}
                    <div style={{ textAlign: 'center', width: '250px' }}>
                        <div>Penanggung Jawab / Aslap,</div>
                        <div style={{ fontWeight: '500', marginTop: '5px' }}>Asisten Lapangan</div>
                        <div style={{ marginTop: '60px', textDecoration: 'underline', fontWeight: 'bold' }}>
                            {printPoData.diterimaOleh?.nama || '—'}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Nota Pesanan (PO) &amp; Realisasi Belanja (Akuntan)</h2>
            
            {/* Filter Periode */}
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
                    Pilih Periode
                </label>
                <Dropdown
                    style={{ width: '100%' }}
                    value={selectedPeriodId}
                    onChange={setSelectedPeriodId}
                    options={periods.map(p => ({
                        value: p.id,
                        label: `${p.tanggalMulai} - ${p.tanggalSelesai}`
                    }))}
                />
            </div>

            {/* Input Form PO */}
            <form onSubmit={handleCreatePo} style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginBottom: '30px'
            }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                    Inisiasi Nota Pesanan (PO) Baru
                </h3>

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
                            Tanggal Pengiriman
                        </label>
                        <DatePicker
                            value={poDate}
                            onChange={setPoDate}
                            defaultFocusMonth={activePeriod?.tanggalMulai}
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
                            Pilih Supplier / CV
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Dropdown
                                style={{ flex: 1 }}
                                value={supplierId}
                                onChange={setSupplierId}
                                options={suppliers.map(s => ({
                                    value: s.id,
                                    label: s.nama
                                }))}
                            />
                            <button
                                type="button"
                                onClick={() => setIsAddSupplierOpen(true)}
                                style={{
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                + Baru
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Menu Harian */}
                {poDate && (
                    <div style={{ border: '1px dashed var(--border)', padding: '10px', backgroundColor: 'var(--bg)', fontSize: '14px', borderRadius: 'var(--radius-sm)', color: 'var(--text)' }}>
                        <strong>Rencana Menu Hari Ini:</strong> {menuDescription}
                    </div>
                )}

                {loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '15px 0' }}>
                        <Skeleton height="40px" />
                        <Skeleton height="40px" />
                        <Skeleton height="40px" />
                    </div>
                )}

                {/* Table Items Kebutuhan */}
                {!loading && poItems.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text)', fontSize: '14px', fontWeight: 600 }}>Daftar Kebutuhan Bahan Makanan (Berdasarkan Porsi PM &amp; Menu)</h4>
                        <Table
                            columns={[
                                { key: 'nama', header: 'Nama Bahan' },
                                { key: 'satuan', header: 'Satuan', align: 'center' },
                                {
                                    key: 'qtySiswa',
                                    header: 'Alokasi Siswa',
                                    align: 'right',
                                    render: (v) => (
                                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                            {Number(v).toLocaleString('id-ID')}
                                        </span>
                                    )
                                },
                                {
                                    key: 'qtyB3',
                                    header: 'Alokasi B3',
                                    align: 'right',
                                    render: (v) => (
                                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                            {Number(v).toLocaleString('id-ID')}
                                        </span>
                                    )
                                },
                                {
                                    key: 'qtyTotal',
                                    header: 'Total Qty',
                                    width: '120px',
                                    align: 'right',
                                    render: (v, row, idx) => (
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="form-field"
                                            style={{ textAlign: 'right' }}
                                            value={v}
                                            onChange={e => handleItemChange(idx, 'qtyTotal', e.target.value)}
                                            required
                                        />
                                    )
                                },
                                {
                                    key: 'hargaSatuan',
                                    header: 'Harga Satuan (Rp)',
                                    width: '140px',
                                    align: 'right',
                                    render: (v, row, idx) => (
                                        <NumberInput
                                            className="form-field"
                                            style={{ textAlign: 'right' }}
                                            value={v === '' ? '' : Number(v)}
                                            onChange={val => handleItemChange(idx, 'hargaSatuan', val)}
                                            required
                                        />
                                    )
                                },
                                {
                                    key: 'subtotal',
                                    header: 'Subtotal (Rp)',
                                    align: 'right',
                                    render: (v) => (
                                        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                                            Rp{Number(v).toLocaleString('id-ID')}
                                        </strong>
                                    )
                                }
                            ]}
                            data={poItems}
                        />
                    </div>
                )}

                {poDate && poItems.length === 0 && !loading && (
                    <div style={{ color: 'var(--color-warning)', padding: '10px', border: '1px solid rgba(245, 158, 11, 0.2)', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: 'var(--radius-sm)' }}>
                        Tidak ada rencana menu harian aktif / disetujui untuk tanggal terpilih.
                    </div>
                )}

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
                        Catatan Tambahan (opsional)
                    </label>
                    <input
                        type="text"
                        className="form-field"
                        placeholder="Contoh: Pengiriman pagi s.d jam 06.00"
                        value={catatan}
                        onChange={e => setCatatan(e.target.value)}
                    />
                </div>

                <div style={{ marginTop: '10px' }}>
                    <button
                        type="submit"
                        disabled={poItems.length === 0}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'var(--btn-primary-bg)',
                            color: 'var(--btn-primary-text)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: poItems.length === 0 ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                            opacity: poItems.length === 0 ? 0.6 : 1
                        }}
                    >
                        Inisiasi Nota Pesanan
                    </button>
                </div>
            </form>

            {/* Riwayat PO List — Grouped per Tanggal → Supplier */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Riwayat Nota Pesanan (PO) Terdaftar</h3>
            {listLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                    <Skeleton height="40px" />
                </div>
            )}
            {!listLoading && poList.length === 0 && (
                <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                    Belum ada data Nota Pesanan (PO) untuk periode ini.
                </div>
            )}
            {!listLoading && poList.length > 0 && (() => {
                const groups = {};
                for (const po of poList) {
                    const key = `${po.tanggal}||${po.supplier?.id}`;
                    if (!groups[key]) {
                        groups[key] = { tanggal: po.tanggal, supplier: po.supplier, ros: [] };
                    }
                    groups[key].ros.push(po);
                }
                const sorted = Object.values(groups).sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
                return sorted.map(group => {
                    const totalNilai = group.ros.reduce((s, po) => s + po.items.reduce((ss, i) => ss + Number(i.subtotal), 0), 0);
                    const totalRealisasi = group.ros.reduce((s, po) => s + po.items.reduce((ss, i) => ss + Number(i.subtotalRealisasi || 0), 0), 0);
                    const isAnyRealized = group.ros.some(po => po.status !== 'DIAJUKAN');
                    const allStatuses = [...new Set(group.ros.map(po => po.status))];
                    return (
                        <div key={group.tanggal + group.supplier?.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '20px', backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--shadow)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
                                <div>
                                    <strong style={{ fontSize: '15px' }}>{renderDate(group.tanggal)}</strong>
                                    <span style={{ color: 'var(--text-muted)', margin: '0 10px' }}>—</span>
                                    <span>{group.supplier?.nama || '—'}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '15px', fontSize: '13px' }}>
                                    <span>PO: <strong>{group.ros.length}</strong></span>
                                    <span>Nilai: <strong>Rp{totalNilai.toLocaleString('id-ID')}</strong></span>
                                    {isAnyRealized && <span>Realisasi: <strong>Rp{totalRealisasi.toLocaleString('id-ID')}</strong></span>}
                                    <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        {allStatuses.map(st => (
                                            <span key={st} style={{ ...getStatusStyle(st), padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 'bold' }}>{st}</span>
                                        ))}
                                    </span>
                                </div>
                            </div>
                            <div style={{ padding: '10px 20px 20px' }}>
                                {group.ros.map(po => (
                                    <div key={po.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginTop: '10px', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', backgroundColor: 'var(--bg)', fontSize: '12px', borderBottom: '1px solid var(--border)' }}>
                                            <span>#{po.id.slice(-6)} — {po.catatan || 'tanpa catatan'}</span>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => setDetailPoData(po)} style={{ padding: '3px 8px', backgroundColor: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}>Detail</button>
                                                <button onClick={() => { setPrintPoData(po); setIsPrinting(true); }} style={{ padding: '3px 8px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}>Cetak</button>
                                            </div>
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#f9f9f9', color: 'var(--text-muted)' }}>
                                                    <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Bahan</th>
                                                    <th style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Sat</th>
                                                    <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Qty</th>
                                                    <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Harga</th>
                                                    <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Subtotal</th>
                                                    {isAnyRealized && <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Qty Real</th>}
                                                    {isAnyRealized && <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Subtotal Real</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {po.items.map(item => (
                                                    <tr key={item.id}>
                                                        <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border)' }}>{item.bahanPokok?.nama}</td>
                                                        <td style={{ padding: '5px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{item.bahanPokok?.satuan}</td>
                                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>{Number(item.qty).toLocaleString('id-ID')}</td>
                                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>Rp{Number(item.hargaSatuan).toLocaleString('id-ID')}</td>
                                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>Rp{Number(item.subtotal).toLocaleString('id-ID')}</td>
                                                        {isAnyRealized && (
                                                            <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>
                                                                {item.qtyRealisasi !== null ? Number(item.qtyRealisasi).toLocaleString('id-ID') : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                            </td>
                                                        )}
                                                        {isAnyRealized && (
                                                            <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>
                                                                {item.subtotalRealisasi !== null ? `Rp${Number(item.subtotalRealisasi).toLocaleString('id-ID')}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                });
            })()}

            {/* Modal Detail PO */}
            {detailPoData && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        width: '100%',
                        maxWidth: '850px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '24px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-hover)'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Detail PO - Tanggal {renderDate(detailPoData.tanggal)}</span>
                            <span style={{
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                ...getStatusStyle(detailPoData.status)
                            }}>{detailPoData.status}</span>
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', fontSize: '13px' }}>
                            <div>Supplier: <strong>{detailPoData.supplier?.nama}</strong></div>
                            <div>Catatan: {detailPoData.catatan || '—'}</div>
                            {detailPoData.diterimaAt && (
                                <div style={{ gridColumn: 'span 2' }}>
                                    Diterima oleh: <strong>{detailPoData.diterimaOleh?.nama}</strong> pada {renderDate(detailPoData.diterimaAt)}
                                </div>
                            )}
                        </div>

                        <Table
                            columns={[
                                { key: 'nama', header: 'Bahan Pokok', render: (_, r) => r.bahanPokok?.nama },
                                { key: 'satuan', header: 'Satuan', align: 'center', render: (_, r) => r.bahanPokok?.satuan },
                                { key: 'qty', header: 'Qty Diminta', align: 'right', render: (v) => Number(v).toLocaleString('id-ID') },
                                { key: 'hargaSatuan', header: 'Harga Diminta', align: 'right', render: (v) => `Rp${Number(v).toLocaleString('id-ID')}` },
                                { key: 'subtotal', header: 'Subtotal Diminta', align: 'right', render: (v) => `Rp${Number(v).toLocaleString('id-ID')}` },
                                { 
                                    key: 'qtyRealisasi', 
                                    header: 'Qty Realisasi', 
                                    align: 'right', 
                                    render: (v) => v !== null ? Number(v).toLocaleString('id-ID') : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                },
                                { 
                                    key: 'hargaSatuanRealisasi', 
                                    header: 'Harga Realisasi', 
                                    align: 'right', 
                                    render: (v) => v !== null ? `Rp${Number(v).toLocaleString('id-ID')}` : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                },
                                { 
                                    key: 'subtotalRealisasi', 
                                    header: 'Subtotal Realisasi', 
                                    align: 'right', 
                                    render: (v) => v !== null ? `Rp${Number(v).toLocaleString('id-ID')}` : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                }
                            ]}
                            data={detailPoData.items}
                        />

                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setDetailPoData(null)}
                                style={{ padding: '8px 16px', backgroundColor: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Tambah Supplier */}
            {isAddSupplierOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <form onSubmit={handleAddSupplier} style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        width: '100%',
                        maxWidth: '450px',
                        padding: '24px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-hover)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Tambah Supplier / CV Baru</h3>
                        
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
                                Nama Supplier / CV *
                            </label>
                            <input
                                type="text"
                                className="form-field"
                                placeholder="Contoh: CV Sembako Makmur"
                                value={newSupplier.nama}
                                onChange={e => setNewSupplier(prev => ({ ...prev, nama: e.target.value }))}
                                required
                            />
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
                                Kontak / Telepon (opsional)
                            </label>
                            <input
                                type="text"
                                className="form-field"
                                placeholder="Contoh: 0812345678"
                                value={newSupplier.kontak}
                                onChange={e => setNewSupplier(prev => ({ ...prev, kontak: e.target.value }))}
                            />
                        </div>

                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setNewSupplier({ nama: '', kontak: '' });
                                    setIsAddSupplierOpen(false);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'var(--border)',
                                    color: 'var(--text)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-sm)',
                                    fontWeight: 600
                                }}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={supplierSubmitting}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    cursor: supplierSubmitting ? 'not-allowed' : 'pointer',
                                    borderRadius: 'var(--radius-sm)',
                                    fontWeight: 600,
                                    opacity: supplierSubmitting ? 0.6 : 1
                                }}
                            >
                                {supplierSubmitting ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
