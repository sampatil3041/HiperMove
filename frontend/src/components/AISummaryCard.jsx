import React, { useEffect, useState } from 'react';

/**
 * AI Session Summary component powered by Gemma via Express backend.
 * @param {{
 *   metrics: object,
 *   isReady: boolean
 * }} props
 */
export default function AISummaryCard({ metrics, isReady }) {
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [speechState, setSpeechState] = useState('idle');
  const [speechError, setSpeechError] = useState(null);

  const stopReading = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeechState('idle');
  };

  const handleReadAloud = () => {
    if (!summaryData?.summary) return;

    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      typeof window.SpeechSynthesisUtterance === 'undefined'
    ) {
      setSpeechError('Read Aloud is not supported by this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    setSpeechError(null);

    const utterance = new window.SpeechSynthesisUtterance(
      String(summaryData.summary)
    );

    utterance.lang = 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => setSpeechState('speaking');
    utterance.onend = () => setSpeechState('idle');
    utterance.onerror = () => setSpeechState('idle');

    setSpeechState('speaking');
    window.speechSynthesis.speak(utterance);
  };

  const handlePauseResume = () => {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      return;
    }

    if (speechState === 'paused') {
      window.speechSynthesis.resume();
      setSpeechState('speaking');
    } else if (speechState === 'speaking') {
      window.speechSynthesis.pause();
      setSpeechState('paused');
    }
  };

  useEffect(() => {
    return () => {
      if (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleGenerateSummary = async () => {
    stopReading();
    setSpeechError(null);

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
        throw new Error(
          data.message || `Request failed with status ${response.status}`
        );
      }

      setSummaryData(data);
    } catch (err) {
      console.error('AI summary request failed:', err);

      setApiError(
        err.message || 'Unable to connect to AI summary service.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    stopReading();
    setSpeechError(null);
    setSummaryData(null);
    setApiError(null);
  };

  const panelStyle = {
    background: 'rgba(255, 255, 255, 0.76)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(203, 213, 225, 0.8)',
    borderRadius: '18px',
    padding: '1.25rem',
    boxShadow: '0 8px 24px rgba(51, 65, 85, 0.045)',
    color: '#172554'
  };

  const primaryButtonStyle = {
    padding: '0.7rem 1.1rem',
    borderRadius: '11px',
    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    color: '#ffffff',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 5px 14px rgba(37, 99, 235, 0.15)',
    transition: 'opacity 0.2s ease, transform 0.2s ease'
  };

  const secondaryButtonStyle = {
    padding: '0.65rem 0.95rem',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.8)',
    border: '1px solid #cbd5e1',
    color: '#475569',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer'
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem',
        width: '100%',
        minWidth: 0
      }}
    >
      {/* State 1: No summary generated */}
      {!summaryData && !isLoading && !apiError && (
        <div
          style={{
            ...panelStyle,
            textAlign: 'center',
            padding: '1.8rem 1.25rem'
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '17px',
              background: 'linear-gradient(145deg, #e0e7ff, #dbeafe)',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: 'inset 0 0 0 1px rgba(99, 102, 241, 0.1)'
            }}
          >
            <svg
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>

          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#172554',
              letterSpacing: '-0.025em',
              marginBottom: '0.45rem'
            }}
          >
            AI-Assisted Session Explanation
          </div>

          <p
            style={{
              fontSize: '0.85rem',
              color: '#64748b',
              maxWidth: '370px',
              margin: '0 auto 1.2rem',
              lineHeight: 1.65
            }}
          >
            Get a plain-language explanation of your measured squat
            repetitions, knee angles, and tracking results.
          </p>

          <button
            type="button"
            onClick={handleGenerateSummary}
            disabled={!isReady}
            style={{
              ...primaryButtonStyle,
              opacity: isReady ? 1 : 0.5,
              cursor: isReady ? 'pointer' : 'not-allowed'
            }}
          >
            ✦ Generate AI Summary
          </button>

          {!isReady && (
            <div
              style={{
                fontSize: '0.78rem',
                color: '#94a3b8',
                marginTop: '0.75rem',
                lineHeight: 1.5
              }}
            >
              Complete video analysis above before requesting a summary.
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              marginTop: '1.1rem',
              fontSize: '0.72rem',
              color: '#94a3b8'
            }}
          >
            <span aria-hidden="true">ⓘ</span>
            <span>AI explanation is separate from calculated metrics.</span>
          </div>
        </div>
      )}

      {/* State 2: Loading */}
      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          style={{
            ...panelStyle,
            textAlign: 'center',
            padding: '2rem 1rem'
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              border: '3px solid #dbeafe',
              borderTopColor: '#4f46e5',
              borderRadius: '50%',
              margin: '0 auto 1rem',
              animation: 'hiperAiSpin 0.8s linear infinite'
            }}
          />

          <div
            style={{
              fontSize: '0.95rem',
              fontWeight: 750,
              color: '#172554'
            }}
          >
            Generating session explanation...
          </div>

          <div
            style={{
              fontSize: '0.8rem',
              color: '#64748b',
              marginTop: '0.4rem',
              lineHeight: 1.5
            }}
          >
            Preparing an explanation from your calculated movement metrics.
          </div>
        </div>
      )}

      {/* State 3: API Error */}
      {apiError && !isLoading && (
        <div
          role="alert"
          style={{
            padding: '1.15rem',
            borderRadius: '16px',
            background: 'rgba(255, 241, 242, 0.92)',
            border: '1px solid #fecdd3',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.7rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              color: '#be123c',
              fontWeight: 800,
              fontSize: '0.9rem'
            }}
          >
            <span
              style={{
                width: '30px',
                height: '30px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                background: '#ffe4e6'
              }}
              aria-hidden="true"
            >
              !
            </span>
            AI Summary Unavailable
          </div>

          <div
            style={{
              fontSize: '0.84rem',
              color: '#9f1239',
              lineHeight: 1.6,
              overflowWrap: 'anywhere'
            }}
          >
            {apiError}
          </div>

          <div
            style={{
              fontSize: '0.78rem',
              color: '#881337',
              lineHeight: 1.5
            }}
          >
            Your calculated squat count and metrics above remain available.
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.6rem',
              flexWrap: 'wrap',
              marginTop: '0.2rem'
            }}
          >
            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={isLoading}
              style={{
                ...primaryButtonStyle,
                background: 'linear-gradient(135deg, #e11d48, #be123c)',
                boxShadow: 'none'
              }}
            >
              Retry Request
            </button>

            <button
              type="button"
              onClick={handleReset}
              style={secondaryButtonStyle}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* State 4: Generated Summary */}
      {summaryData && !isLoading && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}
        >
          {/* Provider Badge */}
          <div
            style={{
              ...panelStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              padding: '0.9rem 1.1rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                flexWrap: 'wrap'
              }}
            >
              <span
                style={{
                  width: '30px',
                  height: '30px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '10px',
                  background: '#e0e7ff',
                  color: '#4338ca',
                  fontWeight: 800
                }}
                aria-hidden="true"
              >
                ✦
              </span>

              <span
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '999px',
                  fontSize: '0.73rem',
                  fontWeight: 750,
                  background: summaryData.isMock ? '#fef3c7' : '#e0e7ff',
                  color: summaryData.isMock ? '#92400e' : '#4338ca',
                  border: `1px solid ${
                    summaryData.isMock ? '#fcd34d' : '#c7d2fe'
                  }`,
                  overflowWrap: 'anywhere'
                }}
              >
                {summaryData.isMock
                  ? 'Local Demo Mode'
                  : `Powered by ${summaryData.model || 'Gemma'}`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleReset}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.8rem',
                fontWeight: 650,
                cursor: 'pointer',
                padding: '0.4rem'
              }}
            >
              Clear summary
            </button>
          </div>

          {/* Local Mock Notice */}
          {summaryData.isMock && (
            <div
              style={{
                padding: '0.9rem 1rem',
                borderRadius: '13px',
                background: 'rgba(255, 251, 235, 0.92)',
                border: '1px solid #fcd34d',
                color: '#92400e',
                fontSize: '0.8rem',
                lineHeight: 1.65,
                overflowWrap: 'anywhere'
              }}
            >
              <strong>Demo response:</strong> GEMINI_API_KEY is not configured
              in <code>backend/.env</code>. This response was generated locally
              for UI demonstration and was not produced by Gemma.
            </div>
          )}

          {/* Summary Text */}
          <div
            style={{
              ...panelStyle,
              padding: '1.25rem',
              borderTop: '3px solid #818cf8'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                marginBottom: '0.85rem'
              }}
            >
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '11px',
                  background: '#eef2ff',
                  color: '#4f46e5',
                  fontSize: '1rem'
                }}
                aria-hidden="true"
              >
                ✧
              </span>

              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: '#172554'
                }}
              >
                Your Session Explained
              </div>
            </div>

            <div
              style={{
                color: '#334155',
                fontSize: '0.9rem',
                lineHeight: 1.85,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere'
              }}
            >
              {summaryData.summary}
            </div>

            {/* Read Aloud Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                flexWrap: 'wrap',
                marginTop: '1rem'
              }}
            >
              <button
                type="button"
                onClick={handleReadAloud}
                style={primaryButtonStyle}
              >
                {speechState === 'speaking' || speechState === 'paused'
                  ? '↻ Read Again'
                  : '🔊 Read Aloud'}
              </button>

              <button
                type="button"
                onClick={handlePauseResume}
                disabled={speechState === 'idle'}
                style={{
                  ...secondaryButtonStyle,
                  opacity: speechState === 'idle' ? 0.5 : 1,
                  cursor:
                    speechState === 'idle' ? 'not-allowed' : 'pointer'
                }}
              >
                {speechState === 'paused' ? '▶ Resume' : 'Ⅱ Pause'}
              </button>

              <button
                type="button"
                onClick={stopReading}
                disabled={speechState === 'idle'}
                style={{
                  ...secondaryButtonStyle,
                  opacity: speechState === 'idle' ? 0.5 : 1,
                  cursor:
                    speechState === 'idle' ? 'not-allowed' : 'pointer'
                }}
              >
                ■ Stop
              </button>
            </div>

            {speechError && (
              <div
                role="status"
                style={{
                  marginTop: '0.65rem',
                  color: '#b91c1c',
                  fontSize: '0.78rem',
                  lineHeight: 1.5
                }}
              >
                {speechError}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.55rem',
              padding: '0.2rem 0.2rem',
              fontSize: '0.75rem',
              color: '#64748b',
              lineHeight: 1.6
            }}
          >
            <span aria-hidden="true">ⓘ</span>
            <span>
              This explanation is based on the supplied session metrics. It
              does not replace the deterministic measurements or provide a
              medical assessment.
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes hiperAiSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}