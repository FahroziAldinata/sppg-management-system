import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { WorkflowStepper } from '../../components/WorkflowStepper';
import { NotifikasiList } from '../../components/NotifikasiList';
import { DashboardSummaryCards } from '../../components/DashboardSummaryCards';
import Dropdown from '../../components/Dropdown';
import { Card } from '../../components/Card';

export const KepalaDashboard = () => {
  const { request } = useApi();
  const navigate = useNavigate();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [stats, setStats] = useState({ pendingApprovals: 0, publishedDocs: 0, budgetUsed: 0, budgetTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [dashSummary, setDashSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);



  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const resP = await request('/aslap/periode');
        const dataP = await resP.json();
        setPeriods(dataP);

        let activeP = null;
        if (dataP.length > 0) {
          activeP = dataP[0];
          setSelectedPeriod(activeP);
          await loadStats(activeP);

          try {
            const resSummary = await request(`/dashboard/summary?periodeId=${activeP.id}`);
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

  const loadStats = async (period) => {
    try {
      const pid = period.id;
      // 1. Fetch pending approvals (Menu + RAB)
      const [menuRes, rabRes, docRes] = await Promise.all([
        request(`/gizi/menu-harian?periodeId=${pid}`),
        request(`/akuntan/rab-harian?periodeId=${pid}`),
        request(`/akuntan/dokumen-resmi?periodeId=${pid}`)
      ]);

      const menuData = menuRes.ok ? await menuRes.json() : [];
      const rabData = rabRes.ok ? await rabRes.json() : [];
      const docData = docRes.ok ? await docRes.json() : [];

      const pendingMenu = menuData.filter(m => m.status === 'DIAJUKAN').length;
      const pendingRab = rabData.filter(r => r.status === 'DIAJUKAN').length;

      // Calculate total actual used budget from BKU or RabHarian
      const approvedRabs = rabData.filter(r => r.status === 'DISETUJUI');
      const totalUsed = approvedRabs.reduce((sum, r) => sum + (Number(r.realisasiTotal) || 0), 0);

      setStats({
        pendingApprovals: pendingMenu + pendingRab,
        publishedDocs: docData.length,
        budgetUsed: totalUsed,
        budgetTotal: Number(period.anggaranAlokasi) || 0
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePeriodChange = async (pid) => {
    const period = periods.find(p => p.id === pid);
    setSelectedPeriod(period);
    await loadStats(period);

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

  if (loading) return <p>Memuat Ringkasan Beranda Kepala SPPG...</p>;

  return (
    <div style={{ padding: '10px' }}>
      {/* Welcome Banner */}
      <div style={{ backgroundColor: 'var(--color-role-kepala)', color: 'white', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '25px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Halo, Kepala Satuan Pelayanan (SPPG)!</h2>
        <p style={{ margin: '0', opacity: '0.9', fontSize: '14px' }}>
          Selamat datang kembali. Di bawah ini adalah ringkasan persetujuan, realisasi keuangan, dan dokumen resmi yang diterbitkan untuk periode aktif.
        </p>
      </div>

      {/* Period Selection Info */}
      <Card style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        backgroundColor: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow)',
        marginBottom: '25px',
        width: '100%',
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
          style={{ width: '25%' }}
          value={selectedPeriod?.id || ''}
          onChange={handlePeriodChange}
          options={periods.map(p => ({
            value: p.id,
            label: `${p.tanggalMulai} - ${p.tanggalSelesai}`
          }))}
        />

        {selectedPeriod?.setupLembaga && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', borderTop: '1px solid var(--border)', paddingTop: '15px', marginTop: '20px' }}>
            <div>Nama SPPG: <strong>{selectedPeriod.setupLembaga.namaLembaga}</strong></div>
            <div>ID SPPG: <strong>{selectedPeriod.setupLembaga.nomorRekeningVA}</strong></div>
            <div>Akuntan SPPG: <strong>{selectedPeriod.setupLembaga.namaAkuntanSPPG}</strong></div>
            <div>Tahun Anggaran: <strong>{selectedPeriod.setupLembaga.tahunAnggaran}</strong></div>
          </div>
        )}
      </Card>
      <DashboardSummaryCards dashSummary={dashSummary} loadingSummary={loadingSummary} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #dc3545', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Persetujuan Menunggu (Pending)</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0', color: stats.pendingApprovals > 0 ? '#dc3545' : 'var(--text)' }}>
            {stats.pendingApprovals} Dokumen
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Menu Harian &amp; RAB perlu ditinjau</div>
        </Card>

        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #28a745', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Realisasi Keuangan</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '5px 0' }}>
            Rp{stats.budgetUsed.toLocaleString('id-ID')} / Rp{stats.budgetTotal.toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Realisasi pagu anggaran belanja</div>
        </Card>

        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #fd7e14', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Dokumen Resmi Diterbitkan</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.publishedDocs} Dokumen</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>LPA, SPTJ, &amp; BAPSD terbit</div>
        </Card>
      </div>

      {/* Quick Actions Panel */}
      {/* ponytail: unify shade pastel to bg-elevated */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', backgroundColor: 'var(--bg-elevated)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Pintasan Aksi Cepat</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/kepala/approval')} style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Kelola Persetujuan (Approval)</button>
          <button onClick={() => navigate('/setting')} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Pengaturan Akun</button>
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
