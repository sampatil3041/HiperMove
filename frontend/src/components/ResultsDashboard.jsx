import React from 'react';

/**
 * Dedicated Results Dashboard for completed session analysis
 * Displays only verified, calculated metrics without unvalidated scores.
 * @param {{
 *   metrics: {
 *     exerciseType: string,
 *     repetitionCount: number,
 *     videoDurationSeconds: number,
 *     usableFrameRatio: number,
 *     avgDepthDegrees: number | null,
 *     bestDepthDegrees: number | null,
 *     repHistory: Array<{ repNumber: number, minAngle: number, durationMs: number, side: string }>,
 *     qualityAssessment: string
 *   },
 *   onReplay: () => void,
 *   onReset: () => void
 * }} props
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
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(metrics, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `hipermove_squat_analysis_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        animation: 'fadeIn 0.3s ease-in-out'
      }}
    >
      {/* Session Completion Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid #334155'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}
          >
            ✓
          </span>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
              Session Analysis Complete
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Deterministic calculation finished for {videoDurationSeconds}s clip
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportJson}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontSize: '0.75rem',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          ⬇ Export JSON
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.85rem'
        }}
      >
        {/* Repetitions */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)',
            border: '1px solid #38bdf8',
            borderRadius: '10px',
            padding: '1rem',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Completed Reps
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem', lineHeight: 1 }}>
            {repetitionCount}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            {repetitionCount === 1 ? '1 full cycle' : `${repetitionCount} full cycles`}
          </div>
        </div>

        {/* Avg Depth */}
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '1rem',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Average Depth
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.35rem', lineHeight: 1 }}>
            {avgDepthDegrees !== null ? `${avgDepthDegrees}°` : '—'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            Knee flexion angle
          </div>
        </div>

        {/* Best Depth */}
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '1rem',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Deepest Rep
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: bestDepthDegrees !== null ? '#34d399' : '#f8fafc', marginTop: '0.35rem', lineHeight: 1 }}>
            {bestDepthDegrees !== null ? `${bestDepthDegrees}°` : '—'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            {bestDepthDegrees !== null && bestDepthDegrees <= 90 ? 'Full parallel depth' : 'Standard depth'}
          </div>
        </div>

        {/* Tracking Usability */}
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '1rem',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tracked Frames
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: coveragePercent >= 80 ? '#34d399' : '#fbbf24',
              marginTop: '0.35rem',
              lineHeight: 1
            }}
          >
            {coveragePercent}%
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            Usable landmark ratio
          </div>
        </div>
      </div>

      {/* Quality Advisory Banner */}
      {coveragePercent < 60 ? (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#fde68a',
            fontSize: '0.8rem',
            lineHeight: 1.4
          }}
        >
          <strong>Visibility Advisory:</strong> Only {coveragePercent}% of video frames had fully identifiable knee and hip landmarks. For higher accuracy, record from a side angle (approx. 90° or 45°) with good lighting and full body visibility.
        </div>
      ) : repetitionCount === 0 ? (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#bae6fd',
            fontSize: '0.8rem',
            lineHeight: 1.4
          }}
        >
          <strong>Zero Completed Repetitions:</strong> The algorithm requires descending to &le; 100° knee flexion and returning to upright standing (&ge; 155°). Ensure full movement range is performed during the clip.
        </div>
      ) : null}

      {/* Rep Breakdown Table */}
      {repHistory && repHistory.length > 0 && (
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.85rem' }}>
          <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>
            Repetition Breakdown
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Repetition</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Lowest Knee Flexion</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Observed Side</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Rep Cycle Time</th>
                </tr>
              </thead>
              <tbody>
                {repHistory.map((rep) => (
                  <tr key={rep.repNumber} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.45rem 0.5rem', fontWeight: 600, color: '#38bdf8' }}>
                      Squat #{rep.repNumber}
                    </td>
                    <td style={{ padding: '0.45rem 0.5rem', color: '#f8fafc', fontWeight: 500 }}>
                      {rep.minAngle}°
                    </td>
                    <td style={{ padding: '0.45rem 0.5rem', color: '#94a3b8' }}>
                      {rep.side === 'left' ? 'Left Leg Profile' : 'Right Leg Profile'}
                    </td>
                    <td style={{ padding: '0.45rem 0.5rem', color: '#94a3b8' }}>
                      {rep.durationMs ? `${(rep.durationMs / 1000).toFixed(1)}s` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
        <button
          type="button"
          onClick={onReplay}
          style={{
            flex: 1,
            padding: '0.55rem 1rem',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ↺ Replay Analysis
        </button>

        <button
          type="button"
          onClick={onReset}
          style={{
            padding: '0.55rem 1rem',
            backgroundColor: 'transparent',
            border: '1px solid #475569',
            color: '#cbd5e1',
            borderRadius: '6px',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          Analyze Another Video
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
