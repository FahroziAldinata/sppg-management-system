import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { WorkflowStepper } from '../../components/WorkflowStepper';
import { DashboardSummaryCards } from '../../components/DashboardSummaryCards';

export const AslapDashboard = () => {
  const { request } = useApi();
  const navigate = useNavigate();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [stats, setStats] = useState({ schools: 0, posyandus: 0, pmEntries: 0 });
  const [loading, setLoading] = useState(true);
  const [dashSummary, setDashSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [resP, resS, resY] = await Promise.all([
          request('/aslap/periode'),
          request('/aslap/sekolah'),
          request('/aslap/posyandu')
        ]);
        
        const dataP = await resP.json();
        const dataS = await resS.json();
        const dataY = await resY.json();

        setPeriods(dataP);
        
        let activeP = null;
        if (dataP.length > 0) {
          activeP = dataP[0];
          setSelectedPeriod(activeP);
        }

        // Fetch PM entries count for active period
        let pmCount = 0;
        if (activeP) {
          const resPm = await request(`/aslap/penerima-manfaat?periodeId=${activeP.id}`);
          if (resPm.ok) {
            const dataPm = await resPm.json();
            pmCount = dataPm.length;
          }
        }

        setStats({
          schools: dataS.length,
          posyandus: dataY.length,
          pmEntries: pmCount
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
      const resPm = await request(`/aslap/penerima-manfaat?periodeId=${pid}`);
      if (resPm.ok) {
        const dataPm = await resPm.json();
        setStats(prev => ({ ...prev, pmEntries: dataPm.length }));
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

  if (loading) return <p>Memuat Ringkasan Beranda Aslap...</p>;

  return (
    <div style={{ padding: '10px' }}>
      {/* Welcome Banner */}
      <div style={{ backgroundColor: 'var(--color-role-aslap)', color: 'white', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '25px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Halo, Asisten Lapangan (Aslap)!</h2>
        <p style={{ margin: '0', opacity: '0.9', fontSize: '14px' }}>
          Selamat datang kembali di dashboard pemantauan gizi SPPG. Silakan pantau status periode operasional aktif dan input data Penerima Manfaat.
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
          <select 
              value={selectedPeriod?.id || ''}
              onChange={(e) => handlePeriodChange(e.target.value)}
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
              {periods.map(p => (
                  <option key={p.id} value={p.id}>
                      {p.tanggalMulai} - {p.tanggalSelesai}
                  </option>
              ))}
          </select>
      </div>

      {selectedPeriod?.setupLembaga && (
        <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            backgroundColor: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow)',
            marginBottom: '25px'
        }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: 'var(--text)' }}>Detail Lembaga Periode Aktif</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                <div>Nama SPPG: <strong>{selectedPeriod.setupLembaga.namaLembaga}</strong></div>
                <div>ID SPPG: <strong>{selectedPeriod.setupLembaga.nomorRekeningVA}</strong></div>
                <div>Kepala SPPG: <strong>{selectedPeriod.setupLembaga.namaKepalaSPPG}</strong></div>
                <div>Tahun Anggaran: <strong>{selectedPeriod.setupLembaga.tahunAnggaran}</strong></div>
                <div style={{ gridColumn: 'span 2' }}>Alamat: {selectedPeriod.setupLembaga.alamat}</div>
            </div>
        </div>
      )}

      {/* Ringkasan Status Sistem */}
      <DashboardSummaryCards dashSummary={dashSummary} loadingSummary={loadingSummary} />

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '15px', borderLeft: '5px solid #28a745', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Sekolah Terdaftar</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.schools}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total satuan pendidikan aktif</div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '15px', borderLeft: '5px solid #fd7e14', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Posyandu Terdaftar</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.posyandus}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total posyandu layanan non-siswa</div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '15px', borderLeft: '5px solid #007bff', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Input Penerima Manfaat</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.pmEntries}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Data terekam pada periode ini</div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      {/* ponytail: unify shade pastel to bg-elevated */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', backgroundColor: 'var(--bg-elevated)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Pintasan Aksi Cepat</h3>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={() => navigate('/aslap/penerima-manfaat')}
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Kelola Penerima Manfaat
          </button>
          <button
            onClick={() => navigate('/setting')}
            style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Pengaturan Akun
          </button>
        </div>
      </div>

      {/* Workflow Progress */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', backgroundColor: 'var(--bg-elevated)', marginTop: '25px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Progress Tahapan Operasional</h3>
        <WorkflowStepper workflowProgress={dashSummary?.workflowProgress} loading={loadingSummary} />
      </div>
    </div>
  );
};
