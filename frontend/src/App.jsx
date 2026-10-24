import React, { useState, useEffect, useRef } from 'react';
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

  // Video element reference for frame extraction
  const [videoElement, setVideoElement] = useState(null);

  // Phase 3: MediaPipe hook and static detection state
  const { isModelLoading, isModelReady, modelError, detectStaticFrame } = usePoseDetection();
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);

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
    setDetectionResult(null);

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
    setVideoElement(null);
    setDetectionResult(null);
    setErrorMessage(null);
  };

  const handleRunStaticDetection = async () => {
    if (!videoElement) {
      setErrorMessage('Video is not ready yet. Please ensure the video has loaded in the preview.');
      return;
    }

    setIsDetecting(true);
    setErrorMessage(null);

    try {
      const result = await detectStaticFrame(videoElement);
      setDetectionResult(result);
    } catch (err) {
      console.error('Pose detection error:', err);
      setErrorMessage(`Pose detection error: ${err.message}`);
    } finally {
      setIsDetecting(false);
    }
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
          <span className="badge-tag">Phase 3: MediaPipe Pose Landmarker Active</span>
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
          {/* Phase 2: Video Upload & Preview Component */}
          <div className="card">
            <h2 className="card-title">1. Upload Video</h2>
            <p className="card-desc">
              Upload a short squat video (MP4/WebM, &le; 25MB, &le; 60 seconds).
            </p>

            {!videoUrl ? (
              <VideoUploader
                onFileSelected={handleFileSelected}
                isValidating={isValidating}
              />
            ) : (
              <VideoPreview
                videoUrl={videoUrl}
                metadata={videoMetadata}
                onReplaceVideo={handleResetVideo}
                onVideoElementReady={(el) => setVideoElement(el)}
              />
            )}
          </div>

          {/* Phase 3 & 4: Pose Detection & Video Canvas View */}
          <div className="card">
            <h2 className="card-title">2. Pose Estimation & Video Analysis</h2>
            <p className="card-desc">
              MediaPipe Pose Landmarker estimates 33 body landmarks on sampled frames.
            </p>

            {videoUrl ? (
              <PoseOverlay
                detectionResult={detectionResult}
                isModelLoading={isModelLoading}
                isModelReady={isModelReady}
                modelError={modelError}
                onRunStaticDetection={handleRunStaticDetection}
                isDetecting={isDetecting}
                onClearStaticTest={() => setDetectionResult(null)}
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
                <p>Upload a video above to run MediaPipe landmark estimation on a frame.</p>
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
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>State</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#94a3b8', marginTop: '0.75rem' }}>
                  {detectionResult?.hasPose ? 'LANDMARKS READY' : videoUrl ? 'READY' : 'IDLE'}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
              Finite state machine counter will be integrated in Phase 5.
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
