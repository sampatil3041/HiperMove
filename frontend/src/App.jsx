import React, { useState, useEffect, useRef } from 'react';
import VideoUploader from './components/VideoUploader.jsx';
import PoseOverlay from './components/PoseOverlay.jsx';
import StatusMessage from './components/StatusMessage.jsx';
import { loadAndValidateVideoMetadata } from './utils/videoValidation.js';
import { usePoseDetection } from './hooks/usePoseDetection.js';
import { SquatCounter, SQUAT_STATES } from './utils/squatCounter.js';
import { buildMovementSessionSummary } from './utils/movementMetrics.js';

export default function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Phase 4: MediaPipe Hook for video processing
  const {
    isModelLoading,
    isModelReady,
    modelError,
    detectVideoFrame,
    resetAnalysisSession,
    analysisStats
  } = usePoseDetection();

  // Phase 5: Deterministic Squat Counter
  const squatCounterRef = useRef(new SquatCounter());
  const [counterState, setCounterState] = useState({
    state: SQUAT_STATES.UNKNOWN,
    repetitionCount: 0,
    currentAngle: null,
    minAngle: 180,
    side: 'unknown',
    repHistory: []
  });

  // Safely release object URLs on unmount or URL replacement
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleFileSelected = async (file) => {
    setErrorMessage(null);
    setIsValidating(true);
    resetAnalysisSession();
    squatCounterRef.current.reset();
    setCounterState({
      state: SQUAT_STATES.UNKNOWN,
      repetitionCount: 0,
      currentAngle: null,
      minAngle: 180,
      side: 'unknown',
      repHistory: []
    });

    try {
      const result = await loadAndValidateVideoMetadata(file);

      if (!result.isValid) {
        setErrorMessage(result.error || 'Video validation failed.');
        setIsValidating(false);
        return;
      }

      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }

      setVideoFile(file);
      setVideoMetadata(result.metadata);
      setVideoUrl(result.objectUrl);
    } catch (err) {
      setErrorMessage(`Unexpected error during validation: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleResetVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoFile(null);
    setVideoMetadata(null);
    setVideoUrl(null);
    resetAnalysisSession();
    squatCounterRef.current.reset();
    setCounterState({
      state: SQUAT_STATES.UNKNOWN,
      repetitionCount: 0,
      currentAngle: null,
      minAngle: 180,
      side: 'unknown',
      repHistory: []
    });
    setErrorMessage(null);
  };

  const handlePoseUpdate = (poseResult) => {
    if (!poseResult || !poseResult.landmarks) {
      return;
    }

    const frameResult = squatCounterRef.current.processFrame(
      poseResult.landmarks,
      performance.now()
    );

    const metrics = squatCounterRef.current.getMetrics();

    setCounterState({
      state: frameResult.state,
      repetitionCount: frameResult.repetitionCount,
      currentAngle: frameResult.currentAngle,
      minAngle: frameResult.minAngle,
      side: frameResult.side,
      repHistory: metrics.repHistory,
      avgDepth: metrics.avgDepthDegrees,
      bestDepth: metrics.bestDepthDegrees
    });
  };

  const sessionSummary = buildMovementSessionSummary(
    squatCounterRef.current,
    videoMetadata ? videoMetadata.duration : 0
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1 className="brand-title">HiperMove</h1>
          <p className="brand-subtitle">
            AI Movement & Mobility Assistant — Squat Analysis MVP
          </p>
        </div>
        <div>
          <span className="badge-tag">Phase 5: Squat Counter Active</span>
        </div>
      </header>

      {errorMessage && (
        <StatusMessage
          type="error"
          message={errorMessage}
          onDismiss={() => setErrorMessage(null)}
        />
      )}

      <main className="dashboard-grid">
        <section className="left-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Phase 2: Video Selection / Upload */}
          <div className="card">
            <h2 className="card-title">1. Upload Video</h2>
            <p className="card-desc">
              Upload a short squat video or load the built-in demo clip (&le; 25MB, &le; 60s).
            </p>

            {!videoUrl ? (
              <VideoUploader
                onFileSelected={handleFileSelected}
                isValidating={isValidating}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '0.75rem',
                    fontSize: '0.85rem'
                  }}
                >
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>File Name</div>
                    <div style={{ fontWeight: 500, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={videoMetadata.name}>
                      {videoMetadata.name}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Duration</div>
                    <div style={{ fontWeight: 600, color: '#38bdf8' }}>{videoMetadata.durationFormatted}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Size</div>
                    <div style={{ fontWeight: 500, color: '#f8fafc' }}>{videoMetadata.sizeFormatted}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Resolution</div>
                    <div style={{ fontWeight: 500, color: '#f8fafc' }}>{videoMetadata.width} &times; {videoMetadata.height}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleResetVideo}
                    style={{
                      padding: '0.45rem 0.9rem',
                      backgroundColor: 'transparent',
                      border: '1px solid #475569',
                      color: '#cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                      cursor: 'pointer'
                    }}
                  >
                    &larr; Choose Different Video
                  </button>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 500 }}>
                    &#10003; Video loaded
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Phase 3 & 4: Synchronized Video Player & Pose Analysis */}
          <div className="card">
            <h2 className="card-title">2. Pose Estimation & Video Analysis</h2>
            <p className="card-desc">
              Synchronized skeletal overlay tracking body landmarks across continuous video frames.
            </p>

            {videoUrl ? (
              <PoseOverlay
                videoUrl={videoUrl}
                videoMetadata={videoMetadata}
                isModelReady={isModelReady}
                isModelLoading={isModelLoading}
                modelError={modelError}
                detectVideoFrame={detectVideoFrame}
                resetAnalysisSession={() => {
                  resetAnalysisSession();
                  squatCounterRef.current.reset();
                  setCounterState({
                    state: SQUAT_STATES.UNKNOWN,
                    repetitionCount: 0,
                    currentAngle: null,
                    minAngle: 180,
                    side: 'unknown',
                    repHistory: []
                  });
                }}
                analysisStats={analysisStats}
                onPoseUpdate={handlePoseUpdate}
                liveAngleInfo={{
                  angle: counterState.currentAngle,
                  side: counterState.side
                }}
              />
            ) : (
              <div className="placeholder-box">
                <p>Upload a video or click "Load Demo Squat Video" to begin synchronized pose analysis.</p>
              </div>
            )}
          </div>
        </section>

        <section className="right-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Phase 5: Deterministic Squat Repetition Counter & Metrics */}
          <div className="card">
            <h2 className="card-title">3. Repetition Count & Metrics</h2>
            <p className="card-desc">
              Deterministic finite state machine tracking completed squat cycles.
            </p>

            {/* Rep Counter & State Display */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repetitions</div>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1.1, marginTop: '0.35rem' }}>
                  {counterState.repetitionCount}
                </div>
              </div>

              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>FSM State</div>
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    marginTop: '0.75rem',
                    color:
                      counterState.state === SQUAT_STATES.BOTTOM
                        ? '#f59e0b'
                        : counterState.state === SQUAT_STATES.ASCENDING
                        ? '#38bdf8'
                        : counterState.state === SQUAT_STATES.DESCENDING
                        ? '#a855f7'
                        : counterState.state === SQUAT_STATES.STANDING
                        ? '#10b981'
                        : '#64748b'
                  }}
                >
                  {counterState.state}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Side: <strong style={{ color: '#e2e8f0' }}>{counterState.side}</strong>
                </div>
              </div>
            </div>

            {/* Live Knee Angle & Depth Gauges */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginBottom: '1rem'
              }}
            >
              <div style={{ background: '#0f172a', padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Live Knee Angle</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>
                  {counterState.currentAngle !== null ? `${counterState.currentAngle}°` : '—'}
                </div>
              </div>

              <div style={{ background: '#0f172a', padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Best Depth</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: counterState.bestDepth ? '#34d399' : '#f8fafc', marginTop: '0.2rem' }}>
                  {counterState.bestDepth ? `${counterState.bestDepth}°` : '—'}
                </div>
              </div>
            </div>

            {/* Rep History Table */}
            {counterState.repHistory && counterState.repHistory.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  Completed Repetitions Log
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid #334155', borderRadius: '6px', fontSize: '0.75rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={{ padding: '0.35rem 0.6rem' }}>#</th>
                        <th style={{ padding: '0.35rem 0.6rem' }}>Bottom Angle</th>
                        <th style={{ padding: '0.35rem 0.6rem' }}>Side</th>
                      </tr>
                    </thead>
                    <tbody>
                      {counterState.repHistory.map((rep) => (
                        <tr key={rep.repNumber} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '0.35rem 0.6rem', fontWeight: 600, color: '#38bdf8' }}>Rep {rep.repNumber}</td>
                          <td style={{ padding: '0.35rem 0.6rem', color: '#f8fafc' }}>{rep.minAngle}°</td>
                          <td style={{ padding: '0.35rem 0.6rem', color: '#94a3b8' }}>{rep.side}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Threshold & Coverage Summary */}
            <div style={{ fontSize: '0.75rem', color: '#64748b', background: 'rgba(15, 23, 42, 0.4)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px dashed #334155' }}>
              <div>• <strong>Thresholds:</strong> Standing &ge; 155&deg; &bull; Bottom &le; 100&deg; &bull; Ascent &gt; 115&deg;</div>
              <div style={{ marginTop: '0.2rem' }}>• Partial squats not reaching 100&deg; are excluded from the count.</div>
            </div>
          </div>

          {/* Phase 8: Gemma 4 AI Summary */}
          <div className="card">
            <h2 className="card-title">4. AI Session Summary</h2>
            <p className="card-desc">
              Plain-language explanation of measured metrics powered by Gemma 4.
            </p>
            <div className="placeholder-box">
              <p>AI session explanation will be connected in Phase 8 via backend endpoint.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Honest Limitations & Disclaimer */}
      <footer className="disclaimer-banner">
        <div>
          <strong>Disclaimer & Honest Limitations:</strong> Estimates depend on camera angle, lighting, visibility, and video quality. This prototype uses computer vision for demonstration purposes and is not a medical device or professional coaching tool.
        </div>
      </footer>
    </div>
  );
}
