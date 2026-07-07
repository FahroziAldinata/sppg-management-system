import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';

export const KepalaDashboard = () => {
  const { request } = useApi();
  const navigate = useNavigate();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [stats, setStats] = useState({ pendingApprovals: 0, publishedDocs: 0, budgetUsed: 0, budgetTotal: 0 });
  const [loading, setLoading] = useState(true);

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
  };

  if (loading) return <p>Memuat Ringkasan Beranda Kepala SPPG...</p>;

  return (
    <div style={{ padding: '10px' }}>
      {/* Welcome Banner */}
      <div style={{ backgroundColor: '#007bff', color: 'white', padding: '20px', borderRadius: '6px', marginBottom: '25px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Halo, Kepala Satuan Pelayanan (SPPG)!</h2>
        <p style={{ margin: '0', opacity: '0.9', fontSize: '14px' }}>
          Selamat datang kembali. Di bawah ini adalah ringkasan persetujuan, realisasi keuangan, dan dokumen resmi yang diterbitkan untuk periode aktif.
        </p>
      </div>

      {/* Period Selection Info */}
      <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '15px', backgroundColor: '#f9f9f9', marginBottom: '25px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Detail Periode &amp; Setup Lembaga</h3>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
            <div>Nama SPPG: <strong>{selectedPeriod.setupLembaga.namaLembaga}</strong></div>
            <div>ID SPPG: <strong>{selectedPeriod.setupLembaga.periodeId}</strong></div>
            <div>Akuntan SPPG: <strong>{selectedPeriod.setupLembaga.namaAkuntanSPPG}</strong></div>
            <div>Tahun Anggaran: <strong>{selectedPeriod.setupLembaga.tahunAnggaran}</strong></div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '15px', borderLeft: '5px solid #dc3545', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Persetujuan Menunggu (Pending)</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0', color: stats.pendingApprovals > 0 ? '#dc3545' : '#333' }}>
            {stats.pendingApprovals} Dokumen
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>Menu Harian &amp; RAB perlu ditinjau</div>
        </div>

        <div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '15px', borderLeft: '5px solid #28a745', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Realisasi Keuangan</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '5px 0' }}>
            Rp{stats.budgetUsed.toLocaleString('id-ID')} / Rp{stats.budgetTotal.toLocaleString('id-ID')}
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>Realisasi pagu anggaran belanja</div>
        </div>

        <div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '15px', borderLeft: '5px solid #fd7e14', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Dokumen Resmi Diterbitkan</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.publishedDocs} Dokumen</div>
          <div style={{ fontSize: '12px', color: '#888' }}>LPA, SPTJ, &amp; BAPSD terbit</div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '20px', backgroundColor: '#fdfdfd' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Pintasan Aksi Cepat</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => navigate('/kepala/approval')}
            style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Kelola Persetujuan (Approval)
          </button>
          <button 
            onClick={() => navigate('/setting')}
            style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Pengaturan Akun
          </button>
        </div>
      </div>
    </div>
  );
};
