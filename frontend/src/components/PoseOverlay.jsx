import React, { useRef, useEffect, useState, useCallback } from 'react';
import { POSE_CONNECTIONS, POSE_LANDMARKS } from '../services/poseLandmarker.js';

/**
 * Draws landmarks and skeletal connections with letterbox-aware projection
 */
function drawAlignedPose(ctx, landmarks, displayWidth, displayHeight, videoWidth, videoHeight) {
  if (!landmarks || landmarks.length === 0 || !videoWidth || !videoHeight) return;

  // Calculate letterboxing / object-fit: contain offsets
  const videoAspect = videoWidth / videoHeight;
  const displayAspect = displayWidth / displayHeight;

  let renderWidth = displayWidth;
  let renderHeight = displayHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (displayAspect > videoAspect) {
    // Letterbox on left/right
    renderHeight = displayHeight;
    renderWidth = displayHeight * videoAspect;
    offsetX = (displayWidth - renderWidth) / 2;
  } else {
    // Letterbox on top/bottom
    renderWidth = displayWidth;
    renderHeight = displayWidth / videoAspect;
    offsetY = (displayHeight - renderHeight) / 2;
  }

  const toScreenX = (normX) => offsetX + normX * renderWidth;
  const toScreenY = (normY) => offsetY + normY * renderHeight;

  ctx.save();
  ctx.lineWidth = 3;

  // 1. Draw connections
  for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];

    if (!start || !end) continue;
    if ((start.visibility !== undefined && start.visibility < 0.3) ||
        (end.visibility !== undefined && end.visibility < 0.3)) {
      continue;
    }

    const isLeg = (startIndex >= 23 && endIndex >= 23);
    ctx.strokeStyle = isLeg ? '#10b981' : '#38bdf8'; // Emerald for legs, sky blue for arms/torso

    ctx.beginPath();
    ctx.moveTo(toScreenX(start.x), toScreenY(start.y));
    ctx.lineTo(toScreenX(end.x), toScreenY(end.y));
    ctx.stroke();
  }

  // 2. Draw joints
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if (!lm) continue;
    if (lm.visibility !== undefined && lm.visibility < 0.3) continue;

    const x = toScreenX(lm.x);
    const y = toScreenY(lm.y);

    const isSquatJoint = (
      i === POSE_LANDMARKS.LEFT_HIP || i === POSE_LANDMARKS.RIGHT_HIP ||
      i === POSE_LANDMARKS.LEFT_KNEE || i === POSE_LANDMARKS.RIGHT_KNEE ||
      i === POSE_LANDMARKS.LEFT_ANKLE || i === POSE_LANDMARKS.RIGHT_ANKLE
    );

    ctx.beginPath();
    ctx.arc(x, y, isSquatJoint ? 6 : 4, 0, 2 * Math.PI);
    ctx.fillStyle = isSquatJoint ? '#f59e0b' : '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Continuous Video-Frame Pose Analysis Player with Aligned Overlay
 */
