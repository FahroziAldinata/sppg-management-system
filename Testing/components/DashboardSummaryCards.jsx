import React from 'react';
import { Skeleton } from './Skeleton';
import { StatusBadge } from './StatusBadge';
import { NotifikasiList } from './NotifikasiList';

const formatDateIndo = (dateStr) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${day} ${months[monthIdx] || parts[1]} ${year}`;
};

export const DashboardSummaryCards = ({ dashSummary, loadingSummary }) => {
  const formatRupiah = (val) => {
    if (val === undefined || val === null) return 'Rp0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  const cardStyle = {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    backgroundColor: 'var(--bg-elevated)',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '140px',
    boxSizing: 'border-box'
  };

  const headerStyle = {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: '0.07em',
    marginBottom: '8px',
    marginTop: 0
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    }}>
      {/* 1. Periode Aktif */}
      <div style={cardStyle}>
        <div>
          <h4 style={headerStyle}>Periode Aktif</h4>
          {loadingSummary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <Skeleton width="90%" height="20px" />
              <Skeleton width="60%" height="16px" />
            </div>
          ) : (
            <div style={{ marginTop: '12px' }}>
              {dashSummary?.periodeAktif ? (
                <>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>
                    {formatDateIndo(dashSummary.periodeAktif.tanggalMulai)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0' }}>sampai dengan</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>
                    {formatDateIndo(dashSummary.periodeAktif.tanggalSelesai)}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '15px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Tidak ada periode aktif
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Status Periode */}
      <div style={cardStyle}>
        <div>
          <h4 style={headerStyle}>Status Periode</h4>
          {loadingSummary ? (
            <div style={{ marginTop: '12px' }}>
              <Skeleton width="110px" height="26px" borderRadius="var(--radius-full)" />
            </div>
          ) : (
            <div style={{ marginTop: '12px' }}>
              {dashSummary?.periodeAktif?.status ? (
                <StatusBadge status={dashSummary.periodeAktif.status} />
              ) : (
                <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
              )}
            </div>
          )}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
          Tahap operasional sistem
        </div>
      </div>

      {/* 3. Total Penerima Manfaat */}
      <div style={cardStyle}>
        <div>
          <h4 style={headerStyle}>Penerima Manfaat</h4>
          {loadingSummary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <Skeleton width="50%" height="28px" />
              <Skeleton width="80%" height="16px" />
            </div>
          ) : (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text)', lineHeight: '1.2' }}>
                {dashSummary?.totalPenerimaManfaat?.total || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', gap: '10px' }}>
                <span>Porsi Kecil: <strong>{dashSummary?.totalPenerimaManfaat?.porsiKecil || 0}</strong></span>
                <span>•</span>
                <span>Porsi Besar: <strong>{dashSummary?.totalPenerimaManfaat?.porsiBesar || 0}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Total Estimasi Biaya */}
      <div style={cardStyle}>
        <div>
          <h4 style={headerStyle}>Estimasi Biaya</h4>
          {loadingSummary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <Skeleton width="80%" height="28px" />
              <Skeleton width="60%" height="16px" />
            </div>
          ) : (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', lineHeight: '1.2', wordBreak: 'break-all' }}>
                {formatRupiah(dashSummary?.totalEstimasiBiaya)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Kebutuhan logistik periode
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Peringatan Aktif */}
      <div style={{ ...cardStyle, justifyContent: 'flex-start' }}>
        <h4 style={headerStyle}>Peringatan Aktif</h4>
        <div style={{ marginTop: '6px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          <NotifikasiList notifikasi={dashSummary?.notifikasiPenting} loading={loadingSummary} />
        </div>
      </div>
    </div>
  );
};
