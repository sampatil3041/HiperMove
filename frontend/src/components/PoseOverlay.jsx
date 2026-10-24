import React, { useRef, useEffect } from 'react';
import { drawPoseOnCanvas, POSE_LANDMARKS } from '../services/poseLandmarker.js';

/**
 * Visualizes detected landmarks and skeleton over an extracted static frame or live view
 * @param {{
 *   detectionResult: {
 *     hasPose: boolean,
 *     landmarks: Array|null,
 *     canvas: HTMLCanvasElement|null,
 *     width: number,
 *     height: number
 *   } | null,
 *   isModelLoading: boolean,
 *   isModelReady: boolean,
 *   modelError: string | null,
 *   onRunStaticDetection: () => void,
 *   isDetecting: boolean,
 *   onClearStaticTest: () => void
 * }} props
 */
export default function PoseOverlay({
  detectionResult,
  isModelLoading,
  isModelReady,
  modelError,
  onRunStaticDetection,
  isDetecting,
  onClearStaticTest
}) {
  const displayCanvasRef = useRef(null);

  useEffect(() => {
    if (!detectionResult || !displayCanvasRef.current) return;

    const displayCanvas = displayCanvasRef.current;
    const ctx = displayCanvas.getContext('2d');
    const { width, height, canvas: sourceCanvas, landmarks } = detectionResult;

    displayCanvas.width = width;
    displayCanvas.height = height;

    // 1. Draw background captured video frame
    if (sourceCanvas) {
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Overlay skeleton and landmarks if pose detected
    if (landmarks && landmarks.length > 0) {
      drawPoseOnCanvas(ctx, landmarks, width, height);
    }
  }, [detectionResult]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Model State Pill */}
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
              ? 'MediaPipe Pose Landmarker Ready (pose_landmarker_lite)'
              : isModelLoading
              ? 'Loading MediaPipe Pose Landmarker model...'
              : 'Model Initialization Error'}
          </span>
        </div>

        {/* Action Button */}
        <div>
          {detectionResult ? (
            <button
              type="button"
              onClick={onClearStaticTest}
              style={{
                padding: '0.4rem 0.85rem',
                backgroundColor: 'transparent',
                border: '1px solid #475569',
                color: '#cbd5e1',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Reset Test
            </button>
          ) : (
            <button
              type="button"
              onClick={onRunStaticDetection}
              disabled={!isModelReady || isDetecting}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isModelReady && !isDetecting ? '#0284c7' : '#334155',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: isModelReady && !isDetecting ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {isDetecting ? 'Analyzing Frame...' : 'Test Pose on Current Frame'}
            </button>
          )}
        </div>
      </div>

      {modelError && (
        <div style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#fda4af', fontSize: '0.825rem' }}>
          <strong>Model Error:</strong> {modelError}
        </div>
      )}

      {/* Frame Visualizer Canvas */}
      {detectionResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            style={{
              position: 'relative',
              backgroundColor: '#000000',
              borderRadius: '10px',
              overflow: 'hidden',
              maxHeight: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #334155'
            }}
          >
            <canvas
              ref={displayCanvasRef}
              style={{
                width: '100%',
                maxHeight: '400px',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* Results Badge & Joint Inspection */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: detectionResult.hasPose ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${detectionResult.hasPose ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: detectionResult.hasPose ? '#34d399' : '#fbbf24'
                }}
              >
                {detectionResult.hasPose
                  ? `✓ Pose Detected (${detectionResult.landmarks.length} Landmarks)`
                  : '⚠ No Person / Pose Detected in this frame'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Frame: {detectionResult.width} &times; {detectionResult.height}
              </span>
            </div>

            {detectionResult.hasPose && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  marginTop: '0.25rem'
                }}
              >
                <div>
                  Left Knee:{' '}
                  <strong style={{ color: '#f8fafc' }}>
                    {detectionResult.landmarks[POSE_LANDMARKS.LEFT_KNEE]
                      ? `(${detectionResult.landmarks[POSE_LANDMARKS.LEFT_KNEE].x.toFixed(2)}, ${detectionResult.landmarks[POSE_LANDMARKS.LEFT_KNEE].y.toFixed(2)})`
                      : 'N/A'}
                  </strong>
                </div>
                <div>
                  Right Knee:{' '}
                  <strong style={{ color: '#f8fafc' }}>
                    {detectionResult.landmarks[POSE_LANDMARKS.RIGHT_KNEE]
                      ? `(${detectionResult.landmarks[POSE_LANDMARKS.RIGHT_KNEE].x.toFixed(2)}, ${detectionResult.landmarks[POSE_LANDMARKS.RIGHT_KNEE].y.toFixed(2)})`
                      : 'N/A'}
                  </strong>
                </div>
                <div>
                  Left Hip:{' '}
                  <strong style={{ color: '#f8fafc' }}>
                    {detectionResult.landmarks[POSE_LANDMARKS.LEFT_HIP]
                      ? `(${detectionResult.landmarks[POSE_LANDMARKS.LEFT_HIP].x.toFixed(2)}, ${detectionResult.landmarks[POSE_LANDMARKS.LEFT_HIP].y.toFixed(2)})`
                      : 'N/A'}
                  </strong>
                </div>
                <div>
                  Right Hip:{' '}
                  <strong style={{ color: '#f8fafc' }}>
                    {detectionResult.landmarks[POSE_LANDMARKS.RIGHT_HIP]
                      ? `(${detectionResult.landmarks[POSE_LANDMARKS.RIGHT_HIP].x.toFixed(2)}, ${detectionResult.landmarks[POSE_LANDMARKS.RIGHT_HIP].y.toFixed(2)})`
                      : 'N/A'}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="placeholder-box">
          <p>
            {isModelReady
              ? 'Click "Test Pose on Current Frame" to extract a still frame and verify MediaPipe landmark estimation.'
              : 'Loading MediaPipe WASM and pose landmark model...'}
          </p>
        </div>
      )}
    </div>
  );
}
