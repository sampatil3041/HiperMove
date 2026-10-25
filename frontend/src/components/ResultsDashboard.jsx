
import React from 'react';

/**
 * Dedicated Results Dashboard for completed session analysis.
 * Displays verified, calculated metrics without unvalidated scores.
 */
export default function ResultsDashboard({ metrics, onReplay, onReset }) {
  if (!metrics) return null;

  const {
    repetitionCount,
    videoDurationSeconds,
    usableFrameRatio,
    avgDepthDegrees,
    bestDepthDegrees,
    repHistory
  } = metrics;

  const coveragePercent = Math.round((usableFrameRatio || 0) * 100);

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(metrics, null, 2));

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `hipermove_squat_analysis_${Date.now()}.json`
    );

    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(203, 213, 225, 0.75)',
    borderRadius: '18px',
    padding: '1.15rem',
    boxShadow: '0 8px 24px rgba(51, 65, 85, 0.045)',
    minWidth: 0
  };

  const labelStyle = {
    fontSize: '0.72rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.075em',
    fontWeight: 700
  };

  const metricValueStyle = {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#172554',
    marginTop: '0.65rem',
    lineHeight: 1.1,
    letterSpacing: '-0.045em'
  };

  const helperStyle = {
    fontSize: '0.76rem',
    color: '#64748b',
    marginTop: '0.5rem',
    lineHeight: 1.5
  };

  const primaryButtonStyle = {
    flex: '1 1 180px',
    padding: '0.8rem 1.15rem',
    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    color: '#ffffff',
    border: '1px solid rgba(37, 99, 235, 0.2)',
    borderRadius: '12px',
    fontSize: '0.88rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 5px 14px rgba(37, 99, 235, 0.16)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  };

  const secondaryButtonStyle = {
    flex: '1 1 180px',
    padding: '0.8rem 1.15rem',
    background: 'rgba(255, 255, 255, 0.75)',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    fontSize: '0.88rem',
    fontWeight: 650,
    cursor: 'pointer',
    transition: 'background 0.2s ease'
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        animation: 'hiperResultsFadeIn 0.35s ease-out',
        color: '#172554',
        width: '100%',
        minWidth: 0
      }}
    >
      {/* Session Completion Header */}
      <div
        style={{
          ...cardStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1.25rem'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.9rem',
            minWidth: 0
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: '46px',
              height: '46px',
              flexShrink: 0,
              borderRadius: '15px',
              background: 'linear-gradient(145deg, #d1fae5, #a7f3d0)',
              color: '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 800,
              boxShadow: 'inset 0 0 0 1px rgba(5, 150, 105, 0.1)'
            }}
          >
            ✓
          </div>

          <div>
            <div
              style={{
                fontSize: '1.12rem',
                fontWeight: 800,
                color: '#172554',
                letterSpacing: '-0.025em'
              }}
            >
              Session Analysis Complete
            </div>

            <div
              style={{
                fontSize: '0.82rem',
                color: '#64748b',
                marginTop: '0.3rem',
                lineHeight: 1.5
              }}
            >
              Calculated results from your {videoDurationSeconds}s video clip
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportJson}
          style={{
            padding: '0.65rem 0.9rem',
            borderRadius: '10px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          ↓ Export JSON
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 185px), 1fr))',
          gap: '1rem'
        }}
      >
        {/* Completed Repetitions */}
        <div
          style={{
            ...cardStyle,
            background:
              'linear-gradient(145deg, rgba(239, 246, 255, 0.95), rgba(255, 255, 255, 0.85))',
            border: '1px solid #bfdbfe'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem'
            }}
          >
            <span style={labelStyle}>Completed Reps</span>
            <span
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                background: '#dbeafe',
                color: '#2563eb',
                fontSize: '1rem'
              }}
              aria-hidden="true"
            >
              ↻
            </span>
          </div>

          <div
            style={{
              ...metricValueStyle,
              fontSize: '2.65rem',
              color: '#1d4ed8'
            }}
          >
            {repetitionCount}
          </div>

          <div style={helperStyle}>
            {repetitionCount === 1
              ? '1 full movement cycle'
              : `${repetitionCount} full movement cycles`}
          </div>
        </div>

        {/* Average Depth */}
        <div style={cardStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem'
            }}
          >
            <span style={labelStyle}>Average Depth</span>
            <span
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                background: '#f1f5f9',
                color: '#475569',
                fontSize: '0.95rem'
              }}
              aria-hidden="true"
            >
              ∠
            </span>
          </div>

          <div style={metricValueStyle}>
            {avgDepthDegrees != null ? `${avgDepthDegrees}°` : '—'}
          </div>

          <div style={helperStyle}>Average observed knee flexion angle</div>
        </div>

        {/* Deepest Repetition */}
        <div style={cardStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem'
            }}
          >
            <span style={labelStyle}>Deepest Rep</span>
            <span
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                background: '#d1fae5',
                color: '#047857',
                fontSize: '1rem'
              }}
              aria-hidden="true"
            >
              ↓
            </span>
          </div>

          <div
            style={{
              ...metricValueStyle,
              color: bestDepthDegrees != null ? '#047857' : '#172554'
            }}
          >
            {bestDepthDegrees != null ? `${bestDepthDegrees}°` : '—'}
          </div>

          <div style={helperStyle}>
            {bestDepthDegrees != null && bestDepthDegrees <= 90
              ? 'Lowest observed knee angle'
              : 'Lowest observed knee angle'}
          </div>
        </div>

        {/* Tracking Coverage */}
        <div style={cardStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem'
            }}
          >
            <span style={labelStyle}>Tracked Frames</span>
            <span
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                background: coveragePercent >= 80 ? '#d1fae5' : '#fef3c7',
                color: coveragePercent >= 80 ? '#047857' : '#b45309',
                fontSize: '0.95rem'
              }}
              aria-hidden="true"
            >
              ◉
            </span>
          </div>

          <div
            style={{
              ...metricValueStyle,
              color: coveragePercent >= 80 ? '#047857' : '#b45309'
            }}
          >
            {coveragePercent}%
          </div>

          <div style={helperStyle}>Usable landmark ratio</div>

          <div
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '999px',
              background: '#e2e8f0',
              overflow: 'hidden',
              marginTop: '0.9rem'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, coveragePercent))}%`,
                borderRadius: '999px',
                background:
                  coveragePercent >= 80
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* Quality Advisory Banner */}
      {coveragePercent < 60 ? (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem',
            padding: '1rem 1.1rem',
            borderRadius: '14px',
            background: 'rgba(255, 251, 235, 0.9)',
            border: '1px solid #fcd34d',
            color: '#92400e',
            fontSize: '0.84rem',
            lineHeight: 1.65
          }}
        >
          <span style={{ fontSize: '1.15rem' }} aria-hidden="true">
            ⚠
          </span>
          <div>
            <strong>Visibility Advisory</strong>
            <div style={{ marginTop: '0.2rem' }}>
              Only {coveragePercent}% of video frames had identifiable knee and
              hip landmarks. For more reliable tracking, record from a side
              angle (approximately 90° or 45°), use good lighting, and keep the
              full body visible.
            </div>
          </div>
        </div>
      ) : repetitionCount === 0 ? (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem',
            padding: '1rem 1.1rem',
            borderRadius: '14px',
            background: 'rgba(239, 246, 255, 0.9)',
            border: '1px solid #bfdbfe',
            color: '#1e40af',
            fontSize: '0.84rem',
            lineHeight: 1.65
          }}
        >
          <span style={{ fontSize: '1.15rem' }} aria-hidden="true">
            ℹ
          </span>
          <div>
            <strong>No Completed Repetitions Detected</strong>
            <div style={{ marginTop: '0.2rem' }}>
              The current algorithm requires descending to ≤ 100° knee flexion
              and returning to an upright position (≥ 155°). Check that the
              video contains the full movement and that your body is clearly
              visible.
            </div>
          </div>
        </div>
      ) : null}

      {/* Repetition Breakdown */}
      {repHistory && repHistory.length > 0 && (
        <div
          style={{
            ...cardStyle,
            padding: 0,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '1.15rem 1.2rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#172554',
                  letterSpacing: '-0.02em'
                }}
              >
                Repetition Breakdown
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#64748b',
                  marginTop: '0.25rem'
                }}
              >
                Individual measurements for detected squat cycles
              </div>
            </div>

            <span
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '999px',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {repHistory.length} {repHistory.length === 1 ? 'rep' : 'reps'}
            </span>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table
              style={{
                width: '100%',
                minWidth: '540px',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.82rem'
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'rgba(241, 245, 249, 0.75)',
                    color: '#64748b'
                  }}
                >
                  <th
                    scope="col"
                    style={{
                      padding: '0.85rem 1rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Repetition
                  </th>
                  <th
                    scope="col"
                    style={{
                      padding: '0.85rem 1rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Lowest Knee Angle
                  </th>
                  <th
                    scope="col"
                    style={{
                      padding: '0.85rem 1rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Observed Side
                  </th>
                  <th
                    scope="col"
                    style={{
                      padding: '0.85rem 1rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Cycle Time
                  </th>
                </tr>
              </thead>

              <tbody>
                {repHistory.map((rep, index) => (
                  <tr
                    key={rep.repNumber}
                    style={{
                      borderTop: '1px solid #e2e8f0',
                      background:
                        index % 2 === 0
                          ? 'rgba(255, 255, 255, 0.55)'
                          : 'rgba(248, 250, 252, 0.65)'
                    }}
                  >
                    <td
                      style={{
                        padding: '0.9rem 1rem',
                        fontWeight: 750,
                        color: '#1d4ed8',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Squat #{rep.repNumber}
                    </td>

                    <td
                      style={{
                        padding: '0.9rem 1rem',
                        color: '#172554',
                        fontWeight: 700,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {rep.minAngle}°
                    </td>

                    <td
                      style={{
                        padding: '0.9rem 1rem',
                        color: '#475569',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {rep.side === 'left'
                        ? 'Left Leg Profile'
                        : 'Right Leg Profile'}
                    </td>

                    <td
                      style={{
                        padding: '0.9rem 1rem',
                        color: '#475569',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {rep.durationMs
                        ? `${(rep.durationMs / 1000).toFixed(1)}s`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '0.8rem',
          flexWrap: 'wrap',
          marginTop: '0.15rem'
        }}
      >
        <button
          type="button"
          onClick={onReplay}
          style={primaryButtonStyle}
        >
          ↺ Replay Analysis
        </button>

        <button
          type="button"
          onClick={onReset}
          style={secondaryButtonStyle}
        >
          + Analyze Another Video
        </button>
      </div>

      <style>{`
        @keyframes hiperResultsFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 520px) {
          .hipermove-results-unused {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
