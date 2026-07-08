import React from 'react';

/**
 * StatusBadge — dot style konsisten di seluruh app.
 * status: key enum (COMPLETED, IN_PROGRESS, PENDING, DISETUJUI, DIAJUKAN, DITOLAK, DRAFT, AKTIF, dll)
 * label: override teks tampilan (opsional)
 */
const STATUS_MAP = {
  // Workflow stages
  COMPLETED:   { color: 'var(--color-success)', bg: 'rgba(16,185,129,0.12)',  text: 'Selesai' },
  IN_PROGRESS: { color: 'var(--color-warning)', bg: 'rgba(245,158,11,0.13)',  text: 'Berjalan' },
  PENDING:     { color: 'var(--text-muted)',    bg: 'rgba(100,116,139,0.10)', text: 'Menunggu' },
  // Approval / dokumen
  DISETUJUI:   { color: 'var(--color-success)', bg: 'rgba(16,185,129,0.12)',  text: 'Disetujui' },
  DIAJUKAN:    { color: 'var(--color-warning)', bg: 'rgba(245,158,11,0.13)',  text: 'Diajukan' },
  DITOLAK:     { color: 'var(--color-danger)',  bg: 'rgba(239,68,68,0.12)',   text: 'Ditolak' },
  DRAFT:       { color: 'var(--text-muted)',    bg: 'rgba(100,116,139,0.10)', text: 'Draft' },
  // Periode
  AKTIF:       { color: 'var(--color-success)', bg: 'rgba(16,185,129,0.12)',  text: 'Aktif' },
  SELESAI:     { color: 'var(--text-muted)',    bg: 'rgba(100,116,139,0.10)', text: 'Selesai' },
  // Jenis Transaksi
  MASUK:       { color: 'var(--color-success)', bg: 'rgba(16,185,129,0.12)',  text: 'Masuk' },
  KELUAR:      { color: 'var(--color-danger)',  bg: 'rgba(239,68,68,0.12)',   text: 'Keluar' },
};

export const StatusBadge = ({ status, label }) => {
  const cfg = STATUS_MAP[status] ?? {
    color: 'var(--text-muted)',
    bg: 'rgba(100,116,139,0.10)',
    text: label ?? status ?? '—',
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 'var(--radius-full)',
      backgroundColor: cfg.bg,
      color: cfg.color,
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      lineHeight: 1.6,
    }}>
      {/* dot: font-size kecil biar proporsional */}
      <span style={{ fontSize: 7, lineHeight: 1, flexShrink: 0 }}>●</span>
      {label ?? cfg.text}
    </span>
  );
};
