import React, { useState, useEffect } from 'react';
import VideoUploader from './components/VideoUploader.jsx';
import VideoPreview from './components/VideoPreview.jsx';
import PoseOverlay from './components/PoseOverlay.jsx';
import StatusMessage from './components/StatusMessage.jsx';
import { loadAndValidateVideoMetadata } from './utils/videoValidation.js';
import { usePoseDetection } from './hooks/usePoseDetection.js';

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

  const [latestPoseResult, setLatestPoseResult] = useState(null);

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
    setLatestPoseResult(null);

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
    setLatestPoseResult(null);
    setErrorMessage(null);
  };

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
          <span className="badge-tag">Phase 4: Video-Frame Pose Analysis Active</span>
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
          {/* Phase 2: Video Upload / Selection */}
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
                resetAnalysisSession={resetAnalysisSession}
                analysisStats={analysisStats}
                onPoseUpdate={(result) => setLatestPoseResult(result)}
              />
            ) : (
              <div className="placeholder-box">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ margin: '0 auto', color: '#64748b' }}
                >
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                  <line x1="7" y1="2" x2="7" y2="22" />
                  <line x1="17" y1="2" x2="17" y2="22" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
                <p>Upload a video or click "Load Demo Squat Video" to begin synchronized pose analysis.</p>
              </div>
            )}
          </div>
        </section>

        <section className="right-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Phase 5 & 6: Repetition Counter & Deterministic Metrics */}
          <div className="card">
            <h2 className="card-title">3. Repetition Count & Metrics</h2>
            <p className="card-desc">
              Deterministic calculation of completed squat cycles based on knee angles.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repetitions</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.25rem' }}>0</div>
              </div>
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tracking State</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: analysisStats.framesWithPose > 0 ? '#34d399' : '#94a3b8', marginTop: '0.9rem' }}>
                  {analysisStats.framesWithPose > 0 ? 'ACTIVE POSE' : videoUrl ? 'READY' : 'IDLE'}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#94a3b8', background: '#0f172a', padding: '0.85rem', borderRadius: '6px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span>Analyzed Frames:</span>
                <strong>{analysisStats.totalFrames}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span>Frames with Valid Pose:</span>
                <strong style={{ color: '#34d399' }}>{analysisStats.framesWithPose}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Usable Landmark Coverage:</span>
                <strong style={{ color: analysisStats.usableRatio > 0.8 ? '#34d399' : '#fbbf24' }}>
                  {(analysisStats.usableRatio * 100).toFixed(0)}%
                </strong>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', marginTop: '0.75rem' }}>
              Phase 5 deterministic squat counting algorithm will hook directly into these landmark frames.
            </p>
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
