import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getPoseLandmarker,
  detectPoseOnStaticImage,
  detectPoseForVideoFrame,
  resetVideoTimestamp,
  drawPoseOnCanvas
} from '../services/poseLandmarker.js';

/**
 * Custom hook to manage MediaPipe PoseLandmarker lifecycle and frame-by-frame analysis
 */
export function usePoseDetection() {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [modelError, setModelError] = useState(null);

  // Analysis session statistics
  const [analysisStats, setAnalysisStats] = useState({
    totalFrames: 0,
    framesWithPose: 0,
    usableRatio: 0,
    currentFps: 0
  });

  const lastProcessedTimeRef = useRef(0);
  const frameCounterRef = useRef({ total: 0, withPose: 0 });

  const initModel = useCallback(async () => {
    if (isModelReady || isModelLoading) return;
    setIsModelLoading(true);
    setModelError(null);

    try {
      await getPoseLandmarker('IMAGE');
      setIsModelReady(true);
    } catch (err) {
      console.error('Failed to initialize MediaPipe PoseLandmarker:', err);
      setModelError(err.message || 'Unable to load MediaPipe Pose Landmarker model.');
    } finally {
      setIsModelLoading(false);
    }
  }, [isModelReady, isModelLoading]);

  // Preload model on initial mount
  useEffect(() => {
    initModel();
  }, [initModel]);

  /**
   * Run pose detection on a single frame from an HTML video or image element
   */
  const detectStaticFrame = useCallback(
    async (sourceElement) => {
      if (!sourceElement) {
        throw new Error('No media element provided for detection.');
      }

      if (!isModelReady) {
        await initModel();
      }

      const width = sourceElement.videoWidth || sourceElement.naturalWidth || sourceElement.width;
      const height = sourceElement.videoHeight || sourceElement.naturalHeight || sourceElement.height;

      if (!width || !height) {
        throw new Error('Video/Image dimensions are not ready or are 0.');
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(sourceElement, 0, 0, width, height);

      const result = await detectPoseOnStaticImage(canvas);

      return {
        hasPose: result.hasPose,
        landmarks: result.landmarks,
        worldLandmarks: result.worldLandmarks,
        width,
        height,
        canvas
      };
    },
    [isModelReady, initModel]
  );

  /**
   * Process a continuous video frame during playback
   * @param {HTMLVideoElement} videoElement
   * @param {number} timestampInMs
   */
  const detectVideoFrame = useCallback(
    async (videoElement, timestampInMs) => {
      if (!videoElement || videoElement.paused || videoElement.ended) {
        return null;
      }

      const result = await detectPoseForVideoFrame(videoElement, timestampInMs);

      // Update counters
      frameCounterRef.current.total += 1;
      if (result.hasPose) {
        frameCounterRef.current.withPose += 1;
      }

      // Calculate stats periodically
      const now = performance.now();
      const elapsed = now - lastProcessedTimeRef.current;
      const currentFps = elapsed > 0 ? Math.round(1000 / elapsed) : 0;
      lastProcessedTimeRef.current = now;

      const total = frameCounterRef.current.total;
      const withPose = frameCounterRef.current.withPose;
      const usableRatio = total > 0 ? withPose / total : 0;

      setAnalysisStats({
        totalFrames: total,
        framesWithPose: withPose,
        usableRatio,
        currentFps
      });

      return result;
    },
    []
  );

  const resetAnalysisSession = useCallback(() => {
    resetVideoTimestamp();
    frameCounterRef.current = { total: 0, withPose: 0 };
    lastProcessedTimeRef.current = 0;
    setAnalysisStats({
      totalFrames: 0,
      framesWithPose: 0,
      usableRatio: 0,
      currentFps: 0
    });
  }, []);

  return {
    isModelLoading,
    isModelReady,
    modelError,
    retryInit: initModel,
    detectStaticFrame,
    detectVideoFrame,
    resetAnalysisSession,
    analysisStats,
    drawPose: drawPoseOnCanvas
  };
}
