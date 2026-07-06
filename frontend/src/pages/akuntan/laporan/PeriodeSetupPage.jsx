import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';

export const PeriodeSetupPage = () => {
    const { request } = useApi();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form fields state
    const [tanggalMulai, setTanggalMulai] = useState('');
    const [tanggalSelesai, setTanggalSelesai] = useState('');
    const [anggaranAlokasi, setAnggaranAlokasi] = useState('');
    const [totalDanaDiterima, setTotalDanaDiterima] = useState('');
    const [namaLembaga, setNamaLembaga] = useState('');
    const [alamat, setAlamat] = useState('');
    const [namaKepalaSPPG, setNamaKepalaSPPG] = useState('');
    const [namaAkuntanSPPG, setNamaAkuntanSPPG] = useState('');
    const [namaYayasan, setNamaYayasan] = useState('');
    const [ketuaYayasan, setKetuaYayasan] = useState('');
    const [nomorRekeningVA, setNomorRekeningVA] = useState('');
    const [tahunAnggaran, setTahunAnggaran] = useState('');
    const [awalPeriodeBerikutnya, setAwalPeriodeBerikutnya] = useState('');
    const [tanggalPelaporan, setTanggalPelaporan] = useState('');
    const [tempatPelaporan, setTempatPelaporan] = useState('');

    // Fetch latest period on mount for autofilling defaults
    const fetchLatestSetup = async () => {
        setLoading(true);
        setError('');
        try {
            const r = await request('/akuntan/periode/latest-setup');
            if (r.ok) {
                const resJson = await r.json();
                const latest = resJson.data;
                if (latest) {
                    // 1. Calculate suggested dates
                    const prevEnd = new Date(latest.tanggalSelesai);
                    
                    // Suggested start = prevEnd + 1 day
                    const sugStart = new Date(Date.UTC(prevEnd.getUTCFullYear(), prevEnd.getUTCMonth(), prevEnd.getUTCDate() + 1));
                    const sugStartStr = sugStart.toISOString().split('T')[0];
                    setTanggalMulai(sugStartStr);

                    // Suggested end = sugStart + 9 days (10 days total)
                    const sugEnd = new Date(Date.UTC(sugStart.getUTCFullYear(), sugStart.getUTCMonth(), sugStart.getUTCDate() + 9));
                    const sugEndStr = sugEnd.toISOString().split('T')[0];
                    setTanggalSelesai(sugEndStr);

                    // Suggested next start = sugEnd + 1 day
                    const sugNextStart = new Date(Date.UTC(sugEnd.getUTCFullYear(), sugEnd.getUTCMonth(), sugEnd.getUTCDate() + 1));
                    setAwalPeriodeBerikutnya(sugNextStart.toISOString().split('T')[0]);

                    // Suggested report date = sugEnd
                    setTanggalPelaporan(sugEndStr);

                    // Suggested year = sugStart's year
                    setTahunAnggaran(sugStart.getUTCFullYear().toString());

                    // 2. Autofill constants from previous SetupLembaga
                    if (latest.setupLembaga) {
                        const setup = latest.setupLembaga;
                        setNamaLembaga(setup.namaLembaga || '');
                        setAlamat(setup.alamat || '');
                        setNamaKepalaSPPG(setup.namaKepalaSPPG || '');
                        setNamaAkuntanSPPG(setup.namaAkuntanSPPG || '');
                        setNamaYayasan(setup.namaYayasan || '');
                        setKetuaYayasan(setup.ketuaYayasan || '');
                        setNomorRekeningVA(setup.nomorRekeningVA || '');
                        setTempatPelaporan(setup.tempatPelaporan || '');
                    }
                } else {
                    // Fallback to empty defaults if no period exists yet in DB
                    const todayStr = new Date().toISOString().split('T')[0];
                    setTanggalMulai(todayStr);
                    setTanggalSelesai(todayStr);
                    setAwalPeriodeBerikutnya(todayStr);
                    setTanggalPelaporan(todayStr);
                    setTahunAnggaran(new Date().getFullYear().toString());
                }
            } else {
                setError('Gagal memuat data periode terakhir untuk autofill.');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi saat memuat data awal.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLatestSetup();
    }, []);

    // Recalculate helper when tanggalSelesai changes
    useEffect(() => {
        if (tanggalSelesai) {
            const currentEnd = new Date(tanggalSelesai);
            if (!isNaN(currentEnd.getTime())) {
                const nextStart = new Date(Date.UTC(currentEnd.getUTCFullYear(), currentEnd.getUTCMonth(), currentEnd.getUTCDate() + 1));
                setAwalPeriodeBerikutnya(nextStart.toISOString().split('T')[0]);
                setTanggalPelaporan(tanggalSelesai);
            }
        }
    }, [tanggalSelesai]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Basic front-end validation
        if (!tanggalMulai || !tanggalSelesai || !anggaranAlokasi ||
            !namaLembaga || !alamat || !namaKepalaSPPG || !namaAkuntanSPPG ||
            !namaYayasan || !ketuaYayasan || !nomorRekeningVA || !tahunAnggaran ||
            !awalPeriodeBerikutnya || !tanggalPelaporan || !tempatPelaporan) {
            setError('Seluruh field wajib harus diisi.');
            return;
        }

        setSubmitting(true);
        try {
            const body = {
                tanggalMulai,
                tanggalSelesai,
                anggaranAlokasi: parseFloat(anggaranAlokasi),
                totalDanaDiterima: totalDanaDiterima ? parseFloat(totalDanaDiterima) : null,
                namaLembaga,
                alamat,
                namaKepalaSPPG,
                namaAkuntanSPPG,
                namaYayasan,
                ketuaYayasan,
                nomorRekeningVA,
                tahunAnggaran: parseInt(tahunAnggaran, 10),
                awalPeriodeBerikutnya,
                tanggalPelaporan,
                tempatPelaporan
            };

            const r = await request('/akuntan/periode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (r.ok) {
                setSuccess('Periode dan Setup Lembaga baru berhasil dibuat!');
                // Reload to reset the defaults based on the newly created period
                await fetchLatestSetup();
                setAnggaranAlokasi('');
                setTotalDanaDiterima('');
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal membuat periode baru' }));
                setError(d.error);
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px' }}>
            <h2>Buka Periode & Setup Lembaga Baru</h2>
            <p style={{ color: '#666', fontSize: '14px', marginTop: '-10px', marginBottom: '20px' }}>
                Halaman ini digunakan untuk memulai periode operasional dan keuangan baru. Data lembaga di-autofill otomatis dari periode sebelumnya untuk menghemat waktu Anda.
            </p>

            {error && <div style={{ color: 'red', marginBottom: '15px', padding: '10px', border: '1px solid red', backgroundColor: '#fff8f8' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '15px', padding: '10px', border: '1px solid green', backgroundColor: '#f8fff8' }}>{success}</div>}

            {loading && <p>Memuat konfigurasi default...</p>}

            {!loading && (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    
                    {/* SECTION 1: Detail Periode & Anggaran */}
                    <fieldset style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
                        <legend style={{ fontWeight: 'bold', padding: '0 5px' }}>1. Rentang Periode &amp; Pagu Dana</legend>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Tanggal Mulai *</label>
                                <input
                                    type="date"
                                    value={tanggalMulai}
                                    onChange={e => setTanggalMulai(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Tanggal Selesai *</label>
                                <input
                                    type="date"
                                    value={tanggalSelesai}
                                    onChange={e => setTanggalSelesai(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Anggaran Alokasi (Pagu BGN) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Masukkan Pagu Dana"
                                    value={anggaranAlokasi}
                                    onChange={e => setAnggaranAlokasi(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Total Dana Diterima (Opsional)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Diisi jika dana sudah cair ke VA"
                                    value={totalDanaDiterima}
                                    onChange={e => setTotalDanaDiterima(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* SECTION 2: Setup Lembaga & Pejabat Penandatangan */}
                    <fieldset style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
                        <legend style={{ fontWeight: 'bold', padding: '0 5px' }}>2. Pengaturan Lembaga &amp; Pejabat Penandatangan</legend>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nama Satuan Pelayanan (SPPG) *</label>
                                <input
                                    type="text"
                                    value={namaLembaga}
                                    onChange={e => setNamaLembaga(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nomor Rekening Virtual Account (VA) *</label>
                                <input
                                    type="text"
                                    value={nomorRekeningVA}
                                    onChange={e => setNomorRekeningVA(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Alamat Lembaga *</label>
                                <input
                                    type="text"
                                    value={alamat}
                                    onChange={e => setAlamat(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nama Kepala SPPG *</label>
                                <input
                                    type="text"
                                    value={namaKepalaSPPG}
                                    onChange={e => setNamaKepalaSPPG(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nama Akuntan SPPG *</label>
                                <input
                                    type="text"
                                    value={namaAkuntanSPPG}
                                    onChange={e => setNamaAkuntanSPPG(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nama Yayasan Pembina *</label>
                                <input
                                    type="text"
                                    value={namaYayasan}
                                    onChange={e => setNamaYayasan(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nama Ketua Yayasan *</label>
                                <input
                                    type="text"
                                    value={ketuaYayasan}
                                    onChange={e => setKetuaYayasan(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* SECTION 3: Pelaporan & Target Periode Berikutnya */}
                    <fieldset style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
                        <legend style={{ fontWeight: 'bold', padding: '0 5px' }}>3. Pelaporan &amp; Periode Berikutnya</legend>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Tahun Anggaran *</label>
                                <input
                                    type="number"
                                    value={tahunAnggaran}
                                    onChange={e => setTahunAnggaran(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Tempat Pelaporan (Kota) *</label>
                                <input
                                    type="text"
                                    value={tempatPelaporan}
                                    onChange={e => setTempatPelaporan(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Tanggal Tanda Tangan Laporan *</label>
                                <input
                                    type="date"
                                    value={tanggalPelaporan}
                                    onChange={e => setTanggalPelaporan(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Awal Periode Berikutnya *</label>
                                <input
                                    type="date"
                                    value={awalPeriodeBerikutnya}
                                    onChange={e => setAwalPeriodeBerikutnya(e.target.value)}
                                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                        </div>
                    </fieldset>

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            padding: '10px',
                            fontWeight: 'bold',
                            backgroundColor: submitting ? '#ccc' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            marginTop: '10px'
                        }}
                    >
                        {submitting ? 'Menyimpan...' : 'Buka & Setup Periode Baru'}
                    </button>
                </form>
            )}
        </div>
    );
};
