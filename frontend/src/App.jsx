import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} from 'react';

import VideoUploader from './components/VideoUploader.jsx';
import PoseOverlay from './components/PoseOverlay.jsx';
import LiveWorkout from './components/LiveWorkout.jsx';
import ResultsDashboard from './components/ResultsDashboard.jsx';
import AISummaryCard from './components/AISummaryCard.jsx';
import StatusMessage from './components/StatusMessage.jsx';

import { loadAndValidateVideoMetadata } from './utils/videoValidation.js';
import { usePoseDetection } from './hooks/usePoseDetection.js';
import { SquatCounter, SQUAT_STATES } from './utils/squatCounter.js';
import { buildMovementSessionSummary } from './utils/movementMetrics.js';

import VoiceAssistant from './components/VoiceAssistant';

const initialCounterState = () => ({
  state: SQUAT_STATES.UNKNOWN,
  repetitionCount: 0,
  currentAngle: null,
  minAngle: 180,
  side: 'unknown',
  repHistory: [],
  avgDepth: null,
  bestDepth: null
});

export default function App() {
  const [mode, setMode] = useState('choose');
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const {
    isModelLoading,
    isModelReady,
    modelError,
    detectVideoFrame,
    resetAnalysisSession,
    analysisStats
  } = usePoseDetection();

  const squatCounterRef = useRef(new SquatCounter());

  // Prevent the same completed repetition from being announced twice.
  const lastAnnouncedRepRef = useRef(0);

  const [counterState, setCounterState] = useState(initialCounterState);
  const [activeMetricsTab, setActiveMetricsTab] = useState('live');
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const resetSquatSession = useCallback(() => {
    resetAnalysisSession();
    squatCounterRef.current.reset();

    // Start announcements from zero for each new session.
    lastAnnouncedRepRef.current = 0;

    setCounterState(initialCounterState());
    setIsAnalysisComplete(false);
    setActiveMetricsTab('live');
  }, [resetAnalysisSession]);

  const handleFileSelected = async (file) => {
    if (!file) return;

    setErrorMessage(null);
    setIsValidating(true);
    resetSquatSession();

    try {
      const result = await loadAndValidateVideoMetadata(file);

      if (!result.isValid) {
        setErrorMessage(result.error || 'Video validation failed.');
        return;
      }

      setVideoMetadata(result.metadata);
      setVideoUrl(result.objectUrl);
      setMode('upload');
    } catch (error) {
      setErrorMessage(
        `Unexpected error during video validation: ${error.message}`
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleResetVideo = () => {
    setVideoMetadata(null);
    setVideoUrl(null);
    resetSquatSession();
    setErrorMessage(null);
    setMode('upload');
  };

  const handlePoseUpdate = useCallback((poseResult) => {
    if (!poseResult?.landmarks) return;

    const frameResult = squatCounterRef.current.processFrame(
      poseResult.landmarks,
      performance.now()
    );

    // Speak only when the counter confirms a newly completed squat.
    if (
      frameResult.isNewRep &&
      frameResult.repetitionCount > lastAnnouncedRepRef.current &&
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      lastAnnouncedRepRef.current = frameResult.repetitionCount;

      const announcement = new SpeechSynthesisUtterance(
        `Squat ${frameResult.repetitionCount}`
      );

      announcement.lang = 'en-IN';
      announcement.rate = 0.95;
      announcement.pitch = 1;
      announcement.volume = 1;

      window.speechSynthesis.speak(announcement);
    }

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
  }, []);

  const handleAnalysisFinished = () => {
    setIsAnalysisComplete(true);
    setActiveMetricsTab('summary');
  };

  const handleReplaySession = () => {
    resetSquatSession();
  };

  const liveAngleInfo = useMemo(
    () => ({
      angle: counterState.currentAngle,
      side: counterState.side
    }),
    [counterState.currentAngle, counterState.side]
  );

  const sessionSummary = buildMovementSessionSummary(
    squatCounterRef.current,
    videoMetadata ? videoMetadata.duration : 0
  );

  const changeMode = (nextMode) => {
    setErrorMessage(null);
    setMode(nextMode);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1 className="brand-title">HiperMove</h1>
          <p className="brand-subtitle">
            AI Movement & Mobility Assistant — Squat Analysis
          </p>
        </div>

        <span className="badge-tag">
          {isModelReady
            ? 'Pose Model Ready'
            : isModelLoading
              ? 'Loading Pose Model…'
              : 'Pose Model Status'}
        </span>
      </header>

      {errorMessage && (
        <StatusMessage
          type="error"
          message={errorMessage}
          onDismiss={() => setErrorMessage(null)}
        />
      )}

      {mode === 'choose' && (
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card-title">Choose your workout mode</h2>
          <p className="card-desc">
            Analyze a recorded squat video or use your camera for real-time
            movement tracking.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '1rem',
              marginTop: '1.25rem'
            }}
          >
            <button
              type="button"
              onClick={() => changeMode('upload')}
              style={modeCardStyle}
            >
              <span style={modeIconStyle}>🎬</span>
              <strong style={modeTitleStyle}>Upload Video</strong>
              <span style={modeDescriptionStyle}>
                Choose a saved squat video, review the playback, and analyze
                your repetitions.
              </span>
              <span style={modeButtonStyle}>Choose a video →</span>
            </button>

            <button
              type="button"
              onClick={() => changeMode('live')}
              style={modeCardStyle}
            >
              <span style={modeIconStyle}>📷</span>
              <strong style={modeTitleStyle}>Live Workout</strong>
              <span style={modeDescriptionStyle}>
                Use your webcam to track body landmarks and count squats in
                real time.
              </span>
              <span style={modeButtonStyle}>Open live camera →</span>
            </button>
          </div>
        </section>
      )}

      {mode !== 'choose' && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.65rem',
            marginBottom: '1.25rem'
          }}
        >
          <button
            type="button"
            onClick={() => changeMode('choose')}
            style={secondaryButtonStyle}
          >
            ← Change Mode
          </button>

          <button
            type="button"
            onClick={() => changeMode('upload')}
            aria-pressed={mode === 'upload'}
            style={modeTabStyle(mode === 'upload')}
          >
            🎬 Upload Video
          </button>

          <button
            type="button"
            onClick={() => changeMode('live')}
            aria-pressed={mode === 'live'}
            style={modeTabStyle(mode === 'live')}
          >
            📷 Live Workout
          </button>
        </div>
      )}

      {mode !== 'choose' && (
        <main className="dashboard-grid">
          <section
            className="left-panel"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              minWidth: 0
            }}
          >
            {mode === 'upload' && (
              <>
                <div className="card">
                  <h2 className="card-title">1. Upload a squat video</h2>
                  <p className="card-desc">
                    Select a recording to analyze. The built-in demo video
                    has been removed.
                  </p>

                  {!videoUrl ? (
                    <VideoUploader
                      onFileSelected={handleFileSelected}
                      isValidating={isValidating}
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}
                    >
                      <div style={metadataGridStyle}>
                        <MetadataItem
                          label="File Name"
                          value={videoMetadata.name}
                        />

                        <MetadataItem
                          label="Duration"
                          value={videoMetadata.durationFormatted}
                        />

                        <MetadataItem
                          label="Size"
                          value={videoMetadata.sizeFormatted}
                        />

                        <MetadataItem
                          label="Resolution"
                          value={`${videoMetadata.width} × ${videoMetadata.height}`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleResetVideo}
                        style={secondaryButtonStyle}
                      >
                        ← Choose Different Video
                      </button>
                    </div>
                  )}
                </div>

                <div className="card">
                  <h2 className="card-title">2. Pose estimation</h2>
                  <p className="card-desc">
                    Play the selected video to start skeletal tracking and
                    repetition analysis.
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
                      liveAngleInfo={liveAngleInfo}
                      onAnalysisFinished={handleAnalysisFinished}
                    />
                  ) : (
                    <div className="placeholder-box">
                      <p>
                        Select a video above to see the playback and pose
                        analysis here.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {mode === 'live' && (
              <div className="card">
                <h2 className="card-title">Live Workout Analysis</h2>
                <p className="card-desc">
                  Start the camera to track your movements. Camera video is
                  processed in the browser for this prototype.
                </p>

                <LiveWorkout
                  isModelReady={isModelReady}
                  isModelLoading={isModelLoading}
                  modelError={modelError}
                  detectVideoFrame={detectVideoFrame}
                  resetAnalysisSession={resetSquatSession}
                  analysisStats={analysisStats}
                  onPoseUpdate={handlePoseUpdate}
                  liveAngleInfo={liveAngleInfo}
                />
              </div>
            )}
          </section>

          <section
            className="right-panel"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              minWidth: 0
            }}
          >
            <div className="card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '0.75rem'
                }}
              >
                <h2 className="card-title" style={{ margin: 0 }}>
                  Movement Analysis & Results
                </h2>

                <div style={tabContainerStyle}>
                  <button
                    type="button"
                    onClick={() => setActiveMetricsTab('live')}
                    style={metricsTabStyle(activeMetricsTab === 'live')}
                  >
                    Live
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMetricsTab('summary')}
                    style={metricsTabStyle(activeMetricsTab === 'summary')}
                  >
                    Summary {isAnalysisComplete ? '✓' : ''}
                  </button>
                </div>
              </div>

              {activeMetricsTab === 'live' ? (
                <div>
                  <p className="card-desc">
                    Estimated squat repetitions and current knee-angle
                    measurements.
                  </p>

                  <div style={statsGridStyle}>
                    <div style={statCardStyle}>
                      <div style={statLabelStyle}>Repetitions</div>
                      <div style={repetitionNumberStyle}>
                        {counterState.repetitionCount}
                      </div>
                    </div>

                    <div style={statCardStyle}>
                      <div style={statLabelStyle}>Movement State</div>
                      <div style={stateValueStyle}>
                        {counterState.state}
                      </div>
                      <div style={statLabelStyle}>
                        Side: {counterState.side}
                      </div>
                    </div>

                    <div style={statCardStyle}>
                      <div style={statLabelStyle}>Knee Angle</div>
                      <div style={angleNumberStyle}>
                        {counterState.currentAngle != null
                          ? `${counterState.currentAngle}°`
                          : '—'}
                      </div>
                    </div>

                    <div style={statCardStyle}>
                      <div style={statLabelStyle}>Best Depth</div>
                      <div style={angleNumberStyle}>
                        {counterState.bestDepth
                          ? `${counterState.bestDepth}°`
                          : '—'}
                      </div>
                    </div>
                  </div>

                  <p style={hintStyle}>
                    Only completed repetitions should be counted. Measurements
                    are estimates and depend on camera position, lighting,
                    visibility, and tracking quality.
                  </p>
                </div>
              ) : (
                <ResultsDashboard
                  metrics={sessionSummary}
                  onReplay={handleReplaySession}
                  onReset={handleResetVideo}
                />
              )}
            </div>

            <div className="card">
              <h2 className="card-title">AI Session Summary</h2>
              <p className="card-desc">
                A plain-language explanation of the measured session metrics.
              </p>

              <AISummaryCard
                metrics={sessionSummary}
                isReady={Boolean(
                  counterState.repetitionCount > 0 ||
                  isAnalysisComplete ||
                  analysisStats.totalFrames > 10
                )}
              />
            </div>
          </section>
        </main>
      )}

      <footer className="disclaimer-banner">
        <div>
          <strong>Disclaimer & Honest Limitations:</strong> HiperMove is a
          computer-vision prototype. Movement estimates are not medical
          advice, injury prediction, or a substitute for professional coaching.
        </div>
      </footer>

      <VoiceAssistant
        metrics={counterState}
        sessionSummary={sessionSummary}
      />
    </div>
  );
}

