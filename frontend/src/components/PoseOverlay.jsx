import React, { useRef, useEffect, useState, useCallback } from 'react';
import { POSE_CONNECTIONS, POSE_LANDMARKS } from '../services/poseLandmarker.js';

/**
 * Draws landmarks and skeletal connections with letterbox-aware projection
 * and a live angle HUD.
 */
function drawAlignedPose(ctx, landmarks, displayWidth, displayHeight, videoWidth, videoHeight, liveAngleInfo) {
  if (!landmarks || landmarks.length === 0 || !videoWidth || !videoHeight) return;

  const videoAspect = videoWidth / videoHeight;
  const displayAspect = displayWidth / displayHeight;

  let renderWidth = displayWidth;
  let renderHeight = displayHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (displayAspect > videoAspect) {
    renderHeight = displayHeight;
    renderWidth = displayHeight * videoAspect;
    offsetX = (displayWidth - renderWidth) / 2;
  } else {
    renderWidth = displayWidth;
    renderHeight = displayWidth / videoAspect;
    offsetY = (displayHeight - renderHeight) / 2;
  }

  const toScreenX = (normX) => offsetX + normX * renderWidth;
  const toScreenY = (normY) => offsetY + normY * renderHeight;

  ctx.save();
  ctx.lineWidth = 3;

  // Draw skeletal connections.
  for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];

    if (!start || !end) continue;

    if (
      (start.visibility !== undefined && start.visibility < 0.3) ||
      (end.visibility !== undefined && end.visibility < 0.3)
    ) {
      continue;
    }

    const isLeg = startIndex >= 23 && endIndex >= 23;
    ctx.strokeStyle = isLeg ? '#16c79a' : '#62a0ff';

    ctx.beginPath();
    ctx.moveTo(toScreenX(start.x), toScreenY(start.y));
    ctx.lineTo(toScreenX(end.x), toScreenY(end.y));
    ctx.stroke();
  }

  // Draw body joints.
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if (!lm) continue;
    if (lm.visibility !== undefined && lm.visibility < 0.3) continue;

    const x = toScreenX(lm.x);
    const y = toScreenY(lm.y);

    const isSquatJoint =
      i === POSE_LANDMARKS.LEFT_HIP ||
      i === POSE_LANDMARKS.RIGHT_HIP ||
      i === POSE_LANDMARKS.LEFT_KNEE ||
      i === POSE_LANDMARKS.RIGHT_KNEE ||
      i === POSE_LANDMARKS.LEFT_ANKLE ||
      i === POSE_LANDMARKS.RIGHT_ANKLE;

    ctx.beginPath();
    ctx.arc(x, y, isSquatJoint ? 6 : 4, 0, 2 * Math.PI);
    ctx.fillStyle = isSquatJoint ? '#ffbd59' : '#8bc5ff';
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Display the live knee angle near the selected knee.
  if (liveAngleInfo && liveAngleInfo.angle !== null && liveAngleInfo.side !== 'unknown') {
    const kneeIndex =
      liveAngleInfo.side === 'left'
        ? POSE_LANDMARKS.LEFT_KNEE
        : POSE_LANDMARKS.RIGHT_KNEE;

    const knee = landmarks[kneeIndex];

    if (knee) {
      const kx = toScreenX(knee.x) + 12;
      const ky = toScreenY(knee.y) - 6;
      const angleText = `${liveAngleInfo.angle}°`;

      ctx.font = 'bold 13px -apple-system, sans-serif';
      const textWidth = ctx.measureText(angleText).width;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.fillRect(kx - 4, ky - 14, textWidth + 8, 20);

      ctx.strokeStyle = liveAngleInfo.angle <= 100 ? '#e5a02c' : '#16a779';
      ctx.lineWidth = 1;
      ctx.strokeRect(kx - 4, ky - 14, textWidth + 8, 20);

      ctx.fillStyle = liveAngleInfo.angle <= 100 ? '#9a6413' : '#087b5b';
      ctx.fillText(angleText, kx, ky);
    }
  }

  ctx.restore();
}

