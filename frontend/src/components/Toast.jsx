import React, { useEffect, useState } from 'react';

// ponytail: pure CSS animation via className toggle — no framer-motion needed
const ICONS = {
  success: '✓',
  error: '✗',
  info: 'ℹ',
};

const COLORS = {
  success: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    icon: '#10b981',
    bar: '#10b981',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
    icon: '#ef4444',
    bar: '#ef4444',
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.35)',
    icon: '#3b82f6',
    bar: '#3b82f6',
  },
};

function ToastItem({ id, message, type = 'info', duration = 3000, onRemove }) {
  const [visible, setVisible] = useState(false);
  const [barStart, setBarStart] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const c = COLORS[type] || COLORS.info;

  useEffect(() => {
    // Two rAF frames: first sets visible (slide in), second starts bar shrink
    const f1 = requestAnimationFrame(() => {
      setVisible(true);
      requestAnimationFrame(() => setBarStart(true));
    });
    const leaveTimer = setTimeout(() => dismiss(), duration);
    return () => {
      cancelAnimationFrame(f1);
      clearTimeout(leaveTimer);
    };
  }, []);

  function dismiss() {
    setLeaving(true);
    setTimeout(() => onRemove(id), 300);
  }

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'relative',
        minWidth: '280px',
        maxWidth: '420px',
        backgroundColor: 'var(--bg-elevated)',
        border: `1px solid ${c.border}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px 40px 12px 16px',
        boxShadow: 'var(--shadow-hover)',
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        opacity: visible && !leaving ? 1 : 0,
        transform: visible && !leaving ? 'translateX(0)' : 'translateX(32px)',
        transition: 'opacity 0.28s ease, transform 0.28s ease',
      }}
    >
      {/* Icon badge */}
      <span style={{
        flexShrink: 0,
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: '800',
        color: c.icon,
      }}>
        {ICONS[type]}
      </span>

      {/* Message */}
      <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', lineHeight: '1.5', paddingTop: '1px' }}>
        {message}
      </span>

      {/* Close × */}
      <span style={{
        position: 'absolute',
        top: '10px',
        right: '12px',
        fontSize: '14px',
        color: 'var(--text-muted)',
        lineHeight: 1,
      }}>×</span>

      {/* Progress bar: starts 100%, shrinks to 0% over duration */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: '3px',
        backgroundColor: c.bar,
        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
        width: barStart ? '0%' : '100%',
        transition: barStart ? `width ${duration}ms linear` : 'none',
      }} />
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem {...t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
