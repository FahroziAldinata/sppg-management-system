import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Table } from '../../components/Table';
import Dropdown from '../../components/Dropdown';
import { Skeleton } from '../../components/Skeleton';

export const DokumenResmiPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const [tab, setTab] = useState('generate'); // 'generate' (Penerbitan Baru) atau 'list' (Daftar Terbitan)
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [dokumenList, setDokumenList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [pdfUrl, setPdfUrl] = useState('');
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

    const [dokumenForm, setDokumenForm] = useState({ jenisDokumen: '', nomorDokumen: '' });

    // Fetch periods on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode.'));
    }, []);

    const loadDokumenList = async (pid) => {
        if (!pid) return;
        setLoading(true);
        try {
            const r = await request(`/akuntan/dokumen-resmi?periodeId=${pid}`);
            if (r.ok) {
                setDokumenList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar dokumen resmi' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setLoading(false);
        }
    };

    // Load list when period changes
    useEffect(() => {
        if (periodeId) {
            loadDokumenList(periodeId);
        }
    }, [periodeId]);

    const generateDokumen = async (e) => {
        if (e) e.preventDefault();
        setPreviewData(null);

        const { jenisDokumen, nomorDokumen } = dokumenForm;

        if (!periodeId) {
            toast.error('Periode wajib dipilih.');
            return;
        }
        if (!jenisDokumen) {
            toast.error('Jenis dokumen wajib dipilih.');
            return;
        }
        if ((jenisDokumen === 'LPA' || jenisDokumen === 'BAPSD') && !nomorDokumen) {
            toast.error('Nomor dokumen wajib diisi untuk LPA dan BAPSD.');
            return;
        }

        setLoading(true);
        try {
            if (jenisDokumen === 'LPA' || jenisDokumen === 'LR' || jenisDokumen === 'SPTJ' || jenisDokumen === 'BAPSD') {
                let url = '';
                if (jenisDokumen === 'LPA') {
                    url = `/laporan/lpa/pdf?periodeId=${periodeId}&nomorDokumen=${encodeURIComponent(nomorDokumen.trim())}`;
                } else if (jenisDokumen === 'LR') {
                    url = `/laporan/lpa/pdf?periodeId=${periodeId}&isLr=true`;
                } else if (jenisDokumen === 'SPTJ') {
                    url = `/laporan/sptj/pdf?periodeId=${periodeId}`;
                } else if (jenisDokumen === 'BAPSD') {
                    url = `/laporan/bapsd/pdf?periodeId=${periodeId}&nomorDokumen=${encodeURIComponent(nomorDokumen.trim())}`;
                }

                const r = await request(url);
                if (r.ok) {
                    const blob = new Blob([await r.blob()], { type: 'application/pdf' });
                    const objectUrl = URL.createObjectURL(blob);
                    setPdfUrl(objectUrl);
                    setIsPdfModalOpen(true);
                    setPreviewData({ type: jenisDokumen, nomorDokumen });
                } else {
                    const d = await r.json().catch(() => ({ error: `Gagal membuat PDF ${jenisDokumen}` }));
                    toast.error(d.error || `Gagal membuat PDF ${jenisDokumen}`);
                }
            } else {
                const query = new URLSearchParams({
                    periodeId,
                    jenisDokumen,
                    nomorDokumen: nomorDokumen || ''
                }).toString();

                const r = await request(`/akuntan/dokumen-resmi/generate?${query}`);
                if (r.ok) {
                    setPreviewData(await r.json());
                } else {
                    const d = await r.json().catch(() => ({ error: 'Gagal men-generate preview dokumen' }));
                    toast.error(d.error);
                }
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        } finally {
            setLoading(false);
        }
    };

    const publishDokumen = async () => {        
        const { jenisDokumen, nomorDokumen } = dokumenForm;

        if (!periodeId) {
            toast.error('Periode wajib dipilih.');
            return;
        }
        if (!jenisDokumen) {
            toast.error('Jenis dokumen wajib dipilih.');
            return;
        }
        if (jenisDokumen === 'LR') {
            toast.error('Laporan Resume (LR) tidak dapat diterbitkan sebagai Dokumen Resmi.');
            return;
        }

        try {
            const r = await request('/akuntan/dokumen-resmi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    periodeId,
                    jenisDokumen,
                    nomorDokumen: nomorDokumen || null
                })
            });

            if (r.ok) {
                toast.success('Dokumen resmi berhasil diterbitkan.');
                setDokumenForm({ jenisDokumen: '', nomorDokumen: '' });
                setPreviewData(null);
                loadDokumenList(periodeId);
                setTab('list');
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                toast.error(d.error || 'Gagal menerbitkan dokumen resmi');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const deleteDokumen = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin membatalkan penerbitan dokumen resmi ini?')) return;
        try {
            const r = await request(`/akuntan/dokumen-resmi/${id}`, {
                method: 'DELETE'
            });
            if (r.ok) {
                toast.success('Dokumen resmi berhasil dihapus.');
                loadDokumenList(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal menghapus dokumen resmi' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const tabStyle = (t) => ({
        padding: '10px 24px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '14px',
        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
        backgroundColor: tab === t ? 'var(--btn-primary-bg)' : 'var(--bg-elevated)',
        color: tab === t ? 'var(--btn-primary-text)' : 'var(--text-muted)',
        borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
        transition: 'all 0.15s ease'
    });

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Dokumen Resmi (Generator &amp; Publikasi)</h2>
            
            {/* Pilihan Periode (shared) */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '20px',
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
                    Pilih Periode Aktif
                </label>
                <Dropdown style={{ width: '100%' }} value={periodeId} onChange={val => setPeriodeId(val)} options={periods.map(p => ({ value: p.id, label: `${p.tanggalMulai} - ${p.tanggalSelesai}` }))} />
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '25px' }}>
                <button onClick={() => setTab('generate')} style={tabStyle('generate')}>
                    Penerbitan Baru
                </button>
                <button onClick={() => setTab('list')} style={tabStyle('list')}>
                    Daftar Terbitan
                </button>
            </div>

            {tab === 'generate' && (
                <div>
                    {/* Form Generate */}
                    <form onSubmit={generateDokumen} style={{
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
                        <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Generate Dokumen</h3>
                        
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
                                    Jenis Dokumen
                                </label>
                                <Dropdown
                                    value={dokumenForm.jenisDokumen}
                                    onChange={val => setDokumenForm(prev => ({ ...prev, jenisDokumen: val }))}
                                    options={[
                                        { value: '', label: '-- Pilih Jenis --' },
                                        { value: 'LPA', label: 'LPA (Laporan Pertanggungjawaban Anggaran)' },
                                        { value: 'LR', label: 'LR (Laporan Resume Penerimaan-Pengeluaran)' },
                                        { value: 'SPTJ', label: 'SPTJ (Surat Pernyataan Tanggung Jawab)' },
                                        { value: 'BAPSD', label: 'BAPSD (Berita Acara Pengalihan Sisa Dana)' }
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
                                    Nomor Dokumen
                                </label>
                                <input
                                    type="text"
                                    placeholder="Nomor Dokumen (LPA / BAPSD)"
                                    value={dokumenForm.nomorDokumen}
                                    onChange={e => setDokumenForm(prev => ({ ...prev, nomorDokumen: e.target.value }))}
                                    className="form-field"
                                    disabled={['SPTJ', 'LR'].includes(dokumenForm.jenisDokumen)}
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
                                Preview &amp; Terbit
                            </button>
                        </div>
                    </form>

                    {/* Area Preview Data & Tombol Publish */}
                    {previewData && (
                        <div style={{
                            border: '1px dashed var(--border)',
                            padding: '24px',
                            marginBottom: '30px',
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <h4 style={{ marginTop: '0', marginBottom: '16px', color: 'var(--text)' }}>Preview Data Dokumen Resmi</h4>
                            <div style={{
                                padding: '16px',
                                backgroundColor: 'var(--bg)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text)',
                                marginBottom: '16px',
                                fontWeight: '500'
                            }}>
                                📄 PDF Preview untuk <strong>{previewData.type}</strong> 
                                {previewData.nomorDokumen ? ` dengan Nomor Dokumen ${previewData.nomorDokumen}` : ''} telah disiapkan.
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsPdfModalOpen(true)}
                                    className="btn-secondary"
                                    style={{
                                        padding: '10px 20px',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        backgroundColor: 'transparent',
                                        color: 'var(--text)'
                                    }}
                                >
                                    Buka Preview PDF
                                </button>
                                {previewData.type !== 'LR' && (
                                    <button
                                        type="button"
                                        onClick={publishDokumen}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: 'var(--btn-primary-bg)',
                                            color: 'var(--btn-primary-text)',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '14px'
                                        }}
                                    >
                                        Terbitkan Dokumen Resmi
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === 'list' && (
                <div>
                    <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Dokumen Resmi Diterbitkan</h3>
                    {loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <Skeleton height="40px" />
                            <Skeleton height="40px" />
                            <Skeleton height="40px" />
                            <Skeleton height="40px" />
                            <Skeleton height="40px" />
                        </div>
                    )}
                    {!loading && <Table
                        columns={[
                            {
                                key: 'jenisDokumen',
                                header: 'Jenis Dokumen',
                                render: (v) => <strong style={{ color: 'var(--text)' }}>{v}</strong>
                            },
                            { key: 'nomorDokumen', header: 'Nomor Dokumen', render: (v) => v || '—' },
                            { key: 'createdBy', header: 'Diterbitkan Oleh', render: (v) => v?.nama || '—' },
                            {
                                key: 'createdAt',
                                header: 'Tanggal Terbit',
                                render: (v) => new Date(v).toLocaleString('id-ID')
                            },
                            {
                                key: 'id',
                                header: 'Aksi',
                                render: (v) => (
                                    <button
                                        onClick={() => deleteDokumen(v)}
                                        style={{
                                            padding: '4px 8px',
                                            backgroundColor: 'var(--color-danger-muted)',
                                            color: 'var(--color-danger)',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '12px'
                                        }}
                                    >
                                        Batal Terbit
                                    </button>
                                )
                            }
                        ]}
                        data={dokumenList}
                        emptyText="Belum ada dokumen resmi diterbitkan untuk periode ini."
                    />}
                </div>
            )}

            {/* PDF Preview Modal */}
            {isPdfModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '24px',
                        width: '85%',
                        maxWidth: '1000px',
                        height: '85vh',
                        boxShadow: 'var(--shadow-hover)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                                Preview PDF Dokumen Resmi
                            </h3>
                            <button 
                                onClick={() => {
                                    setIsPdfModalOpen(false);
                                }} 
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    padding: '0 8px'
                                }}
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                            <iframe src={pdfUrl} width="100%" height="100%" style={{ border: 'none' }} title="PDF Preview" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={() => {
                                    setIsPdfModalOpen(false);
                                }} 
                                className="btn-secondary"
                                style={{
                                    padding: '10px 20px',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    backgroundColor: 'transparent',
                                    color: 'var(--text)'
                                }}
                            >
                                Tutup
                            </button>
                            {previewData && previewData.type !== 'LR' && (
                                <button 
                                    onClick={() => {
                                        setIsPdfModalOpen(false);
                                        publishDokumen();
                                    }} 
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: 'var(--btn-primary-bg)',
                                        color: 'var(--btn-primary-text)',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    Terbitkan Dokumen
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