/**
 * Continuous Video-Frame Pose Analysis Player with Aligned Overlay.
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
  onPoseUpdate,
  liveAngleInfo,
  onAnalysisFinished
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
  const SAMPLE_INTERVAL_MS = 66;

  // Keep the canvas aligned with the video element.
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

  // Main frame-sampling loop.
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

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (isOverlayVisible && result.hasPose) {
              drawAlignedPose(
                ctx,
                result.landmarks,
                canvas.width,
                canvas.height,
                video.videoWidth,
                video.videoHeight,
                liveAngleInfo
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

  // Video event listeners.
  const onVideoEnded = () => {
    setIsPlaying(false);

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    if (onAnalysisFinished) {
      onAnalysisFinished();
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  const statusColor = isModelReady
    ? '#159a73'
    : isModelLoading
    ? '#d49424'
    : '#dc5267';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        minWidth: 0
      }}
    >
      {/* Model status and tracking indicators */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.78)',
            border: '1px solid rgba(145, 163, 196, 0.24)',
            boxShadow: '0 3px 12px rgba(58, 83, 138, 0.045)',
            fontSize: '0.8rem',
            color: '#34445f'
          }}
        >
          <span
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              boxShadow: `0 0 0 3px ${isModelReady ? 'rgba(21, 154, 115, 0.12)' : 'rgba(148, 163, 184, 0.12)'}`,
              flexShrink: 0
            }}
          />

          <span>
            {isModelReady
              ? 'Pose Landmarker Active'
              : isModelLoading
              ? 'Initializing Landmarker...'
              : 'Model Error'}
          </span>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 0.8rem',
            borderRadius: '999px',
            background: hasPersonInFrame
              ? 'rgba(224, 248, 239, 0.85)'
              : 'rgba(255, 255, 255, 0.75)',
            border: `1px solid ${
              hasPersonInFrame
                ? 'rgba(21, 154, 115, 0.2)'
                : 'rgba(145, 163, 196, 0.24)'
            }`,
            color: hasPersonInFrame ? '#087b5b' : '#728098',
            fontSize: '0.78rem',
            fontWeight: 600
          }}
        >
          <span>{hasPersonInFrame ? '●' : '○'}</span>
          {hasPersonInFrame ? 'Tracking person' : 'Searching for person'}
        </div>
      </div>

      {/* Model error */}
      {modelError && (
        <div
          role="alert"
          style={{
            padding: '0.9rem 1rem',
            borderRadius: '13px',
            background: 'rgba(255, 239, 242, 0.9)',
            border: '1px solid rgba(220, 82, 103, 0.22)',
            color: '#a8324a',
            fontSize: '0.85rem',
            lineHeight: 1.6
          }}
        >
          <strong>Model error:</strong> {modelError}
        </div>
      )}

      {/* Synchronized video and canvas viewport */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          backgroundColor: '#111827',
          borderRadius: '18px',
          overflow: 'hidden',
          aspectRatio: videoMetadata
            ? `${videoMetadata.width} / ${videoMetadata.height}`
            : '16 / 9',
          maxHeight: '440px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(120, 140, 180, 0.28)',
          boxShadow: '0 12px 30px rgba(34, 49, 82, 0.12)'
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

        {/* Floating glass telemetry panel */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255, 255, 255, 0.88)',
            WebkitBackdropFilter: 'blur(14px)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            borderRadius: '12px',
            padding: '0.65rem 0.8rem',
            fontSize: '0.72rem',
            color: '#273651',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            minWidth: '132px',
            zIndex: 20,
            boxShadow: '0 6px 22px rgba(15, 23, 42, 0.12)'
          }}
        >
          <div
            style={{
              fontSize: '0.65rem',
              fontWeight: 750,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#71809a',
              marginBottom: '0.1rem'
            }}
          >
            Analysis telemetry
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ color: '#71809a' }}>Rate</span>
            <strong>{analysisStats.currentFps} FPS</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ color: '#71809a' }}>Usable frames</span>
            <strong style={{ color: analysisStats.usableRatio > 0.8 ? '#087b5b' : '#a66b12' }}>
              {(analysisStats.usableRatio * 100).toFixed(0)}%
            </strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ color: '#71809a' }}>Frames</span>
            <strong>{analysisStats.totalFrames}</strong>
          </div>
        </div>

        {/* Overlay visibility indicator */}
        {!isOverlayVisible && (
          <div
            style={{
              position: 'absolute',
              left: '12px',
              top: '12px',
              padding: '0.4rem 0.65rem',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.88)',
              color: '#34445f',
              fontSize: '0.7rem',
              fontWeight: 600,
              zIndex: 20
            }}
          >
            Skeleton hidden
          </div>
        )}
      </div>

      {/* Playback and overlay control bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.85rem',
          padding: '0.85rem',
          background: 'rgba(255, 255, 255, 0.76)',
          WebkitBackdropFilter: 'blur(16px)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          borderRadius: '16px',
          boxShadow: '0 5px 18px rgba(58, 83, 138, 0.055)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!isModelReady}
            style={{
              padding: '0.65rem 0.95rem',
              background: !isModelReady
                ? '#b8c5e5'
                : isPlaying
                ? 'linear-gradient(135deg, #e15b72, #d94161)'
                : 'linear-gradient(135deg, #5278f5, #6d70ed)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.45)',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 650,
              cursor: isModelReady ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: isModelReady
                ? '0 5px 13px rgba(82, 120, 245, 0.18)'
                : 'none',
              transition: 'box-shadow 0.2s ease, transform 0.2s ease'
            }}
          >
            {isPlaying ? 'Ⅱ Pause analysis' : '▶ Start analysis'}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            style={{
              padding: '0.62rem 0.8rem',
              background: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid rgba(145, 163, 196, 0.35)',
              color: '#4b5d79',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
          >
            ↺ Replay
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.9rem',
            flexWrap: 'wrap'
          }}
        >
          {/* Skeleton overlay toggle */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.8rem',
              color: '#52627c',
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={isOverlayVisible}
              onChange={(e) => setIsOverlayVisible(e.target.checked)}
              style={{
                accentColor: '#5278f5',
                width: '15px',
                height: '15px',
                cursor: 'pointer'
              }}
            />
            Show skeleton
          </label>

          {/* Playback speed selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.78rem',
              color: '#728098'
            }}
          >
            <span style={{ marginRight: '0.15rem' }}>Speed</span>

            {[0.5, 0.75, 1].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => handleSpeedChange(speed)}
                aria-pressed={playbackSpeed === speed}
                style={{
                  padding: '0.35rem 0.48rem',
                  borderRadius: '7px',
                  border: `1px solid ${
                    playbackSpeed === speed
                      ? 'rgba(82, 120, 245, 0.35)'
                      : 'rgba(145, 163, 196, 0.25)'
                  }`,
                  background:
                    playbackSpeed === speed
                      ? 'rgba(82, 120, 245, 0.1)'
                      : 'rgba(255, 255, 255, 0.75)',
                  color: playbackSpeed === speed ? '#4568dc' : '#728098',
                  fontSize: '0.74rem',
                  fontWeight: playbackSpeed === speed ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease, border-color 0.2s ease'
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