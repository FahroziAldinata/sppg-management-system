import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { WorkflowStepper } from '../../components/WorkflowStepper';
import { DashboardSummaryCards } from '../../components/DashboardSummaryCards';
import Dropdown from '../../components/Dropdown';
import { Card } from '../../components/Card';

export const MitraDashboard = () => {
  const { request } = useApi();
  const navigate = useNavigate();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [stats, setStats] = useState({ totalBahan: 0, inputHarga: 0, poCount: 0, poValue: 0 });
  const [loading, setLoading] = useState(true);
  const [dashSummary, setDashSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [resP, resB] = await Promise.all([
          request('/aslap/periode'),
          request('/mitra/bahan-pokok')
        ]);

        const dataP = await resP.json();
        const dataB = await resB.json();

        setPeriods(dataP);

        let activeP = null;
        if (dataP.length > 0) {
          activeP = dataP[0];
          setSelectedPeriod(activeP);
        }

        let hargaCount = 0;
        let pCount = 0;
        let pVal = 0;

        if (activeP) {
          // Fetch harga bahan count
          const resH = await request(`/mitra/harga-bahan?periodeId=${activeP.id}`);
          if (resH.ok) {
            const dataH = await resH.json();
            hargaCount = dataH.length;
          }

          // Fetch PO summary
          const resPo = await request(`/mitra/po/list?periodeId=${activeP.id}`);
          if (resPo.ok) {
            const dataPo = await resPo.json();
            pCount = dataPo.data?.length || 0;
            pVal = (dataPo.data || []).reduce((sum, po) => {
              const val = po.items.reduce((s, item) => s + Number(item.subtotal), 0);
              return sum + val;
            }, 0);
          }
        }

        setStats({
          totalBahan: dataB.length,
          inputHarga: hargaCount,
          poCount: pCount,
          poValue: pVal
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
      // Refresh statistics for selected period
      const [resH, resPo] = await Promise.all([
        request(`/mitra/harga-bahan?periodeId=${pid}`),
        request(`/mitra/po/list?periodeId=${pid}`)
      ]);

      const dataH = resH.ok ? await resH.json() : [];
      const dataPo = resPo.ok ? await resPo.json() : { data: [] };
      const pCount = dataPo.data?.length || 0;
      const pVal = (dataPo.data || []).reduce((sum, po) => {
        const val = po.items.reduce((s, item) => s + Number(item.subtotal), 0);
        return sum + val;
      }, 0);

      setStats(prev => ({
        ...prev,
        inputHarga: dataH.length,
        poCount: pCount,
        poValue: pVal
      }));
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

  if (loading) return <p>Memuat Ringkasan Beranda Mitra...</p>;

  return (
    <div style={{ padding: '10px' }}>
      {/* Welcome Banner */}
      <div style={{ backgroundColor: 'var(--color-role-mitra)', color: 'white', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '25px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Halo, Mitra Penyedia Bahan (Supplier)!</h2>
        <p style={{ margin: '0', opacity: '0.9', fontSize: '14px' }}>
          Selamat datang kembali. Anda dapat memantau status alokasi harga bahan pokok periode berjalan serta menyusun dokumen Nota Pesanan (PO) secara digital.
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
          value={selectedPeriod?.id || ''}
          onChange={handlePeriodChange}
          options={periods.map(p => ({
            value: p.id,
            label: `${p.tanggalMulai} - ${p.tanggalSelesai}`
          }))}
        />
      </div>

      {selectedPeriod?.setupLembaga && (
        <Card style={{
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
            <div>Ketua Yayasan Mitra: <strong>{selectedPeriod.setupLembaga.ketuaYayasan}</strong></div>
            <div>Nomor Rekening VA: <strong>{selectedPeriod.setupLembaga.nomorRekeningVA}</strong></div>
          </div>
        </Card>
      )}

      {/* Ringkasan Status Sistem */}
      <DashboardSummaryCards dashSummary={dashSummary} loadingSummary={loadingSummary} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #6f42c1', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Bahan Pokok Master</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.totalBahan}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total jenis bahan makanan</div>
        </Card>

        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #007bff', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Harga Terdaftar</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.inputHarga} / {stats.totalBahan}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bahan yang sudah diinput harganya</div>
        </Card>

        <Card style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '15px', borderLeft: '5px solid #28a745', backgroundColor: 'var(--bg-elevated)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Nota Pesanan (PO)</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.poCount} PO</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total nilai: <strong>Rp{stats.poValue.toLocaleString('id-ID')}</strong></div>
        </Card>
      </div>

      {/* Quick Actions Panel */}
      {/* ponytail: unify shade pastel to bg-elevated */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', backgroundColor: 'var(--bg-elevated)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Pintasan Aksi Cepat</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/mitra/harga-bahan')} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Kelola Harga Bahan</button>
          <button onClick={() => navigate('/mitra/po')} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Input &amp; Cetak PO (Nota Pesanan)</button>
          <button onClick={() => navigate('/setting')} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Pengaturan Akun</button>
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