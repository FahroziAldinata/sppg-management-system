import React from 'react';
import { StatusBadge } from './StatusBadge';

// ---------------------------------------------------------------------------
// Cell renderers — export terpisah biar bisa dipakai di luar Table
// ---------------------------------------------------------------------------

/** Tanggal: 2-baris "15 Jan / 2024" */
export const renderDate = (val) => {
  if (!val) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const d = new Date(val);
  const day = d.getDate();
  const month = d.toLocaleDateString('id-ID', { month: 'short' });
  const year = d.getFullYear();
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
        {day} {month}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{year}</div>
    </div>
  );
};

/**
 * Kode 2-baris: baris atas (bold) + baris bawah muted opsional.
 * @param {string} primary   — mis. "BKU-2024"
 * @param {string} [secondary] — mis. "REF-9921" (opsional — tidak dirender kalo falsy)
 */
export const renderCode = (primary, secondary) => {
  if (!primary) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.01em' }}>
        {primary}
      </div>
      {secondary && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {secondary}
        </div>
      )}
    </div>
  );
};

/** Teks panjang dengan truncate + tooltip */
export const renderTruncate = (val, maxWidth = 300) => {
  if (!val) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return (
    <div
      title={val}
      style={{
        maxWidth,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: 14,
        color: 'var(--text)',
      }}
    >
      {val}
    </div>
  );
};

/**
 * Nominal Rupiah tabular — menampilkan "—" jika 0/null.
 * @param {number|string|null} val
 * @param {boolean} [showDash=true] — tampilkan "—" untuk 0
 */
export const renderCurrency = (val, showDash = true) => {
  const num = Number(val);
  if (showDash && (!val || num === 0)) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }
  return (
    <span style={{
      fontVariantNumeric: 'tabular-nums',
      fontWeight: 600,
      color: 'var(--text)',
      letterSpacing: '0.01em',
    }}>
      {num.toLocaleString('id-ID')}
    </span>
  );
};

/** Status badge — wrapper ke StatusBadge */
export const renderStatus = (status, label) => (
  <StatusBadge status={status} label={label} />
);

// ---------------------------------------------------------------------------
// Table component
// ---------------------------------------------------------------------------

/**
 * Generic Table
 *
 * columns: Array<{
 *   key: string,
 *   header: string,
 *   align?: 'left' | 'right' | 'center',
 *   width?: string | number,
 *   render?: (value, row) => ReactNode,
 * }>
 *
 * data: Array<object>   — tiap object diakses via col.key, atau via col.render(row[col.key], row)
 */
export const Table = ({ columns = [], data = [], emptyText = 'Tidak ada data.' }) => {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-elevated)',
      boxShadow: 'var(--shadow)',
    }}>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'separate', 
        borderSpacing: 0, 
        tableLayout: 'auto',
        boxSizing: 'border-box'
      }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '12px 18px',
                  textAlign: col.align ?? 'left',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'var(--table-header-text)',
                  borderBottom: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                  width: col.width ?? undefined,
                  boxSizing: 'border-box',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '40px 18px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                style={{
                  transition: 'background-color var(--transition-fast), transform 0.2s ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(181,224,234,0.04)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '16px 18px',
                      textAlign: col.align ?? 'left',
                      verticalAlign: 'middle',
                      fontSize: 14,
                      color: 'var(--text)',
                      boxSizing: 'border-box',
                      borderBottom: idx < data.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : (row[col.key] ?? <span style={{ color: 'var(--text-muted)' }}>—</span>)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
