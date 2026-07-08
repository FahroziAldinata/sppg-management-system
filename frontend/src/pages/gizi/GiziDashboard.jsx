import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { WorkflowStepper } from '../../components/WorkflowStepper';
import { DashboardSummaryCards } from '../../components/DashboardSummaryCards';


export const GiziDashboard = () => {
  const { request } = useApi();
  const navigate = useNavigate();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [stats, setStats] = useState({ totalMenu: 0, approvedMenu: 0, draftMenu: 0, totalKendaraan: 0 });
  const [loading, setLoading] = useState(true);
  const [dashSummary, setDashSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [resP, resK] = await Promise.all([
          request('/aslap/periode'),
          request('/gizi/kendaraan')
        ]);

        const dataP = await resP.json();
        const dataK = await resK.json();

        setPeriods(dataP);

        let activeP = null;
        if (dataP.length > 0) {
          activeP = dataP[0];
          setSelectedPeriod(activeP);
        }

        let mTotal = 0;
        let mApproved = 0;
        let mDraft = 0;

        if (activeP) {
          const resM = await request(`/gizi/menu-harian?periodeId=${activeP.id}`);
          if (resM.ok) {
            const dataM = await resM.json();
            mTotal = dataM.length;
            mApproved = dataM.filter(m => m.status === 'DISETUJUI').length;
            mDraft = dataM.filter(m => m.status === 'DRAFT' || m.status === 'DIAJUKAN').length;
          }
        }

        setStats({
          totalMenu: mTotal,
          approvedMenu: mApproved,
          draftMenu: mDraft,
          totalKendaraan: dataK.length
        });

        if (activeP) {
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

  const handlePeriodChange = async (pid) => {
    const period = periods.find(p => p.id === pid);
    setSelectedPeriod(period);

    try {
      const resM = await request(`/gizi/menu-harian?periodeId=${pid}`);
      if (resM.ok) {
        const dataM = await resM.json();
        setStats(prev => ({
          ...prev,
          totalMenu: dataM.length,
          approvedMenu: dataM.filter(m => m.status === 'DISETUJUI').length,
          draftMenu: dataM.filter(m => m.status !== 'DISETUJUI').length
        }));
      }
    } catch (e) {
      console.error(e);
    }

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

  if (loading) return <p>Memuat Ringkasan Beranda Ahli Gizi...</p>;

  return (
    <div style={{ padding: '10px' }}>
      {/* Welcome Banner */}
      <div style={{ backgroundColor: 'var(--color-role-gizi)', color: 'white', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '25px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Halo, Ahli Gizi SPPG!</h2>
        <p style={{ margin: '0', opacity: '0.9', fontSize: '14px' }}>
          Selamat datang kembali. Silakan pantau ketersediaan menu harian, status kelayakan menu, serta pengelolaan logistik kendaraan pengantaran.
        </p>
      </div>

      {/* Period Selection Info */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', backgroundColor: 'var(--bg-elevated)', marginBottom: '25px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Detail Periode Berjalan</h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold' }}>Pilih Periode: </label>
          <select
            value={selectedPeriod?.id || ''}
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

        {selectedPeriod?.setupLembaga && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
            <div>Nama Lembaga: <strong>{selectedPeriod.setupLembaga.namaLembaga}</strong></div>
            <div>Tahun Anggaran: <strong>{selectedPeriod.setupLembaga.tahunAnggaran}</strong></div>
            <div>Tempat Pelaporan: <strong>{selectedPeriod.setupLembaga.tempatPelaporan}</strong></div>
            <div>Yayasan: <strong>{selectedPeriod.setupLembaga.namaYayasan}</strong></div>
          </div>
        )}
      </div>
      <DashboardSummaryCards dashSummary={dashSummary} loadingSummary={loadingSummary} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #007bff', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Menu Disusun</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.totalMenu} Hari</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Menu yang sudah dirancang</div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #28a745', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Menu Disetujui Kepala</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.approvedMenu} Hari</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Siap untuk diproses bahan-bahannya</div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #fd7e14', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Kendaraan Pengantaran</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.totalKendaraan} Unit</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total armada logistik aktif</div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      {/* ponytail: unify shade pastel to bg-elevated */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', backgroundColor: 'var(--bg-elevated)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Pintasan Aksi Cepat</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/gizi/menu-harian')} style={{ padding: '10px 20px', backgroundColor: '#fd7e14', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Kelola Menu Harian</button>
          <button onClick={() => navigate('/setting')} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Pengaturan Akun</button>
        </div>
      </div>

      {/* Workflow Progress */}
      <div style={{ marginTop: '25px' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', backgroundColor: 'var(--bg-elevated)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Progress Tahapan Operasional</h3>
          <WorkflowStepper workflowProgress={dashSummary?.workflowProgress} loading={loadingSummary} />
        </div>
      </div>
    </div>
  );
};
