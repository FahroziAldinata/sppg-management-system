import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table, renderDate, renderTruncate } from '../../components/Table';
import { DatePicker } from '../../components/DatePicker';
import Dropdown from '../../components/Dropdown';
import { NumberInput } from '../../components/NumberInput';
import { Skeleton } from '../../components/Skeleton';

export const MitraPoPage = () => {
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
            const r = await request('/mitra/po', {
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
                toast.success('Nota Pesanan (PO) berhasil disimpan.');
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

    // Prepare active period & SPPG info for print layout
    const activePeriod = periods.find(p => p.id === selectedPeriodId);
    const namaLembaga = activePeriod?.setupLembaga?.namaLembaga || 'SPPG SUMEDANG UJUNGJAYA PALABUAN';
    const idLembaga = activePeriod?.setupLembaga?.id || 'ZEZ3TM0G';
    const ketuaYayasan = activePeriod?.setupLembaga?.ketuaYayasan || 'Dizhar Priatama';

    if (isPrinting && printPoData) {
        const totalHarga = printPoData.items.reduce((sum, item) => sum + Number(item.subtotal), 0);

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
                    NOTA PESANAN BAHAN MAKANAN
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
                                    <td>Menu</td>
                                    <td style={{ wordBreak: 'break-all' }}>: {menuDescription || 'Sesuai Ahli Gizi'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '25px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th style={{ width: '30px' }}>No</th>
                            <th>Uraian Jenis Bahan Makanan</th>
                            <th style={{ width: '80px', textAlign: 'right' }}>SISWA (Qty)</th>
                            <th style={{ width: '80px', textAlign: 'right' }}>B3 (Qty)</th>
                            <th style={{ width: '80px', textAlign: 'right' }}>Total QTY</th>
                            <th style={{ width: '60px' }}>Satuan</th>
                            <th style={{ width: '110px', textAlign: 'right' }}>Harga Satuan</th>
                            <th style={{ width: '120px', textAlign: 'right' }}>Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>
                        {printPoData.items.map((item, idx) => {
                            const matchItem = poItems.find(p => p.bahanPokokId === item.bahanPokokId);
                            const qtySiswa = matchItem ? matchItem.qtySiswa : 0;
                            const qtyB3 = matchItem ? matchItem.qtyB3 : 0;

                            return (
                                <tr key={item.id}>
                                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                    <td>{item.bahanPokok?.nama}</td>
                                    <td style={{ textAlign: 'right' }}>{qtySiswa ? qtySiswa.toLocaleString('id-ID') : '—'}</td>
                                    <td style={{ textAlign: 'right' }}>{qtyB3 ? qtyB3.toLocaleString('id-ID') : '—'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{Number(item.qty).toLocaleString('id-ID')}</td>
                                    <td style={{ textAlign: 'center' }}>{item.bahanPokok?.satuan}</td>
                                    <td style={{ textAlign: 'right' }}>Rp{Number(item.hargaSatuan).toLocaleString('id-ID')}</td>
                                    <td style={{ textAlign: 'right' }}>Rp{Number(item.subtotal).toLocaleString('id-ID')}</td>
                                </tr>
                            );
                        })}
                        <tr style={{ fontWeight: 'bold', backgroundColor: '#eaeaea' }}>
                            <td colSpan="7" style={{ textAlign: 'right' }}>Total:</td>
                            <td style={{ textAlign: 'right' }}>Rp{totalHarga.toLocaleString('id-ID')}</td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <div style={{ textAlign: 'center', width: '250px' }}>
                        <div>Penerima Pesanan,</div>
                        <div style={{ fontWeight: '500', marginTop: '5px' }}>Mitra SPPG {namaLembaga}</div>
                        <div style={{ marginTop: '60px', textDecoration: 'underline', fontWeight: 'bold' }}>
                            {ketuaYayasan}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', width: '250px' }}>
                        <div>Penanggung Jawab,</div>
                        <div style={{ fontWeight: '500', marginTop: '5px' }}>Kepala SPPG</div>
                        <div style={{ marginTop: '60px', textDecoration: 'underline', fontWeight: 'bold' }}>
                            {activePeriod?.setupLembaga?.namaKepalaSPPG || 'Yayang Badruddin, S.E'}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Penyusunan Nota Pesanan (PO Bahan Makanan)</h2>
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
                    Buat Nota Pesanan (PO) Baru
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
                        <Dropdown
                            style={{ width: '100%' }}
                            value={supplierId}
                            onChange={setSupplierId}
                            options={suppliers.map(s => ({
                                value: s.id,
                                label: s.nama
                            }))}
                        />
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
                        Simpan Nota Pesanan
                    </button>
                </div>
            </form>

            {/* Riwayat PO List */}
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
            {!listLoading && <Table
                columns={[
                    { key: 'tanggal', header: 'Tanggal Pengiriman', render: (v) => renderDate(v) },
                    { key: 'supplier', header: 'Nama Supplier', render: (v) => v ? v.nama : '—' },
                    { key: 'items', header: 'Jumlah Item', align: 'right', render: (v) => `${(v || []).length} jenis bahan` },
                    {
                        key: 'id',
                        header: 'Total Nilai Pesanan',
                        align: 'right',
                        render: (_, row) => {
                            const totalNilai = row.items.reduce((sum, item) => sum + Number(item.subtotal), 0);
                            return (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                    Rp{totalNilai.toLocaleString('id-ID')}
                                </strong>
                            );
                        }
                    },
                    { key: 'catatan', header: 'Catatan', render: (v) => renderTruncate(v) },
                    {
                        key: 'id',
                        header: 'Aksi',
                        align: 'center',
                        width: '180px',
                        render: (_, row) => (
                            <button
                                onClick={() => { setPrintPoData(row); setIsPrinting(true); }}
                                style={{ padding: '3px 10px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                            >
                                Cetak Nota (PO)
                            </button>
                        )
                    }
                ]}
                data={poList}
                emptyText="Belum ada data Nota Pesanan (PO) untuk periode ini."
            />}
        </div>
    );
};
