import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Table } from '../../components/Table';
import { DatePicker } from '../../components/DatePicker';

export const NominatifUpahPage = () => {
    const { request } = useApi();
    const [periods, setPeriods] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [upahList, setUpahList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [upahForm, setUpahForm] = useState({
        jenisPekerjaan: '',
        namaRelawan: '',
        danaKesehatan: '',
        tk: '',
        pj: ''
    });
    const [upahDetailList, setUpahDetailList] = useState([]);
    const [tempUpahDetail, setTempUpahDetail] = useState({ tanggal: '', nominal: '' });

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

    const loadUpahList = async (pid) => {
        if (!pid) return;
        setLoading(true);
        setError('');
        try {
            const r = await request(`/akuntan/daftar-nominatif-upah?periodeId=${pid}`);
            if (r.ok) {
                setUpahList(await r.json());
            } else {
                const d = await r.json().catch(() => ({ error: 'Gagal memuat daftar Nominatif Upah' }));
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
            loadUpahList(periodeId);
        }
    }, [periodeId]);

    const addUpahDetail = () => {
        if (!tempUpahDetail.tanggal || !tempUpahDetail.nominal) {
            alert('Lengkapi tanggal dan nominal detail harian.');
            return;
        }
        
        if (upahDetailList.some(item => item.tanggal === tempUpahDetail.tanggal)) {
            alert('Tanggal tersebut sudah diinput pada detail harian.');
            return;
        }

        setUpahDetailList(prev => [...prev, { ...tempUpahDetail }]);
        setTempUpahDetail({ tanggal: '', nominal: '' });
    };

    const createNominatifUpah = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const {
            jenisPekerjaan,
            namaRelawan,
            danaKesehatan,
            tk,
            pj
        } = upahForm;

        if (!periodeId) {
            setError('Periode wajib dipilih.');
            return;
        }
        if (!jenisPekerjaan) {
            setError('Jenis pekerjaan wajib diisi.');
            return;
        }
        if (!namaRelawan) {
            setError('Nama relawan wajib diisi.');
            return;
        }

        const body = {
            periodeId,
            jenisPekerjaan,
            namaRelawan,
            danaKesehatan: danaKesehatan !== '' ? parseFloat(danaKesehatan) : undefined,
            tk: tk !== '' ? parseFloat(tk) : undefined,
            pj: pj !== '' ? parseFloat(pj) : undefined,
            detailHarian: upahDetailList.map(item => ({
                tanggal: item.tanggal,
                nominal: parseFloat(item.nominal)
            }))
        };

        try {
            const r = await request('/akuntan/daftar-nominatif-upah', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (r.ok) {
                setSuccess('Daftar Nominatif Upah berhasil disimpan.');
                setUpahForm({
                    jenisPekerjaan: '',
                    namaRelawan: '',
                    danaKesehatan: '',
                    tk: '',
                    pj: ''
                });
                setUpahDetailList([]);
                loadUpahList(periodeId);
            } else {
                const d = await r.json().catch(() => ({ error: 'Terjadi kesalahan format response' }));
                setError(d.error || 'Gagal menyimpan Daftar Nominatif Upah');
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan koneksi');
        }
    };

    return (
        <div>
            <h2 style={{ color: 'var(--text)', marginBottom: '20px' }}>Daftar Nominatif Upah Relawan</h2>
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

            {/* Form Nominatif */}
            <form onSubmit={createNominatifUpah} style={{
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
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text)' }}>Buat Daftar Nominatif Upah</h3>
                
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
                            Jenis Pekerjaan
                        </label>
                        <input
                            type="text"
                            placeholder="Misal: RELAWAN, TUKANG, STAF"
                            value={upahForm.jenisPekerjaan}
                            onChange={e => setUpahForm(prev => ({ ...prev, jenisPekerjaan: e.target.value }))}
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
                            Nama Relawan
                        </label>
                        <input
                            type="text"
                            placeholder="Nama Lengkap"
                            value={upahForm.namaRelawan}
                            onChange={e => setUpahForm(prev => ({ ...prev, namaRelawan: e.target.value }))}
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
                        />
                    </div>
                </div>

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
                            Dana Kesehatan (opsional)
                        </label>
                        <input
                            type="number"
                            placeholder="Dana Kesehatan (Rp)"
                            value={upahForm.danaKesehatan}
                            onChange={e => setUpahForm(prev => ({ ...prev, danaKesehatan: e.target.value }))}
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
                            TK / BPJS Ketenagakerjaan (opsional)
                        </label>
                        <input
                            type="number"
                            placeholder="Nominal TK (Rp)"
                            value={upahForm.tk}
                            onChange={e => setUpahForm(prev => ({ ...prev, tk: e.target.value }))}
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
                            PJ / Asuransi Lain (opsional)
                        </label>
                        <input
                            type="number"
                            placeholder="Nominal PJ (Rp)"
                            value={upahForm.pj}
                            onChange={e => setUpahForm(prev => ({ ...prev, pj: e.target.value }))}
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

                {/* Sub-form Detail Harian */}
                <div style={{
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    marginTop: '10px',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)'
                }}>
                    <h4 style={{ marginTop: '0', marginBottom: '16px', fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                        Rincian Upah Harian
                    </h4>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '16px', flexWrap: 'wrap' }}>
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
                                Tanggal
                            </label>
                            <DatePicker
                                value={tempUpahDetail.tanggal}
                                onChange={val => setTempUpahDetail(prev => ({ ...prev, tanggal: val }))}
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
                                Nominal Harian (Rp)
                            </label>
                            <input
                                type="number"
                                placeholder="Nominal Harian (Rp)"
                                value={tempUpahDetail.nominal}
                                onChange={e => setTempUpahDetail(prev => ({ ...prev, nominal: e.target.value }))}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--input-border)',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    fontSize: '14px',
                                    boxSizing: 'border-box',
                                    width: '180px'
                                }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={addUpahDetail}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: 'var(--btn-primary-bg)',
                                color: 'var(--btn-primary-text)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '14px',
                                height: '42px'
                            }}
                        >
                            Tambah Rincian
                        </button>
                    </div>

                    {/* List Sementara Rincian Harian */}
                    <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
                        {upahDetailList.map((item, index) => (
                            <li key={index} style={{ marginBottom: '5px' }}>
                                {item.tanggal} — Rp{Number(item.nominal).toLocaleString('id-ID')}
                                {' '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUpahDetailList(prev => prev.filter((_, idx) => idx !== index));
                                    }}
                                    style={{ color: 'var(--color-danger)', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    [Hapus]
                                </button>
                            </li>
                        ))}
                        {upahDetailList.length === 0 && (
                            <li style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada rincian harian ditambahkan.</li>
                        )}
                    </ul>
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
                        Simpan Daftar Nominatif Upah
                    </button>
                </div>
            </form>

            {/* List Nominatif */}
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Daftar Nominatif Upah</h3>
            {loading && <p style={{ color: 'var(--text-muted)' }}>Memuat daftar nominatif upah...</p>}
            {!loading && (
                <Table
                    columns={[
                        { key: 'jenisPekerjaan', header: 'Jenis Pekerjaan' },
                        { key: 'namaRelawan', header: 'Nama Relawan' },
                        {
                            key: 'totalHonorarium',
                            header: 'Total Honorarium',
                            align: 'right',
                            render: (v) => (
                                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </span>
                            )
                        },
                        {
                            key: 'totalUpah',
                            header: 'Total Upah',
                            align: 'right',
                            render: (v) => (
                                <strong style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text)' }}>
                                    Rp{Number(v).toLocaleString('id-ID')}
                                </strong>
                            )
                        }
                    ]}
                    data={upahList}
                    emptyText="Belum ada data Daftar Nominatif Upah untuk periode ini."
                />
            )}
        </div>
    );
};
