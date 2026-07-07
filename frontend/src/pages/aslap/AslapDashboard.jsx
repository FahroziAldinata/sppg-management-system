import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';

export const AslapDashboard = () => {
  const { request } = useApi();
  const navigate = useNavigate();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [stats, setStats] = useState({ schools: 0, posyandus: 0, pmEntries: 0 });
  const [loading, setLoading] = useState(true);

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
    
    // Update PM entries count for newly selected period
    try {
      const resPm = await request(`/aslap/penerima-manfaat?periodeId=${pid}`);
      if (resPm.ok) {
        const dataPm = await resPm.json();
        setStats(prev => ({ ...prev, pmEntries: dataPm.length }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <p>Memuat Ringkasan Beranda Aslap...</p>;

  return (
    <div style={{ padding: '10px' }}>
      {/* Welcome Banner */}
      <div style={{ backgroundColor: '#007bff', color: 'white', padding: '20px', borderRadius: '6px', marginBottom: '25px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Halo, Asisten Lapangan (Aslap)!</h2>
        <p style={{ margin: '0', opacity: '0.9', fontSize: '14px' }}>
          Selamat datang kembali di dashboard pemantauan gizi SPPG. Silakan pantau status periode operasional aktif dan input data Penerima Manfaat.
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
            <div>ID SPPG: <strong>{selectedPeriod.setupLembaga.nomorRekeningVA}</strong></div>
            <div>Kepala SPPG: <strong>{selectedPeriod.setupLembaga.namaKepalaSPPG}</strong></div>
            <div>Tahun Anggaran: <strong>{selectedPeriod.setupLembaga.tahunAnggaran}</strong></div>
            <div style={{ gridColumn: 'span 2' }}>Alamat: {selectedPeriod.setupLembaga.alamat}</div>
          </div>
        )}
      </div>

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
      <div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '20px', backgroundColor: '#fdfdfd' }}>
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
    </div>
  );
};
