import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { WorkflowStepper } from '../../components/WorkflowStepper';
import { DashboardSummaryCards } from '../../components/DashboardSummaryCards';

export const AkuntanDashboard = () => {
  const { request } = useApi();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [stats, setStats] = useState({ totalKas: 0, rabCount: 0, journalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [dashSummary, setDashSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);



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

          try {
            const resSummary = await request(`/dashboard/summary?periodeId=${activePId}`);
            if (resSummary.ok) {
              setDashSummary((await resSummary.json()).data);
            }
          } finally {
            setLoadingSummary(false);
          }
        } else {
          setLoadingSummary(false);
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

    setLoadingSummary(true);
    try {
      const resSummary = await request(`/dashboard/summary?periodeId=${pid}`);
      if (resSummary.ok) {
        setDashSummary((await resSummary.json()).data);
      }
    } finally {
      setLoadingSummary(false);
    }
  };

  if (loading) return <p>Memuat Ringkasan Beranda Akuntan...</p>;

  return (
    <div style={{ padding: '10px' }}>
      {/* Welcome Banner */}
      <div style={{ backgroundColor: 'var(--color-role-akuntan)', color: 'white', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '25px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Halo, Akuntan SPPG!</h2>
        <p style={{ margin: '0', opacity: '0.9', fontSize: '14px' }}>
          Selamat datang di panel beranda Akuntan. Di bawah ini adalah ringkasan keuangan serta akses cepat ke 14 modul pencatatan akuntansi &amp; laporan SPPG.
        </p>
      </div>

      {/* Period Selector */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', backgroundColor: 'var(--bg-elevated)', marginBottom: '25px' }}>
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
      <DashboardSummaryCards dashSummary={dashSummary} loadingSummary={loadingSummary} />
      {/* Financial Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #28a745', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Saldo Kas Berjalan (BKU)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0' }}>
            Rp{Number(stats.totalKas).toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total saldo s.d transaksi terakhir</div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #17a2b8', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>RAB Harian Diajukan</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.rabCount} Dokumen</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total rencana anggaran harian</div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #6f42c1', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Jurnal Transaksi</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.journalCount} Baris</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pencatatan kas masuk/keluar ledger</div>
        </div>
      </div>



      {/* Workflow Progress & Notifikasi */}
      <div style={{ marginTop: '25px' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', backgroundColor: 'var(--bg-elevated)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Progress Tahapan Operasional</h3>
          <WorkflowStepper workflowProgress={dashSummary?.workflowProgress} loading={loadingSummary} />
        </div>
      </div>
    </div>
  );
};
