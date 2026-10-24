import React, { useState, useEffect, useRef } from 'react';
import VideoUploader from './components/VideoUploader.jsx';
import PoseOverlay from './components/PoseOverlay.jsx';
import ResultsDashboard from './components/ResultsDashboard.jsx';
import AISummaryCard from './components/AISummaryCard.jsx';
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

  // Phase 4 & 5: MediaPipe Hook & Squat Counter
  const {
    isModelLoading,
    isModelReady,
    modelError,
    detectVideoFrame,
    resetAnalysisSession,
    analysisStats
  } = usePoseDetection();

  const squatCounterRef = useRef(new SquatCounter());
  const [counterState, setCounterState] = useState({
    state: SQUAT_STATES.UNKNOWN,
    repetitionCount: 0,
    currentAngle: null,
    minAngle: 180,
    side: 'unknown',
    repHistory: []
  });

  // Phase 6: Results dashboard and view tabs
  const [activeMetricsTab, setActiveMetricsTab] = useState('live'); // 'live' | 'summary'
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

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
    setIsAnalysisComplete(false);
    setActiveMetricsTab('live');
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
    setIsAnalysisComplete(false);
    setActiveMetricsTab('live');
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

  const handleAnalysisFinished = () => {
    setIsAnalysisComplete(true);
    setActiveMetricsTab('summary');
  };

  const handleReplaySession = () => {
    resetAnalysisSession();
    squatCounterRef.current.reset();
    setIsAnalysisComplete(false);
    setActiveMetricsTab('live');
    setCounterState({
      state: SQUAT_STATES.UNKNOWN,
      repetitionCount: 0,
      currentAngle: null,
      minAngle: 180,
      side: 'unknown',
      repHistory: []
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
          <span className="badge-tag">Phase 6: Results Dashboard Ready</span>
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
          {/* Section 1: Video Selection */}
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

          {/* Section 2: Synchronized Video Player & Pose Analysis */}
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
                resetAnalysisSession={handleReplaySession}
                analysisStats={analysisStats}
                onPoseUpdate={handlePoseUpdate}
                liveAngleInfo={{
                  angle: counterState.currentAngle,
                  side: counterState.side
                }}
                onAnalysisFinished={handleAnalysisFinished}
              />
            ) : (
              <div className="placeholder-box">
                <p>Upload a video or click "Load Demo Squat Video" to begin synchronized pose analysis.</p>
              </div>
            )}
          </div>
        </section>

        <section className="right-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Section 3: Repetition Count & Results Dashboard */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h2 className="card-title" style={{ margin: 0 }}>3. Movement Analysis & Results</h2>
              </div>

              {/* View Switcher Tabs */}
              <div style={{ display: 'flex', background: '#0f172a', borderRadius: '6px', padding: '0.2rem', border: '1px solid #334155' }}>
                <button
                  type="button"
                  onClick={() => setActiveMetricsTab('live')}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: activeMetricsTab === 'live' ? '#0284c7' : 'transparent',
                    color: activeMetricsTab === 'live' ? '#ffffff' : '#94a3b8'
                  }}
                >
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMetricsTab('summary')}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: activeMetricsTab === 'summary' ? '#0284c7' : 'transparent',
                    color: activeMetricsTab === 'summary' ? '#ffffff' : '#94a3b8'
                  }}
                >
                  Summary {isAnalysisComplete && '✓'}
                </button>
              </div>
            </div>

            {/* TAB 1: Live Telemetry & Counter */}
            {activeMetricsTab === 'live' ? (
              <div>
                <p className="card-desc">
                  Real-time repetition counter and joint angle telemetry during video playback.
                </p>

                {/* Counter & FSM State */}
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

                {/* Angle Gauges */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#0f172a', padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Live Knee Angle</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>
                      {counterState.currentAngle !== null ? `${counterState.currentAngle}°` : '—'}
                    </div>
                  </div>

                  <div style={{ background: '#0f172a', padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Lowest Depth</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: counterState.bestDepth ? '#34d399' : '#f8fafc', marginTop: '0.2rem' }}>
                      {counterState.bestDepth ? `${counterState.bestDepth}°` : '—'}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748b', background: 'rgba(15, 23, 42, 0.4)', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px dashed #334155' }}>
                  <div>• <strong>Thresholds:</strong> Standing &ge; 155&deg; &bull; Bottom &le; 100&deg; &bull; Ascent &gt; 115&deg;</div>
                  <div style={{ marginTop: '0.2rem' }}>• Once video finishes, the Summary report will open automatically.</div>
                </div>
              </div>
            ) : (
              /* TAB 2: Results Dashboard Summary */
              <ResultsDashboard
                metrics={sessionSummary}
                onReplay={handleReplaySession}
                onReset={handleResetVideo}
              />
            )}
          </div>

          {/* Section 4: Gemma 4 AI Summary */}
          <div className="card">
            <h2 className="card-title">4. AI Session Summary</h2>
            <p className="card-desc">
              Plain-language explanation of measured metrics powered by Gemma 4.
            </p>
            <AISummaryCard
              metrics={sessionSummary}
              isReady={Boolean(videoUrl && (counterState.repetitionCount > 0 || isAnalysisComplete || analysisStats.totalFrames > 10))}
            />
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
