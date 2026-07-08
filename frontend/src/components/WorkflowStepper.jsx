import React from 'react';
import { Skeleton } from './Skeleton';
import { StatusBadge } from './StatusBadge';

// Status → label mapping untuk workflow stages
const STAGE_LABEL = {
  COMPLETED:   'Selesai',
  IN_PROGRESS: 'Berjalan',
  PENDING:     'Menunggu',
};

export const WorkflowStepper = ({ workflowProgress, loading }) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skeleton width="28px" height="28px" borderRadius="50%" />
            <Skeleton width="60%" height="16px" />
          </div>
        ))}
      </div>
    );
  }

  if (!workflowProgress) return null;
  const { currentStage, stages } = workflowProgress;

  return (
    <div style={{ position: 'relative' }}>
      {/* vertical connector line */}
      <div style={{
        position: 'absolute', left: 13, top: 14, bottom: 14,
        width: 2, backgroundColor: 'var(--border)', zIndex: 0,
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {stages.map((s) => {
          const isActive = s.stage === currentStage;
          // dot color for the step circle
          const dotColor = s.status === 'COMPLETED'
            ? 'var(--color-success)'
            : s.status === 'IN_PROGRESS'
              ? 'var(--color-warning)'
              : 'var(--text-muted)';

          return (
            <div
              key={s.stage}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '10px 0', position: 'relative', zIndex: 1,
              }}
            >
              {/* step circle */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                backgroundColor: s.status === 'PENDING' ? 'var(--bg-elevated)' : dotColor,
                border: `2px solid ${dotColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: s.status === 'PENDING' ? dotColor : '#fff',
                fontSize: 12, fontWeight: 700,
                boxShadow: isActive ? `0 0 0 3px ${dotColor}33` : 'none',
                flexShrink: 0,
                transition: 'box-shadow var(--transition-normal)',
              }}>
                {s.status === 'COMPLETED' ? '✓' : s.stage}
              </div>

              {/* label + StatusBadge (dot konsisten) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  color: s.status === 'PENDING' ? 'var(--text-muted)' : 'var(--text)',
                  flex: 1, minWidth: 0,
                }}>
                  {s.name}
                </span>
                <StatusBadge status={s.status} label={STAGE_LABEL[s.status]} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
