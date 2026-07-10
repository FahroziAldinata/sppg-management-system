import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Table } from '../../components/Table';

export const DokumenResmiPage = () => {
    const { request } = useApi();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [dokumenList, setDokumenList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [previewData, setPreviewData] = useState(null);

    const [dokumenForm, setDokumenForm] = useState({ jenisDokumen: '', nomorDokumen: '' });

    // Fetch periods on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => setError('Gagal memuat daftar periode.'));
    }, []);

    const loadDokumenList = async (pid) => {
        if (!pid) return;
        setLoading(true);
        setError('');
        try {
            const r = await request(`/akuntan/dokumen-resmi?periodeId=${pid}`);
            if (r.ok) {
                setDokumenList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar dokumen resmi' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
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
        setError('');
        setSuccess('');
        setPreviewData(null);

        const { jenisDokumen, nomorDokumen } = dokumenForm;

        if (!periodeId) {
            setError('Periode wajib dipilih.');
            return;
        }
        if (!jenisDokumen) {
            setError('Jenis dokumen wajib dipilih.');
            return;
        }
        if ((jenisDokumen === 'LPA' || jenisDokumen === 'BAPSD') && !nomorDokumen) {
            setError('Nomor dokumen wajib diisi untuk LPA dan BAPSD.');
            return;
        }

        try {
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
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    const publishDokumen = async () => {
        setError('');
        setSuccess('');
        
        const { jenisDokumen, nomorDokumen } = dokumenForm;

        if (!periodeId) {
            setError('Periode wajib dipilih.');
            return;
        }
        if (!jenisDokumen) {
            setError('Jenis dokumen wajib dipilih.');
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
                setSuccess('Dokumen resmi berhasil diterbitkan.');
                setDokumenForm({ jenisDokumen: '', nomorDokumen: '' });
                setPreviewData(null);
                loadDokumenList(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Gagal menerbitkan dokumen resmi');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Dokumen Resmi (Generator &amp; Publikasi)</h2>
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
                        <select
                            value={dokumenForm.jenisDokumen}
                            onChange={e => setDokumenForm(prev => ({ ...prev, jenisDokumen: e.target.value }))}
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
                            <option value="LPA">LPA (Laporan Pertanggungjawaban Anggaran)</option>
                            <option value="SPTJ">SPTJ (Surat Pernyataan Tanggung Jawab)</option>
                            <option value="BAPSD">BAPSD (Berita Acara Penyerahan Selisih Dana)</option>
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
                            Nomor Dokumen
                        </label>
                        <input
                            type="text"
                            placeholder="Nomor Dokumen"
                            value={dokumenForm.nomorDokumen}
                            onChange={e => setDokumenForm(prev => ({ ...prev, nomorDokumen: e.target.value }))}
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
                        Preview Dokumen
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
                    <pre style={{
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '300px',
                        fontSize: '13px',
                        backgroundColor: 'var(--bg)',
                        color: 'var(--text)',
                        padding: '16px',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)'
                    }}>
                        {JSON.stringify(previewData, null, 2)}
                    </pre>
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
                            marginTop: '16px',
                            fontWeight: 600,
                            fontSize: '14px'
                        }}
                    >
                        Terbitkan Dokumen Resmi
                    </button>
                </div>
            )}

            {/* Tabel Dokumen Diterbitkan */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Dokumen Resmi Diterbitkan</h3>
            {loading && <p style={{ color: 'var(--text-muted)' }}>Memuat daftar dokumen...</p>}
            <Table
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
                    }
                ]}
                data={dokumenList}
                emptyText="Belum ada dokumen resmi diterbitkan untuk periode ini."
            />
        </div>
    );
};
