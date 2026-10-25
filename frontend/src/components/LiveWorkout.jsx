
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { POSE_CONNECTIONS, POSE_LANDMARKS } from '../services/poseLandmarker.js';

function drawLivePose(ctx, landmarks, displayWidth, displayHeight, videoWidth, videoHeight, angleInfo) {
  if (!landmarks?.length || !videoWidth || !videoHeight) return;

  const videoAspect = videoWidth / videoHeight;
  const displayAspect = displayWidth / displayHeight;

  let renderWidth = displayWidth;
  let renderHeight = displayHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (displayAspect > videoAspect) {
    renderWidth = displayHeight * videoAspect;
    offsetX = (displayWidth - renderWidth) / 2;
  } else {
    renderHeight = displayWidth / videoAspect;
    offsetY = (displayHeight - renderHeight) / 2;
  }

  const x = (value) => offsetX + value * renderWidth;
  const y = (value) => offsetY + value * renderHeight;

  ctx.save();
  ctx.lineWidth = 3;

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

    ctx.strokeStyle =
      startIndex >= 23 && endIndex >= 23 ? '#16c79a' : '#62a0ff';

    ctx.beginPath();
    ctx.moveTo(x(start.x), y(start.y));
    ctx.lineTo(x(end.x), y(end.y));
    ctx.stroke();
  }

  for (let index = 0; index < landmarks.length; index++) {
    const landmark = landmarks[index];
    if (!landmark) continue;
    if (landmark.visibility !== undefined && landmark.visibility < 0.3) continue;

    const isLegJoint = [
      POSE_LANDMARKS.LEFT_HIP,
      POSE_LANDMARKS.RIGHT_HIP,
      POSE_LANDMARKS.LEFT_KNEE,
      POSE_LANDMARKS.RIGHT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE,
      POSE_LANDMARKS.RIGHT_ANKLE
    ].includes(index);

    ctx.beginPath();
    ctx.arc(x(landmark.x), y(landmark.y), isLegJoint ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = isLegJoint ? '#ffbd59' : '#8bc5ff';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (angleInfo?.angle != null && angleInfo.side !== 'unknown') {
    const kneeIndex =
      angleInfo.side === 'left'
        ? POSE_LANDMARKS.LEFT_KNEE
        : POSE_LANDMARKS.RIGHT_KNEE;

    const knee = landmarks[kneeIndex];

    if (knee) {
      const label = `${angleInfo.angle}°`;
      const labelX = x(knee.x) + 12;
      const labelY = y(knee.y) - 6;

      ctx.font = 'bold 13px -apple-system, sans-serif';
      const width = ctx.measureText(label).width;

      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.fillRect(labelX - 4, labelY - 14, width + 8, 20);
      ctx.strokeStyle = angleInfo.angle <= 100 ? '#e5a02c' : '#16a779';
      ctx.strokeRect(labelX - 4, labelY - 14, width + 8, 20);
      ctx.fillStyle = angleInfo.angle <= 100 ? '#9a6413' : '#087b5b';
      ctx.fillText(label, labelX, labelY);
    }
  }

  ctx.restore();
}

export default function LiveWorkout({
  isModelReady,
  isModelLoading,
  modelError,
  detectVideoFrame,
  resetAnalysisSession,
  analysisStats,
  onPoseUpdate,
  liveAngleInfo
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastSampleTimeRef = useRef(0);
  const processingRef = useRef(false);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [hasPersonInFrame, setHasPersonInFrame] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const syncCanvasSize = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const rect = video.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
    }
  }, []);

  useEffect(() => {
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);

    return () => window.removeEventListener('resize', syncCanvasSize);
  }, [syncCanvasSize]);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    processingRef.current = false;
    setIsCameraOn(false);
    setHasPersonInFrame(false);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const startCamera = async () => {
    setCameraError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Camera access is not available in this browser or context. Try opening the app on localhost or HTTPS.'
      );
      return;
    }

    try {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
        },
        audio: false
    });


      streamRef.current = stream;

      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      resetAnalysisSession();
      setIsCameraOn(true);
      syncCanvasSize();
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera permission was denied. Allow camera access in your browser settings, then try again.'
        );
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError('No camera was found. Connect a camera and try again.');
      } else {
        setCameraError(error.message || 'Unable to start the camera.');
      }
    }
  };

  useEffect(() => {
    if (!isCameraOn) return undefined;

    let cancelled = false;

    const frameLoop = () => {
      if (cancelled) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const now = performance.now();

      if (
        video &&
        canvas &&
        !video.paused &&
        video.readyState >= 2 &&
        isModelReady &&
        now - lastSampleTimeRef.current >= 66 &&
        !processingRef.current
      ) {
        lastSampleTimeRef.current = now;
        processingRef.current = true;

        detectVideoFrame(video, now)
          .then((result) => {
            if (!result || cancelled) return;

            setHasPersonInFrame(Boolean(result.hasPose));

            if (result.hasPose && result.landmarks) {
              onPoseUpdate?.(result);
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (isOverlayVisible && result.hasPose) {
              drawLivePose(
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
          .catch((error) => {
            console.warn('Live pose detection failed:', error);
          })
          .finally(() => {
            processingRef.current = false;
          });
      }

      animationFrameRef.current = requestAnimationFrame(frameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(frameLoop);

    return () => {
      cancelled = true;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [
    isCameraOn,
    isModelReady,
    detectVideoFrame,
    onPoseUpdate,
    isOverlayVisible,
    liveAngleInfo
  ]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <span
          style={{
            padding: '0.55rem 0.8rem',
            borderRadius: '999px',
            background: isModelReady
              ? 'rgba(224,248,239,0.85)'
              : 'rgba(255,245,220,0.9)',
            color: isModelReady ? '#087b5b' : '#9a6413',
            fontSize: '0.8rem',
            fontWeight: 650
          }}
        >
          {isModelReady
            ? '● Pose model ready'
            : isModelLoading
            ? '● Loading pose model…'
            : '● Pose model unavailable'}
        </span>

        <span
          style={{
            fontSize: '0.8rem',
            color: hasPersonInFrame ? '#087b5b' : '#728098'
          }}
        >
          {hasPersonInFrame ? '● Person detected' : '○ Searching for person'}
        </span>
      </div>

      {modelError && (
        <div
          role="alert"
          style={{
            padding: '0.85rem',
            borderRadius: '10px',
            background: '#fff0f2',
            color: '#a8324a',
            fontSize: '0.85rem'
          }}
        >
          Pose model error: {modelError}
        </div>
      )}

      {cameraError && (
        <div
          role="alert"
          style={{
            padding: '0.85rem',
            borderRadius: '10px',
            background: '#fff0f2',
            border: '1px solid rgba(220,82,103,0.2)',
            color: '#a8324a',
            fontSize: '0.85rem',
            lineHeight: 1.6
          }}
        >
          {cameraError}
        </div>
      )}

      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          aspectRatio: '16 / 9',
          maxHeight: '440px',
          background: '#111827',
          borderRadius: '18px',
          border: '1px solid rgba(120,140,180,0.28)',
          boxShadow: '0 12px 30px rgba(34,49,82,0.12)'
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onLoadedMetadata={syncCanvasSize}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block'
          }}
        />

        {!isCameraOn && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: '#e2e8f0',
              textAlign: 'center',
              padding: '1rem'
            }}
          >
            <span style={{ fontSize: '2.5rem' }}>📷</span>
            <strong>Live camera is off</strong>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Start your camera to begin real-time squat analysis.
            </span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        />

        {isCameraOn && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              padding: '0.4rem 0.65rem',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.9)',
              color: '#087b5b',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            ● LIVE
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.85rem',
          borderRadius: '14px',
          background: 'rgba(255,255,255,0.76)',
          border: '1px solid rgba(145,163,196,0.28)'
        }}
      >
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {!isCameraOn ? (
            <button
              type="button"
              onClick={startCamera}
              disabled={!isModelReady}
              style={{
                padding: '0.7rem 1rem',
                border: 'none',
                borderRadius: '10px',
                background: isModelReady ? '#5278f5' : '#b8c5e5',
                color: '#fff',
                fontWeight: 650,
                cursor: isModelReady ? 'pointer' : 'not-allowed'
              }}
            >
              Start Live Workout
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              style={{
                padding: '0.7rem 1rem',
                border: 'none',
                borderRadius: '10px',
                background: '#d94161',
                color: '#fff',
                fontWeight: 650,
                cursor: 'pointer'
              }}
            >
              Stop Camera
            </button>
          )}
        </div>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.82rem',
            color: '#52627c',
            cursor: 'pointer'
          }}
        >
          <input
            type="checkbox"
            checked={isOverlayVisible}
            onChange={(event) => setIsOverlayVisible(event.target.checked)}
            style={{ accentColor: '#5278f5' }}
          />
          Show skeleton
        </label>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.65rem',
          color: '#728098',
          fontSize: '0.76rem'
        }}
      >
        <span>Processing rate: {analysisStats.currentFps} FPS</span>
        <span>·</span>
        <span>Frames: {analysisStats.totalFrames}</span>
        <span>·</span>
        <span>Usable: {(analysisStats.usableRatio * 100).toFixed(0)}%</span>
      </div>

      <p style={{ margin: 0, color: '#728098', fontSize: '0.78rem', lineHeight: 1.6 }}>
        Tip: place your camera far enough away to keep your full body visible.
        Good lighting and a side or slightly angled view generally help tracking.
        Allow camera permission when your browser asks.
      </p>
    </div>
  );
}