function MetadataItem({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{label}</div>

      <div
        title={value}
        style={{
          color: '#1b2740',
          fontWeight: 600,
          overflowWrap: 'anywhere',
          marginTop: '0.2rem'
        }}
      >
        {value}
      </div>
    </div>
  );
}

const modeCardStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '0.8rem',
  width: '100%',
  minHeight: '245px',
  padding: '1.25rem',
  border: '1px solid rgba(145,163,196,0.32)',
  borderRadius: '16px',
  background: 'rgba(255,255,255,0.78)',
  boxShadow: '0 5px 18px rgba(58,83,138,0.05)',
  cursor: 'pointer',
  textAlign: 'left',
  color: '#1b2740'
};

const modeIconStyle = { fontSize: '2rem' };
const modeTitleStyle = { fontSize: '1.1rem' };

const modeDescriptionStyle = {
  fontSize: '0.86rem',
  color: '#64748b',
  lineHeight: 1.65
};

const modeButtonStyle = {
  marginTop: 'auto',
  color: '#4568dc',
  fontWeight: 700,
  fontSize: '0.85rem'
};

const secondaryButtonStyle = {
  padding: '0.6rem 0.85rem',
  border: '1px solid rgba(145,163,196,0.4)',
  borderRadius: '9px',
  background: 'rgba(255,255,255,0.78)',
  color: '#52627a',
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer'
};