export default function PoseOverlay({
  videoUrl,
  videoMetadata,
  isModelReady,
  isModelLoading,
  modelError,
  detectVideoFrame,
  resetAnalysisSession,
  analysisStats,
  onPoseUpdate
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [currentPose, setCurrentPose] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [hasPersonInFrame, setHasPersonInFrame] = useState(false);

  const animationFrameIdRef = useRef(null);
  const lastSampleTimeRef = useRef(0);
  const SAMPLE_INTERVAL_MS = 66; // ~15 FPS target rate

  // Resize canvas when container or video resizes
  const syncCanvasSize = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const rect = video.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }, []);

  useEffect(() => {
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);
    return () => window.removeEventListener('resize', syncCanvasSize);
  }, [syncCanvasSize]);

  // Main frame sampling loop
  const frameLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.paused || video.ended) {
      return;
    }

    const now = performance.now();
    if (now - lastSampleTimeRef.current >= SAMPLE_INTERVAL_MS) {
      lastSampleTimeRef.current = now;

      if (isModelReady) {
        detectVideoFrame(video, now)
          .then((result) => {
            if (!result) return;

            setHasPersonInFrame(result.hasPose);
            setCurrentPose(result.landmarks);

            if (onPoseUpdate) {
              onPoseUpdate(result);
            }

            // Draw to canvas overlay
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (isOverlayVisible && result.hasPose) {
              drawAlignedPose(
                ctx,
                result.landmarks,
                canvas.width,
                canvas.height,
                video.videoWidth,
                video.videoHeight
              );
            }
          })
          .catch((err) => {
            console.warn('Frame detection error:', err);
          });
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(frameLoop);
  }, [isModelReady, detectVideoFrame, isOverlayVisible, onPoseUpdate]);

  const handlePlay = () => {
    if (!videoRef.current) return;
    videoRef.current.play();
    setIsPlaying(true);
    animationFrameIdRef.current = requestAnimationFrame(frameLoop);
  };

  const handlePause = () => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    resetAnalysisSession();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    handlePlay();
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Video event listeners
  const onVideoEnded = () => {
    setIsPlaying(false);
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Model Status Pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isModelReady ? '#10b981' : isModelLoading ? '#f59e0b' : '#f43f5e',
              display: 'inline-block'
            }}
          />
          <span style={{ color: '#cbd5e1' }}>
            {isModelReady
              ? 'MediaPipe Pose Landmarker Active (Real-Time Video Mode)'
              : isModelLoading
              ? 'Initializing Landmarker...'
              : 'Model Error'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
          <span style={{ color: hasPersonInFrame ? '#34d399' : '#94a3b8' }}>
            {hasPersonInFrame ? '● Tracking Person' : '○ Searching for Person'}
          </span>
        </div>
      </div>

      {modelError && (
        <div style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#fda4af', fontSize: '0.825rem' }}>
          <strong>Model Error:</strong> {modelError}
        </div>
      )}

      {/* Synchronized Video & Canvas Overlay Viewport */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          backgroundColor: '#000000',
          borderRadius: '10px',
          overflow: 'hidden',
          aspectRatio: videoMetadata ? `${videoMetadata.width} / ${videoMetadata.height}` : '16 / 9',
          maxHeight: '440px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #334155'
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          onLoadedMetadata={syncCanvasSize}
          onEnded={onVideoEnded}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10
          }}
        />

        {/* Floating Telemetry HUD */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(51, 65, 85, 0.7)',
            borderRadius: '6px',
            padding: '0.35rem 0.65rem',
            fontSize: '0.75rem',
            color: '#e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            zIndex: 20
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ color: '#94a3b8' }}>Rate:</span>
            <strong>{analysisStats.currentFps} FPS</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ color: '#94a3b8' }}>Usable Frames:</span>
            <strong style={{ color: analysisStats.usableRatio > 0.8 ? '#34d399' : '#fbbf24' }}>
              {(analysisStats.usableRatio * 100).toFixed(0)}%
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ color: '#94a3b8' }}>Frames:</span>
            <span>{analysisStats.totalFrames}</span>
          </div>
        </div>
      </div>

      {/* Playback & Overlay Control Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid #334155',
          borderRadius: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!isModelReady}
            style={{
              padding: '0.45rem 1rem',
              backgroundColor: isPlaying ? '#e11d48' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isModelReady ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            {isPlaying ? '⏸ Pause Analysis' : '▶ Start Analysis'}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            style={{
              padding: '0.45rem 0.75rem',
              backgroundColor: 'transparent',
              border: '1px solid #475569',
              color: '#cbd5e1',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            ↺ Replay
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Skeleton Overlay Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: '#cbd5e1', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isOverlayVisible}
              onChange={(e) => setIsOverlayVisible(e.target.checked)}
              style={{ accentColor: '#0284c7' }}
            />
            Show Pose Skeleton
          </label>

          {/* Speed Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', color: '#94a3b8' }}>
            <span>Speed:</span>
            {[0.5, 0.75, 1].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => handleSpeedChange(speed)}
                style={{
                  padding: '0.2rem 0.45rem',
                  borderRadius: '4px',
                  border: `1px solid ${playbackSpeed === speed ? '#38bdf8' : '#334155'}`,
                  backgroundColor: playbackSpeed === speed ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: playbackSpeed === speed ? '#38bdf8' : '#94a3b8',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
