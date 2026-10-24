import { FilesetResolver, PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';

let poseLandmarkerInstance = null;
let initPromise = null;

export const POSE_MODEL_CONFIG = {
  localModelPath: '/models/pose_landmarker_lite.task',
  remoteModelPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  localWasmPath: '/wasm',
  remoteWasmPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm'
};

/**
 * Standard MediaPipe Pose Landmark key index constants
 */
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
};

/**
 * Skeletal connection pairs for rendering pose overlay
 */
export const POSE_CONNECTIONS = [
  // Torso
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
  // Arms
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  // Legs (critical for squats)
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_HEEL],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_FOOT_INDEX],
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_HEEL],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_FOOT_INDEX]
];

let currentRunningMode = 'IMAGE';

/**
 * Initializes and caches the singleton PoseLandmarker instance.
 * @param {'IMAGE' | 'VIDEO'} runningMode - default 'IMAGE'
 * @returns {Promise<PoseLandmarker>}
 */
export async function getPoseLandmarker(runningMode = 'IMAGE') {
  if (poseLandmarkerInstance) {
    if (currentRunningMode !== runningMode) {
      await poseLandmarkerInstance.setOptions({ runningMode });
      currentRunningMode = runningMode;
    }
    return poseLandmarkerInstance;
  }

  if (initPromise) {
    const instance = await initPromise;
    if (currentRunningMode !== runningMode) {
      await instance.setOptions({ runningMode });
      currentRunningMode = runningMode;
    }
    return instance;
  }

  initPromise = (async () => {
    let vision = null;

    // 1. Resolve WASM assets (try local first, fallback to CDN)
    try {
      vision = await FilesetResolver.forVisionTasks(POSE_MODEL_CONFIG.localWasmPath);
    } catch (localWasmErr) {
      console.warn('Local WASM fileset failed to load, falling back to CDN:', localWasmErr);
      vision = await FilesetResolver.forVisionTasks(POSE_MODEL_CONFIG.remoteWasmPath);
    }

    // 2. Load PoseLandmarker model (try local first, fallback to CDN)
    let modelAssetPath = POSE_MODEL_CONFIG.localModelPath;

    const createOptions = (path, delegate = 'GPU') => ({
      baseOptions: {
        modelAssetPath: path,
        delegate
      },
      runningMode,
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    try {
      poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, createOptions(modelAssetPath, 'GPU'));
    } catch (gpuErr) {
      console.warn('GPU delegate failed, attempting CPU delegate:', gpuErr);
      try {
        poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, createOptions(modelAssetPath, 'CPU'));
      } catch (localModelErr) {
        console.warn('Local model failed, falling back to Google Cloud Storage URL:', localModelErr);
        modelAssetPath = POSE_MODEL_CONFIG.remoteModelPath;
        poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, createOptions(modelAssetPath, 'CPU'));
      }
    }

    currentRunningMode = runningMode;
    return poseLandmarkerInstance;
  })();

  try {
    const instance = await initPromise;
    return instance;
  } catch (err) {
    initPromise = null;
    poseLandmarkerInstance = null;
    throw new Error(`Failed to initialize MediaPipe Pose Landmarker: ${err.message}`);
  }
}

let lastVideoTimestamp = -1;

/**
 * Perform pose detection on a continuous video frame
 * @param {HTMLVideoElement} videoElement
 * @param {number} timestampInMs - must be strictly greater than previous timestamp
 * @returns {Promise<{ hasPose: boolean, landmarks: Array|null, worldLandmarks: Array|null }>}
 */
export async function detectPoseForVideoFrame(videoElement, timestampInMs) {
  const landmarker = await getPoseLandmarker('VIDEO');

  // Ensure timestamp is strictly increasing to satisfy MediaPipe requirements
  let safeTimestamp = timestampInMs;
  if (safeTimestamp <= lastVideoTimestamp) {
    safeTimestamp = lastVideoTimestamp + 1;
  }
  lastVideoTimestamp = safeTimestamp;

  try {
    const result = landmarker.detectForVideo(videoElement, safeTimestamp);

    if (result && result.landmarks && result.landmarks.length > 0) {
      return {
        hasPose: true,
        landmarks: result.landmarks[0],
        worldLandmarks: result.worldLandmarks ? result.worldLandmarks[0] : null
      };
    }

    return {
      hasPose: false,
      landmarks: null,
      worldLandmarks: null
    };
  } catch (err) {
    console.warn('Pose estimation frame error:', err);
    return {
      hasPose: false,
      landmarks: null,
      worldLandmarks: null,
      error: err.message
    };
  }
}

/**
 * Resets the internal timestamp tracker when video is restarted or replaced
 */
export function resetVideoTimestamp() {
  lastVideoTimestamp = -1;
}

/**
 * Perform single-frame pose detection on an image, canvas, or video frame
 * @param {HTMLImageElement | HTMLCanvasElement | HTMLVideoElement} imageSource
 * @returns {Promise<{ hasPose: boolean, landmarks: Array|null, worldLandmarks: Array|null }>}
 */
export async function detectPoseOnStaticImage(imageSource) {
  const landmarker = await getPoseLandmarker('IMAGE');
  const result = landmarker.detect(imageSource);

  if (result && result.landmarks && result.landmarks.length > 0) {
    return {
      hasPose: true,
      landmarks: result.landmarks[0],
      worldLandmarks: result.worldLandmarks ? result.worldLandmarks[0] : null
    };
  }

  return {
    hasPose: false,
    landmarks: null,
    worldLandmarks: null
  };
}

/**
 * Draws landmarks and skeletal connections on a 2D canvas context
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} landmarks - 33 normalized landmarks [{x, y, z, visibility}]
 * @param {number} width - canvas width
 * @param {number} height - canvas height
 */
export function drawPoseOnCanvas(ctx, landmarks, width, height) {
  if (!landmarks || landmarks.length === 0) return;

  ctx.save();
  ctx.lineWidth = 3;

  // 1. Draw connections
  for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];

    if (!start || !end) continue;
    // Skip if landmark visibility is explicitly reported as very low
    if ((start.visibility !== undefined && start.visibility < 0.4) ||
        (end.visibility !== undefined && end.visibility < 0.4)) {
      continue;
    }

    const isLeg = (startIndex >= 23 && endIndex >= 23);
    ctx.strokeStyle = isLeg ? '#10b981' : '#38bdf8'; // Emerald for legs, sky blue for torso/arms

    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
  }

  // 2. Draw landmark points
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if (!lm) continue;
    if (lm.visibility !== undefined && lm.visibility < 0.4) continue;

    const x = lm.x * width;
    const y = lm.y * height;

    const isKeySquatJoint = (i === POSE_LANDMARKS.LEFT_HIP || i === POSE_LANDMARKS.RIGHT_HIP ||
                             i === POSE_LANDMARKS.LEFT_KNEE || i === POSE_LANDMARKS.RIGHT_KNEE ||
                             i === POSE_LANDMARKS.LEFT_ANKLE || i === POSE_LANDMARKS.RIGHT_ANKLE);

    ctx.beginPath();
    ctx.arc(x, y, isKeySquatJoint ? 6 : 4, 0, 2 * Math.PI);
    ctx.fillStyle = isKeySquatJoint ? '#f59e0b' : '#38bdf8'; // Amber for squat joints, sky blue for others
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}