const modeTabStyle = (active) => ({
  ...secondaryButtonStyle,
  background: active ? '#5278f5' : 'rgba(255,255,255,0.78)',
  borderColor: active ? '#5278f5' : 'rgba(145,163,196,0.4)',
  color: active ? '#fff' : '#52627a'
});

const metadataGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))',
  gap: '0.85rem',
  padding: '1rem',
  borderRadius: '12px',
  border: '1px solid rgba(145,163,196,0.28)',
  background: 'rgba(255,255,255,0.72)',
  fontSize: '0.85rem'
};

const tabContainerStyle = {
  display: 'flex',
  gap: '0.2rem',
  padding: '0.2rem',
  borderRadius: '8px',
  border: '1px solid rgba(145,163,196,0.28)',
  background: 'rgba(255,255,255,0.72)'
};

const metricsTabStyle = (active) => ({
  padding: '0.4rem 0.7rem',
  border: 'none',
  borderRadius: '6px',
  background: active ? '#5278f5' : 'transparent',
  color: active ? '#fff' : '#64748b',
  fontSize: '0.78rem',
  fontWeight: 650,
  cursor: 'pointer'
});

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0.75rem',
  marginBottom: '1rem'
};

const statCardStyle = {
  padding: '1rem',
  borderRadius: '13px',
  textAlign: 'center',
  background: 'rgba(255,255,255,0.76)',
  border: '1px solid rgba(145,163,196,0.28)',
  boxShadow: '0 4px 14px rgba(58,83,138,0.04)',
  overflowWrap: 'anywhere'
};

const statLabelStyle = {
  fontSize: '0.74rem',
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.035em'
};

const repetitionNumberStyle = {
  marginTop: '0.35rem',
  color: '#5278f5',
  fontSize: '2.7rem',
  lineHeight: 1.1,
  fontWeight: 800
};

const stateValueStyle = {
  marginTop: '0.65rem',
  marginBottom: '0.4rem',
  color: '#34445f',
  fontSize: '1rem',
  fontWeight: 750
};

const angleNumberStyle = {
  marginTop: '0.45rem',
  color: '#1b2740',
  fontSize: '1.55rem',
  fontWeight: 750
};

const hintStyle = {
  margin: 0,
  padding: '0.75rem',
  borderRadius: '9px',
  background: 'rgba(238,242,255,0.72)',
  border: '1px dashed rgba(145,163,196,0.5)',
  color: '#64748b',
  fontSize: '0.77rem',
  lineHeight: 1.6
};