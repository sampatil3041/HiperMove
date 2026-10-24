import React from 'react';

/**
 * Status and alert banner component
 * @param {{ type: 'error'|'warning'|'info'|'success', message: string, onDismiss?: () => void }} props
 */
export default function StatusMessage({ type = 'info', message, onDismiss }) {
  if (!message) return null;

  const styles = {
    error: {
      bg: 'rgba(244, 63, 94, 0.12)',
      border: 'rgba(244, 63, 94, 0.35)',
      color: '#fda4af',
      iconColor: '#f43f5e'
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
      color: '#fde68a',
      iconColor: '#f59e0b'
    },
    info: {
      bg: 'rgba(56, 189, 248, 0.12)',
      border: 'rgba(56, 189, 248, 0.35)',
      color: '#bae6fd',
      iconColor: '#38bdf8'
    },
    success: {
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
      color: '#a7f3d0',
      iconColor: '#10b981'
    }
  };

  const current = styles[type] || styles.info;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
        borderRadius: '8px',
        backgroundColor: current.bg,
        border: `1px solid ${current.border}`,
        color: current.color,
        fontSize: '0.875rem',
        lineHeight: '1.4',
        margin: '0.75rem 0'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
        <span style={{ color: current.iconColor, fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}>
          {type === 'error' ? '✕' : type === 'warning' ? '⚠' : type === 'success' ? '✓' : 'ℹ'}
        </span>
        <div>{message}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '0 0.25rem',
            fontSize: '1rem',
            opacity: 0.8
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
