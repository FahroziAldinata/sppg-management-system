import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

export const MitraPoPage = () => {
    const { request } = useApi();
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
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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
            .catch(() => setError('Gagal memuat daftar periode.'));

        request('/akuntan/supplier')
            .then(r => r.json())
            .then(d => {
                setSuppliers(d);
                if (d.length) setSupplierId(d[0].id);
            })
            .catch(() => setError('Gagal memuat daftar supplier.'));
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
            setError('');
            try {
                const r = await request(`/mitra/po/kebutuhan?tanggal=${poDate}&periodeId=${selectedPeriodId}`);
                if (r.ok) {
                    const data = await r.json();
                    setMenuDescription(data.menuDescription || '—');
                    setPoItems(data.ingredients || []);
                } else {
                    const errData = await r.json().catch(() => ({ error: 'Gagal memuat kebutuhan bahan.' }));
                    setError(errData.error);
                    setPoItems([]);
                    setMenuDescription('');
                }
            } catch (err) {
                setError('Koneksi server gagal.');
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
        setError('');
        setSuccess('');

        if (!selectedPeriodId) return setError('Periode wajib dipilih.');
        if (!poDate) return setError('Tanggal wajib diisi.');
        if (!supplierId) return setError('Supplier wajib dipilih.');
        if (poItems.length === 0) return setError('Tidak ada item PO yang tersedia untuk tanggal ini.');

        // Build items payload
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
                setSuccess('Nota Pesanan (PO) berhasil disimpan.');
                setPoDate('');
                setCatatan('');
                setPoItems([]);
                setMenuDescription('');
                loadPoList(selectedPeriodId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan server saat menyimpan PO' }));
                setError(d.error);
            }
        } catch (err) {
            setError('Terjadi kesalahan koneksi.');
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

                {/* PO Header matching BGN style */}
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

                {/* Metadata Info */}
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

                {/* Table PO */}
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
                            // Find matching estimated item to get Siswa / B3 breakdown if available
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

                {/* Signatures */}
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
            <h2>Penyusunan Nota Pesanan (PO Bahan Makanan)</h2>
            {error && <div style={{ color: 'red', marginBottom: '10px', padding: '8px', border: '1px solid red' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '10px', padding: '8px', border: '1px solid green' }}>{success}</div>}

            {/* Filter Periode */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '500', marginRight: '5px' }}>Pilih Periode: </label>
                <select value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
                    {periods.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.tanggalMulai} - {p.tanggalSelesai}
                        </option>
                    ))}
                </select>
            </div>

            {/* Input Form PO */}
            <h3>Buat Nota Pesanan (PO) Baru</h3>
            <form onSubmit={handleCreatePo} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '3px' }}>Tanggal Pengiriman: </label>
                        <input
                            type="date"
                            value={poDate}
                            onChange={e => setPoDate(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '3px' }}>Pilih Supplier / CV: </label>
                        <select value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.nama}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Info Menu Harian */}
                {/* ponytail: unify shade pastel to bg-elevated */}
                {poDate && (
                    <div style={{ border: '1px dashed var(--border)', padding: '10px', backgroundColor: 'var(--bg-elevated)', fontSize: '14px', borderRadius: 'var(--radius-sm)' }}>
                        <strong>Rencana Menu Hari Ini:</strong> {menuDescription}
                    </div>
                )}

                {/* Loading state kebutuhan */}
                {loading && <p>Menghitung kebutuhan bahan makanan...</p>}

                {/* Table Items Kebutuhan */}
                {!loading && poItems.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>Daftar Kebutuhan Bahan Makanan (Berdasarkan Porsi PM &amp; Menu)</h4>
                        <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#eaeaea' }}>
                                    <th>Nama Bahan</th>
                                    <th>Satuan</th>
                                    <th style={{ textAlign: 'right' }}>Alokasi Siswa</th>
                                    <th style={{ textAlign: 'right' }}>Alokasi B3</th>
                                    <th style={{ width: '120px', textAlign: 'right' }}>Total Qty</th>
                                    <th style={{ width: '140px', textAlign: 'right' }}>Harga Satuan (Rp)</th>
                                    <th style={{ textAlign: 'right' }}>Subtotal (Rp)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {poItems.map((item, idx) => (
                                    <tr key={item.bahanPokokId}>
                                        <td>{item.nama}</td>
                                        <td style={{ textAlign: 'center' }}>{item.satuan}</td>
                                        <td style={{ textAlign: 'right' }}>{item.qtySiswa.toLocaleString('id-ID')}</td>
                                        <td style={{ textAlign: 'right' }}>{item.qtyB3.toLocaleString('id-ID')}</td>
                                        <td>
                                            <input
                                                type="number"
                                                step="0.001"
                                                value={item.qtyTotal}
                                                onChange={e => handleItemChange(idx, 'qtyTotal', e.target.value)}
                                                style={{ width: '100%', textAlign: 'right', padding: '3px' }}
                                                required
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.hargaSatuan}
                                                onChange={e => handleItemChange(idx, 'hargaSatuan', e.target.value)}
                                                style={{ width: '100%', textAlign: 'right', padding: '3px' }}
                                                required
                                            />
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            Rp{item.subtotal.toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ponytail: unify shade pastel to bg-elevated */}
                {poDate && poItems.length === 0 && !loading && (
                    <div style={{ color: 'var(--color-warning)', padding: '10px', border: '1px solid rgba(245, 158, 11, 0.2)', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-sm)' }}>
                        Tidak ada rencana menu harian aktif / disetujui untuk tanggal terpilih.
                    </div>
                )}

                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Catatan Tambahan (opsional): </label>
                    <input
                        type="text"
                        placeholder="Contoh: Pengiriman pagi s.d jam 06.00"
                        value={catatan}
                        onChange={e => setCatatan(e.target.value)}
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>

                <div style={{ marginTop: '10px' }}>
                    <button
                        type="submit"
                        disabled={poItems.length === 0}
                        style={{ padding: '6px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}
                    >
                        Simpan Nota Pesanan
                    </button>
                </div>
            </form>

            {/* Riwayat PO List */}
            <h3>Riwayat Nota Pesanan (PO) Terdaftar</h3>
            {listLoading && <p>Memuat daftar riwayat PO...</p>}
            {!listLoading && (
                <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th>Tanggal Pengiriman</th>
                            <th>Nama Supplier</th>
                            <th style={{ textAlign: 'right' }}>Jumlah Item</th>
                            <th style={{ textAlign: 'right' }}>Total Nilai Pesanan</th>
                            <th>Catatan</th>
                            <th style={{ textAlign: 'center', width: '180px' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {poList.map(po => {
                            const totalNilai = po.items.reduce((sum, item) => sum + Number(item.subtotal), 0);
                            return (
                                <tr key={po.id}>
                                    <td>{po.tanggal.split('T')[0]}</td>
                                    <td>{po.supplier ? po.supplier.nama : '—'}</td>
                                    <td style={{ textAlign: 'right' }}>{po.items.length} jenis bahan</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Rp{totalNilai.toLocaleString('id-ID')}</td>
                                    <td>{po.catatan || '—'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            onClick={() => { setPrintPoData(po); setIsPrinting(true); }}
                                            style={{ padding: '3px 10px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer' }}
                                        >
                                            Cetak Nota (PO)
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {poList.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '10px' }}>
                                    Belum ada data Nota Pesanan (PO) untuk periode ini.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};
