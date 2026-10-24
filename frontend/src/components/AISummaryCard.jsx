import React, { useState } from 'react';

/**
 * AI Session Summary component powered by Gemma via Express backend
 * @param {{
 *   metrics: object,
 *   isReady: boolean
 * }} props
 */
export default function AISummaryCard({ metrics, isReady }) {
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const handleGenerateSummary = async () => {
    if (!metrics) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch('/api/analysis/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exerciseType: 'squat',
          repetitionCount: metrics.repetitionCount || 0,
          videoDurationSeconds: metrics.videoDurationSeconds || 0,
          usableFrameRatio: metrics.usableFrameRatio || 0,
          avgDepthDegrees: metrics.avgDepthDegrees,
          bestDepthDegrees: metrics.bestDepthDegrees,
          repHistory: metrics.repHistory || []
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      setSummaryData(data);
    } catch (err) {
      console.error('AI summary request failed:', err);
      setApiError(err.message || 'Unable to connect to AI summary service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSummaryData(null);
    setApiError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* State 1: No summary generated yet */}
      {!summaryData && !isLoading && !apiError && (
        <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(129, 140, 248, 0.12)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.25rem' }}>
            AI-Assisted Session Explanation
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '320px', margin: '0 auto 1rem', lineHeight: 1.4 }}>
            Generate a plain-language explanation of your measured squat repetitions and depth angles.
          </p>

          <button
            type="button"
            onClick={handleGenerateSummary}
            disabled={!isReady}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '6px',
              background: isReady ? 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)' : '#334155',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isReady ? 'pointer' : 'not-allowed',
              opacity: isReady ? 1 : 0.5,
              transition: 'opacity 0.2s ease'
            }}
          >
            Generate AI Summary
          </button>
          {!isReady && (
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
              Run video analysis above before requesting an AI summary.
            </div>
          )}
        </div>
      )}

      {/* State 2: Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(56, 189, 248, 0.2)',
              borderTopColor: '#38bdf8',
              borderRadius: '50%',
              margin: '0 auto 0.75rem',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc' }}>
            Generating session explanation...
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Evaluating deterministic repetition and depth metrics
          </div>
        </div>
      )}

      {/* State 3: API Error with Retry */}
      {apiError && !isLoading && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fda4af', fontWeight: 600, fontSize: '0.85rem' }}>
            <span>⚠</span> AI Summary Unavailable
          </div>
          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
            {apiError}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Core squat counting and metrics remain fully functional above.
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={handleGenerateSummary}
              style={{
                padding: '0.4rem 0.85rem',
                backgroundColor: '#e11d48',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Retry Request
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '0.4rem 0.85rem',
                backgroundColor: 'transparent',
                border: '1px solid #475569',
                color: '#cbd5e1',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* State 4: Generated Summary Output */}
      {summaryData && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Provider Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span
                style={{
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: summaryData.isMock ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  color: summaryData.isMock ? '#fbbf24' : '#a5b4fc',
                  border: `1px solid ${summaryData.isMock ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                }}
              >
                {summaryData.isMock ? 'Local Demo Mode' : `Powered by ${summaryData.model || 'Gemma'}`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleReset}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Clear
            </button>
          </div>

          {/* Local Mock Notice per PRD Section 11 */}
          {summaryData.isMock && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: '#fde68a',
                fontSize: '0.75rem',
                lineHeight: 1.4
              }}
            >
              <strong>Notice:</strong> GEMINI_API_KEY is not configured in <code>backend/.env</code>. This response was generated locally for UI demonstration and was <em>not</em> produced by Gemma.
            </div>
          )}

          {/* Summary Text Content */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontSize: '0.875rem',
              lineHeight: 1.6
            }}
          >
            {summaryData.summary}
          </div>

          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Explanation is based solely on measured video duration and joint flexion angles.
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
