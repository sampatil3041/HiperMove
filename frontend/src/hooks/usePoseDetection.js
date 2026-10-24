import { useState, useEffect, useCallback } from 'react';
import { getPoseLandmarker, detectPoseOnStaticImage } from '../services/poseLandmarker.js';

/**
 * Custom hook to manage MediaPipe PoseLandmarker lifecycle and static frame analysis
 */
export function usePoseDetection() {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [modelError, setModelError] = useState(null);

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
   * @param {HTMLVideoElement | HTMLImageElement} sourceElement
   * @returns {Promise<{ hasPose: boolean, landmarks: Array|null, canvas: HTMLCanvasElement|null }>}
   */
  const detectStaticFrame = useCallback(
    async (sourceElement) => {
      if (!sourceElement) {
        throw new Error('No media element provided for detection.');
      }

      // Ensure model is ready
      if (!isModelReady) {
        await initModel();
      }

      // Extract frame into a temporary canvas
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

      // Perform pose estimation
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

  return {
    isModelLoading,
    isModelReady,
    modelError,
    retryInit: initModel,
    detectStaticFrame
  };
}
