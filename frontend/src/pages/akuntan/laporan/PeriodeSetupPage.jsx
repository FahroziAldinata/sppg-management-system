import React, { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../context/ToastContext';
import { RangeCalendar } from "@heroui/react";
import { today, getLocalTimeZone } from "@internationalized/date";
import { parseDate } from "@internationalized/date";
import { DatePicker } from '../../../components/DatePicker';
import { Skeleton } from '../../../components/Skeleton';

const formatInputRupiah = (valueStr) => {
    if (valueStr === null || valueStr === undefined || valueStr === '') return '';
    const clean = valueStr.toString().replace(/\D/g, '');
    if (!clean) return '';
    return `Rp ${Number(clean).toLocaleString('id-ID')}`;
};

const parseInputRupiah = (valueStr) => {
    if (!valueStr) return '';
    return valueStr.toString().replace(/\D/g, '');
};

export const PeriodeSetupPage = () => {
    const { request } = useApi();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form fields state
    const [tanggalMulai, setTanggalMulai] = useState('');
    const [tanggalSelesai, setTanggalSelesai] = useState('');
    const [selectedRange, setSelectedRange] = useState(null);
    const [anggaranAlokasi, setAnggaranAlokasi] = useState('');
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

    const calendarDateToString = (date) => {
        if (!date) return "";

        return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
    };

    const handleRangeChange = (range) => {
        if (!range?.start || !range?.end) return;
        setSelectedRange(range);
        setTanggalMulai(calendarDateToString(range.start));
        setTanggalSelesai(calendarDateToString(range.end));
    };

    // Fetch latest period on mount for autofilling defaults
    const fetchLatestSetup = async () => {
        setLoading(true);
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

                    if (sugStartStr && sugEndStr) {
                        setSelectedRange({
                            start: parseDate(sugStartStr),
                            end: parseDate(sugEndStr)
                        });
                    }

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
                toast.error('Gagal memuat data periode terakhir untuk autofill.');
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi saat memuat data awal.');
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
        if (!tanggalMulai || !tanggalSelesai || !anggaranAlokasi ||
            !namaLembaga || !alamat || !namaKepalaSPPG || !namaAkuntanSPPG ||
            !namaYayasan || !ketuaYayasan || !nomorRekeningVA || !tahunAnggaran ||
            !awalPeriodeBerikutnya || !tanggalPelaporan || !tempatPelaporan) {
            toast.error('Seluruh field wajib harus diisi.');
            return;
        }
        setSubmitting(true);
        try {
            const body = {
                tanggalMulai,
                tanggalSelesai,
                anggaranAlokasi: parseFloat(anggaranAlokasi),
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
                toast.success('Periode dan Setup Lembaga baru berhasil dibuat!');
                // Reload to reset the defaults based on the newly created period
                await fetchLatestSetup();
                setAnggaranAlokasi('');
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal membuat periode baru' }));
                toast.error(d.error);
            }
        } catch (err) {
            toast.error(err.message || 'Terjadi kesalahan koneksi.');
        } finally {
            setSubmitting(false);
        }
    };


    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Buka Periode &amp; Setup Lembaga Baru</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '-10px', marginBottom: '20px' }}>
                Halaman ini digunakan untuk memulai periode operasional dan keuangan baru. Data lembaga di-autofill otomatis dari periode sebelumnya untuk menghemat waktu Anda.
            </p>

            {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Skeleton height="150px" borderRadius="var(--radius-md)" />
                    <Skeleton height="180px" borderRadius="var(--radius-md)" />
                    <Skeleton height="120px" borderRadius="var(--radius-md)" />
                    <Skeleton height="40px" width="180px" borderRadius="var(--radius-md)" />
                </div>
            )}

            {!loading && (
                <form onSubmit={handleSubmit} style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    backgroundColor: 'var(--bg-elevated)',
                    boxShadow: 'var(--shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}>

                    {/* SECTION 1: Detail Periode & Anggaran */}
                    <fieldset style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '20px',
                        margin: 0,
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text)',
                        width: '50%',
                        minWidth: '340px',
                        boxSizing: 'border-box'
                    }}>
                        <legend style={{
                            fontWeight: '700',
                            padding: '0 8px',
                            color: 'var(--text)',
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            1. Rentang Periode &amp; Pagu Dana
                        </legend>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'start' }}>
                            <div style={{ flex: '0 0 auto', minWidth: '280px' }}>
                                <RangeCalendar
                                    aria-label="Rentang Periode"
                                    value={selectedRange}
                                    onChange={handleRangeChange}
                                    style={{ width: '160%' }}
                                >
                                    <RangeCalendar.Header>
                                        <RangeCalendar.NavButton slot="previous" />
                                        <RangeCalendar.Heading />
                                        <RangeCalendar.NavButton slot="next" />
                                    </RangeCalendar.Header>

                                    <RangeCalendar.Grid>
                                        <RangeCalendar.GridHeader>
                                            {(day) => (
                                                <RangeCalendar.HeaderCell>
                                                    {day}
                                                </RangeCalendar.HeaderCell>
                                            )}
                                        </RangeCalendar.GridHeader>

                                        <RangeCalendar.GridBody>
                                            {(date) => (
                                                <RangeCalendar.Cell date={date} />
                                            )}
                                        </RangeCalendar.GridBody>
                                    </RangeCalendar.Grid>
                                </RangeCalendar>
                                <div className="text-sm font-medium mt-6 space-y-1" style={{ color: 'var(--text-muted)' }}>
                                    <div>Tanggal Mulai: {tanggalMulai || "-"}</div>
                                    <div>Tanggal Selesai: {tanggalSelesai || "-"}</div>
                                </div>
                            </div>

                            <div style={{ flex: '1', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                                        Anggaran Alokasi (Pagu BGN) *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Masukkan Pagu Dana"
                                        value={formatInputRupiah(anggaranAlokasi)}
                                        onChange={e => setAnggaranAlokasi(parseInputRupiah(e.target.value))}
                                        className="form-field"
                                        style={{ width: '90%' }}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    {/* SECTION 2: Setup Lembaga & Pejabat Penandatangan */}
                    <fieldset style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '20px',
                        margin: 0,
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text)'
                    }}>
                        <legend style={{
                            fontWeight: '700',
                            padding: '0 8px',
                            color: 'var(--text)',
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            2. Pengaturan Lembaga &amp; Pejabat Penandatangan
                        </legend>
                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
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
                                    Nama Satuan Pelayanan (SPPG) *
                                </label>
                                <input
                                    type="text"
                                    value={namaLembaga}
                                    onChange={e => setNamaLembaga(e.target.value)}
                                    className="form-field"
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
                                    Nomor Rekening Virtual Account (VA) *
                                </label>
                                <input
                                    type="text"
                                    value={nomorRekeningVA}
                                    onChange={e => setNomorRekeningVA(e.target.value)}
                                    className="form-field"
                                    required
                                />
                            </div>
                            <div style={{ flex: '1 1 100%' }}>
                                <label style={{
                                    textTransform: 'uppercase',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    letterSpacing: '0.07em',
                                    color: 'var(--text-muted)',
                                    display: 'block',
                                    marginBottom: '6px'
                                }}>
                                    Alamat Lembaga *
                                </label>
                                <input
                                    type="text"
                                    value={alamat}
                                    onChange={e => setAlamat(e.target.value)}
                                    className="form-field"
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
                                    Nama Kepala SPPG *
                                </label>
                                <input
                                    type="text"
                                    value={namaKepalaSPPG}
                                    onChange={e => setNamaKepalaSPPG(e.target.value)}
                                    className="form-field"
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
                                    Nama Akuntan SPPG *
                                </label>
                                <input
                                    type="text"
                                    value={namaAkuntanSPPG}
                                    onChange={e => setNamaAkuntanSPPG(e.target.value)}
                                    className="form-field"
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
                                    Nama Yayasan Pembina *
                                </label>
                                <input
                                    type="text"
                                    value={namaYayasan}
                                    onChange={e => setNamaYayasan(e.target.value)}
                                    className="form-field"
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
                                    Nama Ketua Yayasan *
                                </label>
                                <input
                                    type="text"
                                    value={ketuaYayasan}
                                    onChange={e => setKetuaYayasan(e.target.value)}
                                    className="form-field"
                                    required
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* SECTION 3: Pelaporan & Target Periode Berikutnya */}
                    <fieldset style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '20px',
                        margin: 0,
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text)'
                    }}>
                        <legend style={{
                            fontWeight: '700',
                            padding: '0 8px',
                            color: 'var(--text)',
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            3. Pelaporan &amp; Periode Berikutnya
                        </legend>
                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
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
                                    Tahun Anggaran *
                                </label>
                                <input
                                    type="number"
                                    value={tahunAnggaran}
                                    onChange={e => setTahunAnggaran(e.target.value)}
                                    className="form-field"
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
                                    Tempat Pelaporan (Kota) *
                                </label>
                                <input
                                    type="text"
                                    value={tempatPelaporan}
                                    onChange={e => setTempatPelaporan(e.target.value)}
                                    className="form-field"
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
                                    Tanggal Tanda Tangan Laporan *
                                </label>
                                <DatePicker
                                    value={tanggalPelaporan}
                                    onChange={setTanggalPelaporan}
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
                                    Awal Periode Berikutnya *
                                </label>
                                <DatePicker
                                    value={awalPeriodeBerikutnya}
                                    onChange={setAwalPeriodeBerikutnya}
                                    required
                                />
                            </div>
                        </div>
                    </fieldset>

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            padding: "12px 24px",
                            fontWeight: 600,
                            backgroundColor: submitting ? 'var(--border)' : 'var(--btn-primary-bg)',
                            color: submitting ? 'var(--text-muted)' : 'var(--btn-primary-text)',
                            borderWidth: "medium",
                            borderStyle: "none",
                            borderColor: "currentColor",
                            borderImage: "none",
                            borderRadius: "var(--radius-sm)",
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            marginTop: "10px",
                            fontSize: "14px",
                            alignSelf: "flex-start"
                        }}
                    >
                        {submitting ? 'Menyimpan...' : 'Buka & Setup Periode Baru'}
                    </button>
                </form>
            )}
        </div>
    );
};
