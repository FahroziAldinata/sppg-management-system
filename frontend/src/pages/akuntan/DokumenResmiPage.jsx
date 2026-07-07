import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

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
            <h2>Dokumen Resmi (Generator &amp; Publikasi)</h2>
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

            {/* Form Generate */}
            <h3>Generate Dokumen</h3>
            <form onSubmit={generateDokumen} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Jenis Dokumen: </label>
                    <select
                        value={dokumenForm.jenisDokumen}
                        onChange={e => setDokumenForm(prev => ({ ...prev, jenisDokumen: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '5px' }}
                    >
                        <option value="">-- Pilih Jenis --</option>
                        <option value="LPA">LPA (Laporan Pertanggungjawaban Anggaran)</option>
                        <option value="SPTJ">SPTJ (Surat Pernyataan Tanggung Jawab)</option>
                        <option value="BAPSD">BAPSD (Berita Acara Penyerahan Selisih Dana)</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Nomor Dokumen: </label>
                    <input
                        type="text"
                        placeholder="Nomor Dokumen"
                        value={dokumenForm.nomorDokumen}
                        onChange={e => setDokumenForm(prev => ({ ...prev, nomorDokumen: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>
                <div style={{ marginTop: '10px' }}>
                    <button type="submit" style={{ padding: '6px 15px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        Preview Dokumen
                    </button>
                </div>
            </form>

            {/* Area Preview Data & Tombol Publish */}
            {previewData && (
                <div style={{ border: '1px dashed var(--border)', padding: '15px', marginBottom: '25px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                    {/* ponytail: unify shade pastel to bg-elevated */}
                    <h4 style={{ marginTop: '0' }}>Preview Data Dokumen Resmi</h4>
                    <pre style={{ overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '300px', fontSize: '13px', backgroundColor: 'var(--bg)', color: 'var(--text)', padding: '10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                        {JSON.stringify(previewData, null, 2)}
                    </pre>
                    <button
                        type="button"
                        onClick={publishDokumen}
                        style={{ padding: '6px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer', marginTop: '10px' }}
                    >
                        Terbitkan Dokumen Resmi
                    </button>
                </div>
            )}

            {/* Tabel Dokumen Diterbitkan */}
            <h3>Daftar Dokumen Resmi Diterbitkan</h3>
            {loading && <p>Memuat daftar dokumen...</p>}
            {!loading && (
                <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th>Jenis Dokumen</th>
                            <th>Nomor Dokumen</th>
                            <th>Diterbitkan Oleh</th>
                            <th>Tanggal Terbit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dokumenList.map(d => (
                            <tr key={d.id}>
                                <td style={{ fontWeight: 'bold' }}>{d.jenisDokumen}</td>
                                <td>{d.nomorDokumen || '—'}</td>
                                <td>{d.createdBy?.nama || '—'}</td>
                                <td>{new Date(d.createdAt).toLocaleString('id-ID')}</td>
                            </tr>
                        ))}
                        {dokumenList.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '10px' }}>
                                    Belum ada dokumen resmi diterbitkan untuk periode ini.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};
