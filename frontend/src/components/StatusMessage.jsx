
import React from 'react';

/**
 * Status and alert banner component
 * @param {{ type: 'error'|'warning'|'info'|'success', message: string, onDismiss?: () => void }} props
 */
export default function StatusMessage({ type = 'info', message, onDismiss }) {
  if (!message) return null;

  const styles = {
    error: {
      bg: 'rgba(255, 241, 242, 0.92)',
      border: '#fecdd3',
      color: '#9f1239',
      iconColor: '#e11d48',
      iconBg: '#ffe4e6',
      title: 'Error'
    },
    warning: {
      bg: 'rgba(255, 251, 235, 0.92)',
      border: '#fcd34d',
      color: '#92400e',
      iconColor: '#d97706',
      iconBg: '#fef3c7',
      title: 'Warning'
    },
    info: {
      bg: 'rgba(239, 246, 255, 0.92)',
      border: '#bfdbfe',
      color: '#1e40af',
      iconColor: '#2563eb',
      iconBg: '#dbeafe',
      title: 'Information'
    },
    success: {
      bg: 'rgba(236, 253, 245, 0.92)',
      border: '#a7f3d0',
      color: '#065f46',
      iconColor: '#059669',
      iconBg: '#d1fae5',
      title: 'Success'
    }
  };

  const current = styles[type] || styles.info;

  const icon =
    type === 'error'
      ? '✕'
      : type === 'warning'
        ? '⚠'
        : type === 'success'
          ? '✓'
          : 'ℹ';

  return (
    <div
      role={type === 'info' || type === 'success' ? 'status' : 'alert'}
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '0.85rem',
        padding: '1rem 1.1rem',
        borderRadius: '15px',
        background: current.bg,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: `1px solid ${current.border}`,
        boxShadow: '0 5px 18px rgba(51, 65, 85, 0.04)',
        color: current.color,
        fontSize: '0.875rem',
        lineHeight: 1.6,
        margin: '0.75rem 0',
        minWidth: 0,
        animation: 'hiperStatusFadeIn 0.25s ease-out'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          minWidth: 0,
          flex: 1
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: '30px',
            height: '30px',
            flexShrink: 0,
            borderRadius: '10px',
            background: current.iconBg,
            color: current.iconColor,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.95rem',
            lineHeight: 1,
            marginTop: '0.05rem'
          }}
        >
          {icon}
        </span>

        <div
          style={{
            minWidth: 0,
            overflowWrap: 'anywhere',
            paddingTop: '0.2rem'
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              marginBottom: '0.15rem',
              letterSpacing: '-0.01em'
            }}
          >
            {current.title}
          </div>

          <div>{message}</div>
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          title="Dismiss"
          style={{
            width: '30px',
            height: '30px',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.65)',
            border: `1px solid ${current.border}`,
            borderRadius: '9px',
            color: current.color,
            cursor: 'pointer',
            fontSize: '1.1rem',
            lineHeight: 1,
            transition: 'background 0.2s ease'
          }}
        >
          ×
        </button>
      )}

      <style>{`
        @keyframes hiperStatusFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
