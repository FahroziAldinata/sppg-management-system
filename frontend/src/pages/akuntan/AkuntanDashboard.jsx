import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { WorkflowStepper } from '../../components/WorkflowStepper';
import { DashboardSummaryCards } from '../../components/DashboardSummaryCards';
import Dropdown from '../../components/Dropdown';
import { Card } from '../../components/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const AkuntanDashboard = () => {
  const { request } = useApi();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [stats, setStats] = useState({ totalKas: 0, rabCount: 0, journalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [dashSummary, setDashSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [realisasiData, setRealisasiData] = useState(null);
  const [loadingRealisasi, setLoadingRealisasi] = useState(true);

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

  const loadRealisasi = async (pid) => {
    setLoadingRealisasi(true);
    try {
      const res = await request(`/laporan/per-periode?periodeId=${pid}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          const chartDataRaw = [
            {
              name: 'Bahan Makanan',
              RAB: (d.bahanMakanan?.pendidikan?.rab || 0) + (d.bahanMakanan?.posyandu?.rab || 0),
              Aktual: (d.bahanMakanan?.pendidikan?.aktual || 0) + (d.bahanMakanan?.posyandu?.aktual || 0),
            },
            {
              name: 'Operasional',
              RAB: d.operasional?.rab || 0,
              Aktual: d.operasional?.aktual || 0,
            },
            {
              name: 'Insentif & Fasilitas',
              RAB: d.insentifFasilitas?.rab || 0,
              Aktual: d.insentifFasilitas?.aktual || 0,
            }
          ];
          setRealisasiData(chartDataRaw);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRealisasi(false);
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const resP = await request('/aslap/periode');
        const dataP = await resP.json();
        setPeriods(dataP);

        if (dataP.length > 0) {
          const activePId = dataP[0].id;
          setSelectedPeriodId(activePId);
          await Promise.all([
            loadStats(activePId),
            loadRealisasi(activePId)
          ]);

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
          setLoadingRealisasi(false);
        }
      } catch (err) {
        console.error(err);
        setLoadingRealisasi(false);
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
    await Promise.all([
      loadStats(pid),
      loadRealisasi(pid)
    ]);

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
        <Dropdown
          style={{ width: '100%' }}
          value={selectedPeriodId}
          onChange={handlePeriodChange}
          options={periods.map(p => ({
            value: p.id,
            label: `${p.tanggalMulai} - ${p.tanggalSelesai}`
          }))}
        />
      </div>
      <DashboardSummaryCards dashSummary={dashSummary} loadingSummary={loadingSummary} />
      {/* Financial Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #28a745', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Saldo Kas Berjalan (BKU)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0' }}>
            Rp{Number(stats.totalKas).toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total saldo s.d transaksi terakhir</div>
        </Card>

        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #17a2b8', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>RAB Harian Diajukan</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.rabCount} Dokumen</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total rencana anggaran harian</div>
        </Card>

        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #6f42c1', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Jurnal Transaksi</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.journalCount} Baris</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pencatatan kas masuk/keluar ledger</div>
        </Card>
      </div>

      {/* Chart Section */}
      {!loadingRealisasi && realisasiData ? (
        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', backgroundColor: 'var(--bg-elevated)', marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
            Grafik Realisasi Anggaran per Kategori (RAB vs Aktual)
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={realisasiData}
                margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text)" />
                <YAxis stroke="var(--text)" tickFormatter={(value) => `Rp${(value / 1e6).toFixed(1)}Jt`} />
                <Tooltip 
                  formatter={(value) => `Rp${value.toLocaleString('id-ID')}`}
                  contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
                <Legend />
                <Bar dataKey="RAB" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Aktual" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : loadingRealisasi ? (
        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', backgroundColor: 'var(--bg-elevated)', marginBottom: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
          <p style={{ color: 'var(--text-muted)' }}>Memuat data grafik...</p>
        </Card>
      ) : null}

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
