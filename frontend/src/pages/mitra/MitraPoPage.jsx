import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { renderDate } from '../../components/Table';
import Dropdown from '../../components/Dropdown';
import { NumberInput } from '../../components/NumberInput';
import { Skeleton } from '../../components/Skeleton';

export const MitraPoPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [poList, setPoList] = useState([]);
    const [listLoading, setListLoading] = useState(false);

    // Detail modal
    const [detailPoData, setDetailPoData] = useState(null);

    // Inline editing
    const [checkedItems, setCheckedItems] = useState(new Set());
    const [draftEdits, setDraftEdits] = useState({});
    const [saving, setSaving] = useState(null); // poId being saved, or null

    // Fetch periods on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setSelectedPeriodId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode.'));
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

    // Toggle checkbox "Beli" for an item
    const toggleItem = (itemId, item) => {
        setCheckedItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
                setDraftEdits(e => { const n = { ...e }; delete n[itemId]; return n; });
            } else {
                next.add(itemId);
                setDraftEdits(e => ({
                    ...e,
                    [itemId]: {
                        qtyRealisasi: item.qtyRealisasi !== null && item.qtyRealisasi !== undefined ? String(item.qtyRealisasi) : String(item.qty),
                        hargaSatuanRealisasi: item.hargaSatuanRealisasi !== null && item.hargaSatuanRealisasi !== undefined ? String(item.hargaSatuanRealisasi) : String(item.hargaSatuan)
                    }
                }));
            }
            return next;
        });
    };

    // Update draft value for a checked item
    const updateDraft = (itemId, field, val) => {
        setDraftEdits(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: val } }));
    };

    // Save all checked items for a single PO
    const handleSavePo = async (poId) => {
        const po = poList.find(p => p.id === poId);
        if (!po) return;
        const itemsToSave = po.items.filter(item => checkedItems.has(item.id));
        if (itemsToSave.length === 0) return toast.error('Centang item yang ingin disimpan realisasinya.');

        for (const item of itemsToSave) {
            const d = draftEdits[item.id];
            if (!d) return toast.error(`Realisasi untuk ${item.bahanPokok?.nama} belum diisi.`);
            if (isNaN(parseFloat(d.qtyRealisasi)) || parseFloat(d.qtyRealisasi) < 0) return toast.error(`Qty realisasi untuk ${item.bahanPokok?.nama} tidak valid.`);
            if (isNaN(parseFloat(d.hargaSatuanRealisasi)) || parseFloat(d.hargaSatuanRealisasi) < 0) return toast.error(`Harga realisasi untuk ${item.bahanPokok?.nama} tidak valid.`);
        }

        setSaving(poId);
        try {
            const r = await request(`/mitra/po/${poId}/realisasi`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: itemsToSave.map(item => ({
                        itemId: item.id,
                        qtyRealisasi: parseFloat(draftEdits[item.id].qtyRealisasi),
                        hargaSatuanRealisasi: parseFloat(draftEdits[item.id].hargaSatuanRealisasi)
                    }))
                })
            });
            if (r.ok) {
                toast.success('Realisasi berhasil disimpan.');
                // Clear draft for saved items
                setCheckedItems(prev => {
                    const next = new Set(prev);
                    itemsToSave.forEach(i => { next.delete(i.id); setDraftEdits(e => { const n = { ...e }; delete n[i.id]; return n; }); });
                    return next;
                });
                loadPoList(selectedPeriodId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal menyimpan realisasi' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error('Koneksi server gagal.');
        } finally {
            setSaving(null);
        }
    };

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

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Realisasi Belanja &amp; Nota Pesanan (Mitra)</h2>
            
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

            {/* Riwayat PO List — Grouped per Tanggal → Supplier, Inline Editing */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Riwayat Nota Pesanan (PO) Terdaftar</h3>
            {listLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                                    {group.ros.some(p => p.status !== 'DIAJUKAN') && <span>Realisasi: <strong>Rp{totalRealisasi.toLocaleString('id-ID')}</strong></span>}
                                    <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        {allStatuses.map(st => (
                                            <span key={st} style={{ ...getStatusStyle(st), padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 'bold' }}>{st}</span>
                                        ))}
                                    </span>
                                </div>
                            </div>
                            <div style={{ padding: '10px 20px 20px' }}>
                                {group.ros.map(po => {
                                    const isSaving = saving === po.id;
                                    const poChecked = po.items.filter(i => checkedItems.has(i.id));
                                    return (
                                        <div key={po.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginTop: '10px', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', backgroundColor: 'var(--bg)', fontSize: '12px', borderBottom: '1px solid var(--border)' }}>
                                                <span>#{po.id.slice(-6)} — {po.catatan || 'tanpa catatan'}</span>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                    {po.status === 'DIAJUKAN' && poChecked.length > 0 && (
                                                        <button onClick={() => handleSavePo(po.id)} disabled={isSaving} style={{ padding: '3px 10px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 'bold' }}>
                                                            {isSaving ? 'Menyimpan...' : 'Simpan Realisasi'}
                                                        </button>
                                                    )}
                                                    <button onClick={() => setDetailPoData(po)} style={{ padding: '3px 8px', backgroundColor: 'var(--border)', color: 'var(--text)', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}>Detail</button>
                                                </div>
                                            </div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#f9f9f9', color: 'var(--text-muted)' }}>
                                                        {po.status === 'DIAJUKAN' && <th style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontWeight: 600, width: '40px' }}>Beli</th>}
                                                        <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Bahan</th>
                                                        <th style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Sat</th>
                                                        <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Qty Diminta</th>
                                                        <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Harga Diminta</th>
                                                        {po.status === 'DIAJUKAN' ? (
                                                            <>
                                                                <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600, minWidth: '90px' }}>Qty Realisasi</th>
                                                                <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600, minWidth: '110px' }}>Harga Realisasi</th>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Qty Realisasi</th>
                                                                <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Harga Realisasi</th>
                                                            </>
                                                        )}
                                                        <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {po.items.map(item => {
                                                        const checked = checkedItems.has(item.id);
                                                        const draft = draftEdits[item.id];
                                                        const isRealized = item.qtyRealisasi !== null;
                                                        const qtyRealVal = checked && draft ? draft.qtyRealisasi : (isRealized ? item.qtyRealisasi : item.qty);
                                                        const hargaRealVal = checked && draft ? draft.hargaSatuanRealisasi : (isRealized ? item.hargaSatuanRealisasi : item.hargaSatuan);
                                                        const subtotalReal = parseFloat(qtyRealVal) * parseFloat(hargaRealVal);
                                                        return (
                                                            <tr key={item.id} style={{ backgroundColor: checked ? 'rgba(40, 167, 69, 0.04)' : 'transparent' }}>
                                                                {po.status === 'DIAJUKAN' && (
                                                                    <td style={{ padding: '5px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                                                                        <input type="checkbox" checked={checked} onChange={() => toggleItem(item.id, item)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                                                                    </td>
                                                                )}
                                                                <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border)' }}>{item.bahanPokok?.nama}</td>
                                                                <td style={{ padding: '5px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{item.bahanPokok?.satuan}</td>
                                                                <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>{Number(item.qty).toLocaleString('id-ID')}</td>
                                                                <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>Rp{Number(item.hargaSatuan).toLocaleString('id-ID')}</td>
                                                                {po.status === 'DIAJUKAN' ? (
                                                                    <>
                                                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                                                                            {checked ? (
                                                                                <input type="number" step="0.001" className="form-field" style={{ textAlign: 'right', width: '85px' }} value={draft?.qtyRealisasi ?? ''} onChange={e => updateDraft(item.id, 'qtyRealisasi', e.target.value)} />
                                                                            ) : (
                                                                                <span style={{ color: 'var(--text-muted)' }}>{isRealized ? Number(item.qtyRealisasi).toLocaleString('id-ID') : '—'}</span>
                                                                            )}
                                                                        </td>
                                                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                                                                            {checked ? (
                                                                                <NumberInput className="form-field" style={{ textAlign: 'right', width: '100px' }} value={draft?.hargaSatuanRealisasi === '' ? '' : Number(draft?.hargaSatuanRealisasi || 0)} onChange={val => updateDraft(item.id, 'hargaSatuanRealisasi', val)} />
                                                                            ) : (
                                                                                <span style={{ color: 'var(--text-muted)' }}>{isRealized ? `Rp${Number(item.hargaSatuanRealisasi).toLocaleString('id-ID')}` : '—'}</span>
                                                                            )}
                                                                        </td>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>{isRealized ? Number(item.qtyRealisasi).toLocaleString('id-ID') : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                                                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>{isRealized ? `Rp${Number(item.hargaSatuanRealisasi).toLocaleString('id-ID')}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                                                                    </>
                                                                )}
                                                                <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
                                                                    {isRealized || checked ? `Rp${Math.round(subtotalReal).toLocaleString('id-ID')}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })}
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

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9f9f9', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Bahan</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Sat</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Qty Diminta</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Harga Diminta</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Subtotal Diminta</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Qty Realisasi</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Harga Realisasi</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Subtotal Realisasi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detailPoData.items.map(item => (
                                    <tr key={item.id}>
                                        <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border)' }}>{item.bahanPokok?.nama}</td>
                                        <td style={{ padding: '5px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{item.bahanPokok?.satuan}</td>
                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>{Number(item.qty).toLocaleString('id-ID')}</td>
                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>Rp{Number(item.hargaSatuan).toLocaleString('id-ID')}</td>
                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>Rp{Number(item.subtotal).toLocaleString('id-ID')}</td>
                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                                            {item.qtyRealisasi !== null ? Number(item.qtyRealisasi).toLocaleString('id-ID') : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                                            {item.hargaSatuanRealisasi !== null ? `Rp${Number(item.hargaSatuanRealisasi).toLocaleString('id-ID')}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '5px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                                            {item.subtotalRealisasi !== null ? `Rp${Number(item.subtotalRealisasi).toLocaleString('id-ID')}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

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
        </div>
    );
};
