import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../context/ToastContext';
import { Table } from '../../../components/Table';

export const LaporanPage = () => {
    const { request } = useApi();
  const toast = useToast();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [akunList, setAkunList] = useState([]);
    const [akunId, setAkunId] = useState('');
    
    const [jenisLaporan, setJenisLaporan] = useState('BKU'); // 'BKU', 'BP', 'LPA', 'SPTJ', atau 'BAPSD'
    const [reportData, setReportData] = useState([]);
    const [lpaData, setLpaData] = useState(null);
    const [sptjData, setSptjData] = useState(null);
    const [bapsdData, setBapsdData] = useState(null);
    const [nomorDokumen, setNomorDokumen] = useState('');
    const [loading, setLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    // Fetch periods & accounts on mount
    useEffect(() => {
        request('/aslap/periode')
            .then(r => r.json())
            .then(d => {
                setPeriods(d);
                if (d.length) setPeriodeId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar periode'));

        request('/akuntan/akun')
            .then(r => r.json())
            .then(d => {
                setAkunList(d);
                if (d.length) setAkunId(d[0].id);
            })
            .catch(() => toast.error('Gagal memuat daftar akun'));
    }, []);

    // Preview LPA sebagai PDF: fetch dengan header auth, buka blob di tab baru
    const previewLpaPdf = async () => {
        if (!nomorDokumen || !nomorDokumen.trim()) {
            toast.error('Isi Nomor Dokumen dulu sebelum preview PDF');
            return;
        }
        if (!periodeId) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        setPdfLoading(true);
        try {
            const r = await request(
                `/laporan/lpa/pdf?periodeId=${periodeId}&nomorDokumen=${encodeURIComponent(nomorDokumen.trim())}`
            );
            if (!r.ok) {
                // Error response dari server adalah JSON, bukan PDF
                const errData = await r.json().catch(() => ({ error: 'Gagal membuat PDF LPA' }));
                toast.error(errData.error || 'Gagal membuat PDF LPA');
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            const objectUrl = URL.createObjectURL(blob);
            const tab = window.open(objectUrl, '_blank');
            // Revoke setelah 30 detik — cukup waktu browser load PDF,
            // tidak perlu revoke on-close karena tidak bisa detect tab close secara reliable.
            setTimeout(() => {
                URL.revokeObjectURL(objectUrl);
            }, 30000);
            if (!tab) {
                toast.error('Pop-up diblokir browser. Izinkan pop-up untuk halaman ini.');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat membuat PDF');
        } finally {
            setPdfLoading(false);
        }
    };

    // Preview BKU sebagai PDF: fetch dengan header auth, buka blob di tab baru
    const previewBkuPdf = async () => {
        if (!periodeId) {
            toast.error('Pilih periode terlebih dahulu');
            return;
        }
        setPdfLoading(true);
        try {
            const r = await request(
                `/laporan/bku/pdf?periodeId=${periodeId}`
            );
            if (!r.ok) {
                const errData = await r.json().catch(() => ({ error: 'Gagal membuat PDF BKU' }));
                toast.error(errData.error || 'Gagal membuat PDF BKU');
                return;
            }
            const blob = new Blob([await r.blob()], { type: 'application/pdf' });
            const objectUrl = URL.createObjectURL(blob);
            const tab = window.open(objectUrl, '_blank');
            setTimeout(() => {
                URL.revokeObjectURL(objectUrl);
            }, 30000);
            if (!tab) {
                toast.error('Pop-up diblokir browser. Izinkan pop-up untuk halaman ini.');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan saat membuat PDF');
        } finally {
            setPdfLoading(false);
        }
    };

    // Load BKU Laporan
    const loadBKU = async (pid) => {
        if (!pid) return;
        setLoading(true);
        try {
            const r = await request(`/laporan/bku?periodeId=${pid}`);
            if (r.ok) {
                const resJson = await r.json();
                setReportData(resJson.data?.transaksi || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Buku Kas Umum' }));
                toast.error(d.error);
                setReportData([]);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    // Load BP Laporan
    const loadBP = async (pid, aid) => {
        if (!pid || !aid) return;
        setLoading(true);
        try {
            const r = await request(`/laporan/bp?periodeId=${pid}&akunId=${aid}`);
            if (r.ok) {
                const resJson = await r.json();
                setReportData(resJson.data || []);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Buku Pembantu' }));
                toast.error(d.error);
                setReportData([]);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    // Load LPA Laporan
    const loadLPA = async (pid, nomorDok) => {
        if (!nomorDok || !nomorDok.trim()) {
            toast.error('Isi Nomor Dokumen dulu');
            setLpaData(null);
            return;
        }
        if (!pid) return;

        setLoading(true);
        try {
            const r = await request(`/laporan/lpa?periodeId=${pid}&nomorDokumen=${encodeURIComponent(nomorDok.trim())}`);
            if (r.ok) {
                const resJson = await r.json();
                setLpaData(resJson.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Laporan Penggunaan Anggaran (LPA)' }));
                toast.error(d.error);
                setLpaData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setLpaData(null);
        } finally {
            setLoading(false);
        }
    };

    // Trigger load berdasarkan perubahan pilihan filter (kecuali nomorDokumen untuk LPA/BAPSD)
    useEffect(() => {
        if (jenisLaporan === 'BKU') {
            loadBKU(periodeId);
            setLpaData(null);
            setSptjData(null);
            setBapsdData(null);
        } else if (jenisLaporan === 'BP') {
            loadBP(periodeId, akunId);
            setLpaData(null);
            setSptjData(null);
            setBapsdData(null);
        } else if (jenisLaporan === 'LPA') {
            setReportData([]);
            setLpaData(null);
            setSptjData(null);
            setBapsdData(null);
        } else if (jenisLaporan === 'SPTJ') {
            loadSPTJ(periodeId);
            setReportData([]);
            setLpaData(null);
            setBapsdData(null);
        } else if (jenisLaporan === 'BAPSD') {
            setReportData([]);
            setLpaData(null);
            setSptjData(null);
            setBapsdData(null);
        }
    }, [jenisLaporan, periodeId, akunId]);

    // Load SPTJ Laporan
    async function loadSPTJ(pid) {
        if (!pid) return;
        setLoading(true);
        try {
            const r = await request(`/laporan/sptj?periodeId=${pid}`);
            if (r.ok) {
                const resJson = await r.json();
                setSptjData(resJson.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Surat Pernyataan Tanggung Jawab' }));
                toast.error(d.error);
                setSptjData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setSptjData(null);
        } finally {
            setLoading(false);
        }
    }

    // Load BAPSD Laporan
    async function loadBAPSD(pid, nomorDok) {
        if (!nomorDok || !nomorDok.trim()) {
            toast.error('Isi Nomor Dokumen dulu');
            setBapsdData(null);
            return;
        }
        if (!pid) return;

        setLoading(true);
        try {
            const r = await request(`/laporan/bapsd?periodeId=${pid}&nomorDokumen=${encodeURIComponent(nomorDok.trim())}`);
            if (r.ok) {
                const resJson = await r.json();
                setBapsdData(resJson.data || null);
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat Berita Acara Pengalihan Sisa Dana (BAPSD)' }));
                toast.error(d.error);
                setBapsdData(null);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi');
            setBapsdData(null);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Laporan Keuangan SPPG</h2>
            {error && <div style={{ color: 'red', marginBottom: '10px', padding: '8px', border: '1px solid red' }}>{error}</div>}

            {/* Filter Section Card */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                boxShadow: 'var(--shadow)',
                marginBottom: '30px',
                width: '40%',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
            }}>
                {/* Pilihan Jenis Laporan */}
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
                        Jenis Laporan
                    </label>
                    <select
                        value={jenisLaporan}
                        onChange={e => {
                            setJenisLaporan(e.target.value);
                            setReportData([]);
                            setLpaData(null);
                            setSptjData(null);
                            setBapsdData(null);
                        }}
                        className="form-field"
                    >
                        <option value="BKU">Buku Kas Umum (BKU)</option>
                        <option value="BP">Buku Pembantu per Akun (BP)</option>
                        <option value="LPA">Laporan Penggunaan Anggaran (LPA)</option>
                        <option value="SPTJ">Surat Pernyataan Tanggung Jawab (SPTJ)</option>
                        <option value="BAPSD">Berita Acara Pengalihan Sisa Dana (BAPSD)</option>
                    </select>
                </div>

                {/* Periode */}
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
                        Periode
                    </label>
                    <select
                        value={periodeId}
                        onChange={e => setPeriodeId(e.target.value)}
                        className="form-field"
                    >
                        {periods.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.tanggalMulai} - {p.tanggalSelesai}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Conditional BP Akun Filter */}
                {jenisLaporan === 'BP' && (
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
                            Akun Buku Pembantu
                        </label>
                        <select
                            value={akunId}
                            onChange={e => setAkunId(e.target.value)}
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
                            <option value="">-- Pilih Akun --</option>
                            {akunList.map(a => (
                                <option key={a.id} value={a.id}>
                                    [{a.kode}] {a.nama} ({a.tipe})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Conditional LPA / BAPSD Document Filter */}
                {(jenisLaporan === 'LPA' || jenisLaporan === 'BAPSD') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
                                Nomor Dokumen
                            </label>
                            <input
                                type="text"
                                placeholder="Nomor Dokumen"
                                value={nomorDokumen}
                                onChange={e => setNomorDokumen(e.target.value)}
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
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (jenisLaporan === 'LPA') {
                                        loadLPA(periodeId, nomorDokumen);
                                    } else if (jenisLaporan === 'BAPSD') {
                                        loadBAPSD(periodeId, nomorDokumen);
                                    }
                                }}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--btn-primary-bg)',
                                    color: 'var(--btn-primary-text)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                }}
                            >
                                Tampilkan Laporan
                            </button>
                            {jenisLaporan === 'LPA' && (
                                <button
                                    type="button"
                                    id="btn-preview-pdf-lpa"
                                    onClick={previewLpaPdf}
                                    disabled={pdfLoading}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: pdfLoading ? 'var(--bg-elevated)' : 'var(--bg-elevated)',
                                        color: 'var(--text)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: pdfLoading ? 'not-allowed' : 'pointer',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        opacity: pdfLoading ? 0.65 : 1,
                                    }}
                                >
                                    {pdfLoading ? 'Membuat PDF…' : '📄 Preview PDF'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Loading Indicator */}
            {loading && <p>Memuat data laporan...</p>}

            {/* Render Tabel BKU & BP */}
            {!loading && (jenisLaporan === 'BKU' || jenisLaporan === 'BP') && (
                <div>
                    {jenisLaporan === 'BKU' && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                            <button
                                type="button"
                                id="btn-preview-pdf-bku"
                                onClick={previewBkuPdf}
                                disabled={pdfLoading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: pdfLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    opacity: pdfLoading ? 0.65 : 1,
                                }}
                            >
                                {pdfLoading ? 'Membuat PDF…' : '📄 Preview PDF'}
                            </button>
                        </div>
                    )}
                    <Table
                        columns={[
                            { key: 'tanggal', header: 'Tanggal' },
                            { key: 'noBukti', header: 'No Bukti' },
                            { key: 'uraian', header: 'Uraian' },
                            {
                                key: 'debet',
                                header: 'Debet',
                                align: 'right',
                                render: (v) => (
                                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        {Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}
                                    </span>
                                )
                            },
                            {
                                key: 'kredit',
                                header: 'Kredit',
                                align: 'right',
                                render: (v) => (
                                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        {Number(v) > 0 ? `Rp${Number(v).toLocaleString('id-ID')}` : '—'}
                                    </span>
                                )
                            },
                            {
                                key: 'saldoBerjalan',
                                header: 'Saldo Berjalan',
                                align: 'right',
                                render: (v) => (
                                    <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                        Rp{Number(v).toLocaleString('id-ID')}
                                    </strong>
                                )
                            }
                        ]}
                        data={reportData}
                        emptyText="Tidak ada data untuk laporan terpilih pada periode ini."
                    />
                </div>
            )}

            {/* Render Laporan LPA */}
            {!loading && jenisLaporan === 'LPA' && (
                <div>
                    {!lpaData ? (
                        <p style={{ fontStyle: 'italic', color: '#666' }}>
                            {!nomorDokumen.trim() 
                                ? 'Silakan masukkan Nomor Dokumen terlebih dahulu, lalu klik Tampilkan Laporan.' 
                                : 'Silakan klik tombol Tampilkan Laporan.'
                            }
                        </p>
                    ) : (
                        <div style={{ border: '1px solid var(--border)', padding: '15px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                            {/* ponytail: unify shade pastel to bg-elevated */}
                            <h4 style={{ textAlign: 'center', marginBottom: '20px' }}>
                                LAPORAN PERTANGGUNGJAWABAN PENGGUNAAN DANA
                            </h4>
                            
                            <table style={{ marginBottom: '20px', fontSize: '14px' }} cellPadding="3">
                                <tbody>
                                    <tr>
                                        <td><strong>Nama Lembaga</strong></td>
                                        <td>: {lpaData.namaLembaga}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Pejabat/Kepala</strong></td>
                                        <td>: {lpaData.namaPejabat} ({lpaData.jabatan})</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Nomor Dokumen</strong></td>
                                        <td>: {lpaData.nomorDokumen}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Periode</strong></td>
                                        <td>: {lpaData.periodeLabel}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Nomor Rekening VA</strong></td>
                                        <td>: {lpaData.nomorRekeningVA || '—'}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <Table
                                 columns={[
                                     {
                                         key: 'label',
                                         header: 'Kategori Penggunaan',
                                         render: (v, row) => row.isTotal ? <strong>{v}</strong> : v
                                     },
                                     {
                                         key: 'diajukan',
                                         header: 'Anggaran Diajukan (RAB)',
                                         align: 'right',
                                         render: (v, row) => (
                                             <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: row.isTotal ? 700 : 400 }}>
                                                 Rp{Number(v).toLocaleString('id-ID')}
                                             </span>
                                         )
                                     },
                                     {
                                         key: 'terealisasi',
                                         header: 'Realisasi (Aktual)',
                                         align: 'right',
                                         render: (v, row) => (
                                             <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: row.isTotal ? 700 : 400 }}>
                                                 Rp{Number(v).toLocaleString('id-ID')}
                                             </span>
                                         )
                                     },
                                     {
                                         key: 'sisa',
                                         header: 'Sisa Dana',
                                         align: 'right',
                                         render: (v, row) => (
                                             <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: row.isTotal ? 700 : 400 }}>
                                                 Rp{Number(v).toLocaleString('id-ID')}
                                             </span>
                                         )
                                     }
                                 ]}
                                 data={[
                                     ...lpaData.rincian,
                                     {
                                         label: 'Total',
                                         diajukan: lpaData.total.diajukan,
                                         terealisasi: lpaData.total.terealisasi,
                                         sisa: lpaData.total.sisa,
                                         isTotal: true
                                     }
                                 ]}
                             />
                             {false && (<table>

                                <thead>
                                    <tr style={{ backgroundColor: '#eaeaea' }}>
                                        <th>Kategori Penggunaan</th>
                                        <th>Anggaran Diajukan (RAB)</th>
                                        <th>Realisasi (Aktual)</th>
                                        <th>Sisa Dana</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lpaData.rincian.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.label}</td>
                                            <td style={{ textAlign: 'right' }}>Rp{item.diajukan.toLocaleString('id-ID')}</td>
                                            <td style={{ textAlign: 'right' }}>Rp{item.terealisasi.toLocaleString('id-ID')}</td>
                                            <td style={{ textAlign: 'right' }}>Rp{item.sisa.toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                                        <td>Total</td>
                                        <td style={{ textAlign: 'right' }}>Rp{lpaData.total.diajukan.toLocaleString('id-ID')}</td>
                                        <td style={{ textAlign: 'right' }}>Rp{lpaData.total.terealisasi.toLocaleString('id-ID')}</td>
                                        <td style={{ textAlign: 'right' }}>Rp{lpaData.total.sisa.toLocaleString('id-ID')}</td>
                                    </tr>
                                </tbody>
                             </table>)}
                            

                            <div style={{ float: 'right', textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
                                <p>{lpaData.tempatPelaporan || 'SPPG'}, {lpaData.tanggalPelaporan ? new Date(lpaData.tanggalPelaporan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
                                <p style={{ marginBottom: '60px' }}>Kepala SPPG</p>
                                <p><strong>{lpaData.namaPejabat}</strong></p>
                            </div>
                            <div style={{ clear: 'both' }}></div>
                        </div>
                    )}
                </div>
            )}

            {/* Render Laporan SPTJ */}
            {!loading && jenisLaporan === 'SPTJ' && (
                <div>
                    {!sptjData ? (
                        <p style={{ fontStyle: 'italic', color: '#666' }}>
                            Data SPTJ tidak ditemukan untuk periode ini.
                        </p>
                    ) : (
                        <div style={{ border: '1px solid var(--border)', padding: '15px', backgroundColor: 'var(--bg-elevated)', maxWidth: '650px', margin: '0 auto', borderRadius: 'var(--radius-md)' }}>
                            {/* ponytail: unify shade pastel to bg-elevated */}
                            <h4 style={{ textAlign: 'center', marginBottom: '5px' }}>
                                SURAT PERNYATAAN TANGGUNG JAWAB
                            </h4>
                            <p style={{ textAlign: 'center', margin: '0 0 25px 0', fontSize: '13px', color: '#444' }}>
                                SATUAN PELAYANAN PEMENUHAN GIZI (SPPG)
                            </p>

                            <p style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                Yang bertanda tangan di bawah ini, <strong>{sptjData.namaPejabat}</strong> selaku <strong>{sptjData.jabatan}</strong>, menyatakan bertanggung jawab penuh atas penggunaan dana pelayanan gizi pada periode ini dengan rincian sebagai berikut:
                            </p>

                            <table style={{ margin: '20px auto', fontSize: '14px', borderCollapse: 'collapse', width: '90%' }} cellPadding="8" border="1">
                                <tbody>
                                    <tr>
                                        <td><strong>Jumlah Penerimaan</strong></td>
                                        <td style={{ textAlign: 'right' }}>Rp{sptjData.jumlahPenerimaan.toLocaleString('id-ID')}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Jumlah Pengeluaran (Realisasi)</strong></td>
                                        <td style={{ textAlign: 'right', color: 'red' }}>Rp{sptjData.jumlahPengeluaran.toLocaleString('id-ID')}</td>
                                    </tr>
                                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                                        <td><strong>Sisa Dana / Selisih</strong></td>
                                        <td style={{ textAlign: 'right' }}>Rp{sptjData.sisaDana.toLocaleString('id-ID')}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <p style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                Demikian surat pernyataan pertanggungjawaban ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
                            </p>

                            <div style={{ float: 'right', textAlign: 'center', marginTop: '30px', fontSize: '14px', paddingRight: '20px' }}>
                                <p>{sptjData.tempatPelaporan || 'SPPG'}, {sptjData.tanggalPelaporan ? new Date(sptjData.tanggalPelaporan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
                                <p style={{ marginBottom: '60px' }}>Kepala SPPG</p>
                                <p><strong>{sptjData.namaPejabat}</strong></p>
                            </div>
                            <div style={{ clear: 'both' }}></div>
                        </div>
                    )}
                </div>
            )}

            {/* Render Laporan BAPSD */}
            {!loading && jenisLaporan === 'BAPSD' && (
                <div>
                    {!bapsdData ? (
                        <p style={{ fontStyle: 'italic', color: '#666' }}>
                            {!nomorDokumen.trim() 
                                ? 'Silakan masukkan Nomor Dokumen terlebih dahulu, lalu klik Tampilkan Laporan.' 
                                : 'Silakan klik tombol Tampilkan Laporan.'
                            }
                        </p>
                    ) : (
                        <div style={{ border: '1px solid var(--border)', padding: '20px', backgroundColor: 'var(--bg-elevated)', maxWidth: '700px', margin: '0 auto', fontSize: '14px', lineHeight: '1.6', borderRadius: 'var(--radius-md)' }}>
                            {/* ponytail: unify shade pastel to bg-elevated */}
                            <h4 style={{ textAlign: 'center', marginBottom: '5px', textTransform: 'uppercase' }}>
                                BERITA ACARA PENGALIHAN SISA DANA
                            </h4>
                            <p style={{ textAlign: 'center', margin: '0 0 25px 0', fontSize: '12px', color: '#444' }}>
                                Nomor Dokumen: {bapsdData.nomorDokumen}
                            </p>

                            <p>
                                Berdasarkan hasil perhitungan anggaran dan realisasi penggunaan dana pelayanan gizi pada periode <strong>{bapsdData.periodeLabel}</strong>, maka diterangkan hal-hal sebagai berikut:
                            </p>

                            <table style={{ margin: '15px auto', width: '90%' }} cellPadding="4">
                                <tbody>
                                    <tr>
                                        <td style={{ width: '40%' }}><strong>Sisa Dana Periode Ini</strong></td>
                                        <td>: <strong>Rp{bapsdData.sisaDana.toLocaleString('id-ID')}</strong></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Status Dana</strong></td>
                                        <td>: Dialihkan sepenuhnya untuk operasional periode berikutnya</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Tanggal Awal Penggunaan</strong></td>
                                        <td>: {bapsdData.tanggalMulaiBerikutnya ? new Date(bapsdData.tanggalMulaiBerikutnya).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <p>
                                Pengalihan sisa dana ini telah disetujui bersama oleh pihak Pengurus Yayasan <strong>{bapsdData.namaYayasan}</strong> dan pihak Satuan Pelayanan Pemenuhan Gizi (SPPG).
                            </p>

                            {/* Tanda Tangan */}
                            <div style={{ marginTop: '40px' }}>
                                <p style={{ textAlign: 'right', marginBottom: '20px' }}>
                                    {bapsdData.tempatPelaporan || 'SPPG'}, {bapsdData.tanggalPelaporan ? new Date(bapsdData.tanggalPelaporan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                                </p>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
                                    <div style={{ width: '45%' }}>
                                        <p>Yang Menyerahkan,</p>
                                        <p>Akuntan SPPG</p>
                                        <div style={{ height: '60px' }}></div>
                                        <p><strong>{bapsdData.namaAkuntan}</strong></p>
                                    </div>
                                    <div style={{ width: '45%' }}>
                                        <p>Yang Menerima,</p>
                                        <p>Kepala SPPG</p>
                                        <div style={{ height: '60px' }}></div>
                                        <p><strong>{bapsdData.namaPejabat}</strong></p>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                                    <p>Mengetahui,</p>
                                    <p>Ketua Yayasan {bapsdData.namaYayasan}</p>
                                    <div style={{ height: '60px' }}></div>
                                    <p><strong>{bapsdData.ketuaYayasan}</strong></p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
