import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

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
            <h2>Daftar Nominatif Upah Relawan</h2>
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

            {/* Form Nominatif */}
            <h3>Buat Daftar Nominatif Upah</h3>
            <form onSubmit={createNominatifUpah} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '700px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Jenis Pekerjaan: </label>
                    <input
                        type="text"
                        placeholder="Misal: RELAWAN, TUKANG, STAF"
                        value={upahForm.jenisPekerjaan}
                        onChange={e => setUpahForm(prev => ({ ...prev, jenisPekerjaan: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Nama Relawan: </label>
                    <input
                        type="text"
                        placeholder="Nama Lengkap"
                        value={upahForm.namaRelawan}
                        onChange={e => setUpahForm(prev => ({ ...prev, namaRelawan: e.target.value }))}
                        required
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>Dana Kesehatan (opsional): </label>
                    <input
                        type="number"
                        placeholder="Dana Kesehatan (Rp)"
                        value={upahForm.danaKesehatan}
                        onChange={e => setUpahForm(prev => ({ ...prev, danaKesehatan: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>TK / BPJS Ketenagakerjaan (opsional): </label>
                    <input
                        type="number"
                        placeholder="Nominal TK (Rp)"
                        value={upahForm.tk}
                        onChange={e => setUpahForm(prev => ({ ...prev, tk: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>PJ / Asuransi Lain (opsional): </label>
                    <input
                        type="number"
                        placeholder="Nominal PJ (Rp)"
                        value={upahForm.pj}
                        onChange={e => setUpahForm(prev => ({ ...prev, pj: e.target.value }))}
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>

                {/* Sub-form Detail Harian */}
                <div style={{ border: '1px dashed #777', padding: '10px', marginTop: '10px' }}>
                    <h4 style={{ marginTop: '0', marginBottom: '10px' }}>Rincian Upah Harian</h4>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <input
                            type="date"
                            value={tempUpahDetail.tanggal}
                            onChange={e => setTempUpahDetail(prev => ({ ...prev, tanggal: e.target.value }))}
                            style={{ padding: '5px' }}
                        />
                        <input
                            type="number"
                            placeholder="Nominal Harian (Rp)"
                            value={tempUpahDetail.nominal}
                            onChange={e => setTempUpahDetail(prev => ({ ...prev, nominal: e.target.value }))}
                            style={{ padding: '5px', width: '150px' }}
                        />
                        <button
                            type="button"
                            onClick={addUpahDetail}
                            style={{ padding: '5px 10px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer' }}
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
                                    style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    [Hapus]
                                </button>
                            </li>
                        ))}
                        {upahDetailList.length === 0 && (
                            <li style={{ color: '#888', fontStyle: 'italic' }}>Belum ada rincian harian ditambahkan.</li>
                        )}
                    </ul>
                </div>

                <div style={{ marginTop: '10px' }}>
                    <button type="submit" style={{ padding: '6px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        Simpan Daftar Nominatif Upah
                    </button>
                </div>
            </form>

            {/* List Nominatif */}
            <h3>Daftar Nominatif Upah</h3>
            {loading && <p>Memuat daftar nominatif upah...</p>}
            {!loading && (
                <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#eaeaea' }}>
                            <th>Jenis Pekerjaan</th>
                            <th>Nama Relawan</th>
                            <th style={{ textAlign: 'right' }}>Total Honorarium</th>
                            <th style={{ textAlign: 'right' }}>Total Upah</th>
                        </tr>
                    </thead>
                    <tbody>
                        {upahList.map(u => (
                            <tr key={u.id}>
                                <td>{u.jenisPekerjaan}</td>
                                <td>{u.namaRelawan}</td>
                                <td style={{ textAlign: 'right' }}>Rp{Number(u.totalHonorarium).toLocaleString('id-ID')}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Rp{Number(u.totalUpah).toLocaleString('id-ID')}</td>
                            </tr>
                        ))}
                        {upahList.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '10px' }}>
                                    Belum ada data Daftar Nominatif Upah untuk periode ini.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};
