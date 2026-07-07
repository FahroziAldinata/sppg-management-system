import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';

export const AkuntanDashboard = () => {
  const { request } = useApi();
  const navigate = useNavigate();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [stats, setStats] = useState({ totalKas: 0, rabCount: 0, journalCount: 0 });
  const [loading, setLoading] = useState(true);

  const shortcuts = [
    { label: '1. Setup Periode', path: '/akuntan/laporan/periode-setup', color: '#007bff' },
    { label: '2. Jurnal Transaksi', path: '/akuntan/jurnal', color: '#6f42c1' },
    { label: '3. Laporan', path: '/akuntan/laporan', color: '#fd7e14' },
    { label: '4. Stock Barang', path: '/akuntan/laporan/stock-barang', color: '#28a745' },
    { label: '5. Belanja Bahan', path: '/akuntan/laporan/kebutuhan-belanja-bahan', color: '#e83e8c' },
    { label: '6. Validasi Stok', path: '/akuntan/validasi-stok', color: '#dc3545' },
    { label: '7. RAB Harian', path: '/akuntan/rab-harian', color: '#20c997' },
    { label: '8. Anggaran Harian', path: '/akuntan/anggaran-harian', color: '#17a2b8' },
    { label: '9. Input Saldo Awal', path: '/akuntan/saldo-awal-barang', color: '#ffc107' },
    { label: '10. Mutasi Stok', path: '/akuntan/mutasi-stok', color: '#343a40' },
    { label: '11. Dokumen Resmi', path: '/akuntan/dokumen-resmi', color: '#007bff' },
    { label: '12. Per Periode', path: '/akuntan/laporan/per-periode', color: '#6c757d' },
    { label: '13. Per Bulan', path: '/akuntan/laporan/per-bulan', color: '#563d7c' },
    { label: '14. Nominatif Upah', path: '/akuntan/nominatif-upah', color: '#bd2130' }
  ];

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const resP = await request('/aslap/periode');
        const dataP = await resP.json();
        setPeriods(dataP);
        
        if (dataP.length > 0) {
          const activePId = dataP[0].id;
          setSelectedPeriodId(activePId);
          await loadStats(activePId);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const loadStats = async (pid) => {
    try {
      const [resBku, resRab, resJurnal] = await Promise.all([
        request(`/laporan/bku?periodeId=${pid}`),
        request(`/akuntan/rab-harian?periodeId=${pid}`),
        request(`/akuntan/jurnal-transaksi?periodeId=${pid}`)
      ]);

      let cashVal = 0;
      if (resBku.ok) {
        const bkuData = await resBku.json();
        const dataList = bkuData.data || [];
        if (dataList.length > 0) {
          cashVal = dataList[dataList.length - 1].saldoBerjalan;
        }
      }

      const rabData = resRab.ok ? await resRab.json() : [];
      const jurnalData = resJurnal.ok ? await resJurnal.json() : [];

      setStats({
        totalKas: cashVal,
        rabCount: rabData.length,
        journalCount: jurnalData.length
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePeriodChange = async (pid) => {
    setSelectedPeriodId(pid);
    await loadStats(pid);
  };

  if (loading) return <p>Memuat Ringkasan Beranda Akuntan...</p>;

  return (
    <div style={{ padding: '10px' }}>
      {/* Welcome Banner */}
      <div style={{ backgroundColor: '#6f42c1', color: 'white', padding: '20px', borderRadius: '6px', marginBottom: '25px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Halo, Akuntan SPPG!</h2>
        <p style={{ margin: '0', opacity: '0.9', fontSize: '14px' }}>
          Selamat datang di panel beranda Akuntan. Di bawah ini adalah ringkasan keuangan serta akses cepat ke 14 modul pencatatan akuntansi &amp; laporan SPPG.
        </p>
      </div>

      {/* Period Selector */}
      <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '15px', backgroundColor: '#f9f9f9', marginBottom: '25px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <label style={{ fontWeight: 'bold' }}>Pilih Periode Aktif: </label>
          <select 
            value={selectedPeriodId}
            onChange={(e) => handlePeriodChange(e.target.value)}
            style={{ padding: '5px' }}
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>
                {p.tanggalMulai} - {p.tanggalSelesai}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '15px', borderLeft: '5px solid #28a745', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Saldo Kas Berjalan (BKU)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0' }}>
            Rp{Number(stats.totalKas).toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>Total saldo s.d transaksi terakhir</div>
        </div>

        <div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '15px', borderLeft: '5px solid #17a2b8', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>RAB Harian Diajukan</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.rabCount} Dokumen</div>
          <div style={{ fontSize: '12px', color: '#888' }}>Total rencana anggaran harian</div>
        </div>

        <div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '15px', borderLeft: '5px solid #6f42c1', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Jurnal Transaksi</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.journalCount} Baris</div>
          <div style={{ fontSize: '12px', color: '#888' }}>Pencatatan kas masuk/keluar ledger</div>
        </div>
      </div>

      {/* 14 Modul Shortcuts Grid */}
      <div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '20px', backgroundColor: '#fff' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
          Akses Modul Akuntansi &amp; Laporan (14 Menu Utama)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
          {shortcuts.map(sc => (
            <button
              key={sc.path}
              onClick={() => navigate(sc.path)}
              style={{
                padding: '12px 15px',
                backgroundColor: '#f8f9fa',
                border: `1px solid #ddd`,
                borderLeft: `4px solid ${sc.color}`,
                borderRadius: '4px',
                textAlign: 'left',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
                color: '#333',
                transition: 'background-color 0.2s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eaeaea'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
            >
              <span>{sc.label}</span>
              <span style={{ fontSize: '16px', color: '#888' }}>&rarr;</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
