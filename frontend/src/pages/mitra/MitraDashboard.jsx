import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';

export const MitraDashboard = () => {
  const { request } = useApi();
  const navigate = useNavigate();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [stats, setStats] = useState({ totalBahan: 0, inputHarga: 0, poCount: 0, poValue: 0 });
  const [loading, setLoading] = useState(true);

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
  };

  if (loading) return <p>Memuat Ringkasan Beranda Mitra...</p>;

  return (
    <div style={{ padding: '10px' }}>
      {/* Welcome Banner */}
      <div style={{ backgroundColor: '#28a745', color: 'white', padding: '20px', borderRadius: '6px', marginBottom: '25px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Halo, Mitra Penyedia Bahan (Supplier)!</h2>
        <p style={{ margin: '0', opacity: '0.9', fontSize: '14px' }}>
          Selamat datang kembali. Anda dapat memantau status alokasi harga bahan pokok periode berjalan serta menyusun dokumen Nota Pesanan (PO) secara digital.
        </p>
      </div>

      {/* Period Selection Info */}
      <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '15px', backgroundColor: '#f9f9f9', marginBottom: '25px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Detail Periode Operasional</h3>
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
            <div>Ketua Yayasan Mitra: <strong>{selectedPeriod.setupLembaga.ketuaYayasan}</strong></div>
            <div>Nomor Rekening VA: <strong>{selectedPeriod.setupLembaga.nomorRekeningVA}</strong></div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '15px', borderLeft: '5px solid #6f42c1', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Bahan Pokok Master</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.totalBahan}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>Total jenis bahan makanan</div>
        </div>

        <div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '15px', borderLeft: '5px solid #007bff', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Harga Terdaftar</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.inputHarga} / {stats.totalBahan}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>Bahan yang sudah diinput harganya</div>
        </div>

        <div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '15px', borderLeft: '5px solid #28a745', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Nota Pesanan (PO)</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0' }}>{stats.poCount} PO</div>
          <div style={{ fontSize: '12px', color: '#888' }}>Total nilai: <strong>Rp{stats.poValue.toLocaleString('id-ID')}</strong></div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '20px', backgroundColor: '#fdfdfd' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Pintasan Aksi Cepat</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => navigate('/mitra/harga-bahan')}
            style={{ padding: '10px 20px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Kelola Harga Bahan
          </button>
          <button 
            onClick={() => navigate('/mitra/po')}
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Input &amp; Cetak PO (Nota Pesanan)
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