import React from 'react';
import { Skeleton } from './Skeleton';

export const NotifikasiList = ({ notifikasi, loading }) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[...Array(3)].map((_, i) => <Skeleton key={i} height="40px" />)}
      </div>
    );
  }

  if (!notifikasi?.length) {
    return (
      <p style={{ color: 'var(--color-success)', fontSize: 14, margin: 0 }}>
        ✓ Tidak ada peringatan aktif untuk periode ini
      </p>
    );
  }

  // sort by count desc
  const sorted = [...notifikasi].sort((a, b) => b.count - a.count);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map(n => (
        <div
          key={n.key}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            backgroundColor: 'rgba(239, 68, 68, 0.07)',
            border: '1px solid rgba(239, 68, 68, 0.18)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text)' }}>{n.label}</span>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '2px 10px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-danger)',
            color: '#fff',
            flexShrink: 0,
          }}>
            {n.count}
          </span>
        </div>
      ))}
    </div>
  );
};
