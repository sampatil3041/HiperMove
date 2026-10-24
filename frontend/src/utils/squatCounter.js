/**
 * Deterministic Squat Counting Algorithm & Finite State Machine (FSM)
 * Computes joint angles from MediaPipe Pose Landmarks and identifies completed squat cycles.
 */

import { POSE_LANDMARKS } from '../services/poseLandmarker.js';

export const DEFAULT_SQUAT_CONFIG = {
  STANDING_THRESHOLD_DEG: 155, // Angle >= 155° is considered standing upright
  BOTTOM_THRESHOLD_DEG: 100,   // Angle <= 100° indicates valid squat depth
  ASCENT_THRESHOLD_DEG: 115,   // Angle > 115° confirms upward ascent from bottom (hysteresis)
  MIN_VISIBILITY_CONFIDENCE: 0.45,
  MIN_REP_DURATION_MS: 600     // Prevent phantom double-counts occurring within 600ms
};

export const SQUAT_STATES = {
  UNKNOWN: 'UNKNOWN',
  STANDING: 'STANDING',
  DESCENDING: 'DESCENDING',
  BOTTOM: 'BOTTOM',
  ASCENDING: 'ASCENDING'
};

/**
 * Calculates 2D angle (in degrees) formed by points A - B - C (with B as the vertex)
 * @param {{x: number, y: number}} a - Hip
 * @param {{x: number, y: number}} b - Knee (vertex)
 * @param {{x: number, y: number}} c - Ankle
 * @returns {number} Angle in degrees [0, 180]
 */
export function calculateAngle(a, b, c) {
  if (!a || !b || !c) return 0;

  const abX = a.x - b.x;
  const abY = a.y - b.y;
  const cbX = c.x - b.x;
  const cbY = c.y - b.y;

  const dot = abX * cbX + abY * cbY;
  const magAB = Math.sqrt(abX * abX + abY * abY);
  const magCB = Math.sqrt(cbX * cbX + cbY * cbY);

  if (magAB === 0 || magCB === 0) return 0;

  let cosine = dot / (magAB * magCB);
  // Clamp to [-1, 1] to avoid floating point precision domain errors
  cosine = Math.max(-1, Math.min(1, cosine));

  const radians = Math.acos(cosine);
  return (radians * 180) / Math.PI;
}

/**
 * Extracts the primary visible knee angle from 33 MediaPipe pose landmarks
 * Chooses the side (left vs right) with superior landmark visibility/confidence.
 * @param {Array} landmarks
 * @param {number} minConfidence
 * @returns {{ angle: number, side: 'left'|'right'|'unknown', confidence: number } | null}
 */
export function extractKneeAngle(landmarks, minConfidence = 0.45) {
  if (!landmarks || landmarks.length < 33) return null;

  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];

  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

  const getConf = (lm) => (lm && typeof lm.visibility === 'number' ? lm.visibility : 0.8);

  const leftConf = (getConf(leftHip) + getConf(leftKnee) + getConf(leftAnkle)) / 3;
  const rightConf = (getConf(rightHip) + getConf(rightKnee) + getConf(rightAnkle)) / 3;

  let chosenSide = 'unknown';
  let chosenAngle = 0;
  let chosenConf = 0;

  if (leftConf >= rightConf && leftConf >= minConfidence) {
    chosenSide = 'left';
    chosenAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    chosenConf = leftConf;
  } else if (rightConf >= minConfidence) {
    chosenSide = 'right';
    chosenAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    chosenConf = rightConf;
  }

  if (chosenSide === 'unknown') {
    return null;
  }

  return {
    angle: Math.round(chosenAngle),
    side: chosenSide,
    confidence: chosenConf
  };
}

/**
 * Deterministic Squat State Machine Tracker
 */
export class SquatCounter {
  constructor(config = {}) {
    this.config = { ...DEFAULT_SQUAT_CONFIG, ...config };
    this.reset();
  }

  reset() {
    this.state = SQUAT_STATES.UNKNOWN;
    this.repetitionCount = 0;
    this.currentAngle = null;
    this.currentSide = 'unknown';
    this.minAngleInCurrentRep = 180;
    this.repStartTimeMs = 0;
    this.lastRepEndTimeMs = 0;
    this.repHistory = [];
    this.totalFramesProcessed = 0;
    this.validFramesCount = 0;
  }

  /**
   * Process a single landmark frame
   * @param {Array} landmarks - 33 MediaPipe pose landmarks
   * @param {number} timestampMs - timestamp in milliseconds
   * @returns {{
   *   state: string,
   *   repetitionCount: number,
   *   currentAngle: number|null,
   *   minAngle: number,
   *   isNewRep: boolean,
   *   side: string
   * }}
   */
  processFrame(landmarks, timestampMs = 0) {
    this.totalFramesProcessed += 1;
    let isNewRep = false;

    const angleInfo = extractKneeAngle(landmarks, this.config.MIN_VISIBILITY_CONFIDENCE);

    if (!angleInfo) {
      // If we temporarily lose landmarks, maintain count but indicate unknown pose state
      return {
        state: this.state,
        repetitionCount: this.repetitionCount,
        currentAngle: this.currentAngle,
        minAngle: this.minAngleInCurrentRep,
        isNewRep: false,
        side: this.currentSide
      };
    }

    this.validFramesCount += 1;
    const angle = angleInfo.angle;
    this.currentAngle = angle;
    this.currentSide = angleInfo.side;

    const {
      STANDING_THRESHOLD_DEG,
      BOTTOM_THRESHOLD_DEG,
      ASCENT_THRESHOLD_DEG,
      MIN_REP_DURATION_MS
    } = this.config;

    // State Machine Transitions
    switch (this.state) {
      case SQUAT_STATES.UNKNOWN:
        if (angle >= STANDING_THRESHOLD_DEG - 5) {
          this.state = SQUAT_STATES.STANDING;
          this.minAngleInCurrentRep = angle;
        }
        break;

      case SQUAT_STATES.STANDING:
        // Transition to DESCENDING when knee flexes noticeably
        if (angle < STANDING_THRESHOLD_DEG - 10) {
          this.state = SQUAT_STATES.DESCENDING;
          this.repStartTimeMs = timestampMs;
          this.minAngleInCurrentRep = angle;
        }
        break;

      case SQUAT_STATES.DESCENDING:
        // Track lowest knee angle reached (squat depth)
        if (angle < this.minAngleInCurrentRep) {
          this.minAngleInCurrentRep = angle;
        }

        if (angle <= BOTTOM_THRESHOLD_DEG) {
          // Successfully reached squat depth
          this.state = SQUAT_STATES.BOTTOM;
        } else if (angle >= STANDING_THRESHOLD_DEG) {
          // Stood back up without reaching bottom threshold -> aborted/partial squat
          this.state = SQUAT_STATES.STANDING;
          this.minAngleInCurrentRep = 180;
        }
        break;

      case SQUAT_STATES.BOTTOM:
        if (angle < this.minAngleInCurrentRep) {
          this.minAngleInCurrentRep = angle;
        }

        // Must push upward beyond hysteresis threshold to enter ASCENDING
        if (angle > ASCENT_THRESHOLD_DEG) {
          this.state = SQUAT_STATES.ASCENDING;
        }
        break;

      case SQUAT_STATES.ASCENDING:
        // Return to upright standing completes the repetition cycle
        if (angle >= STANDING_THRESHOLD_DEG - 5) {
          const repDuration = timestampMs > this.repStartTimeMs ? timestampMs - this.repStartTimeMs : 0;
          const timeSinceLastRep = timestampMs > this.lastRepEndTimeMs ? timestampMs - this.lastRepEndTimeMs : 9999;

          // Guard against phantom double-count spikes
          if (timeSinceLastRep >= MIN_REP_DURATION_MS || this.repetitionCount === 0) {
            this.repetitionCount += 1;
            isNewRep = true;
            this.lastRepEndTimeMs = timestampMs;

            this.repHistory.push({
              repNumber: this.repetitionCount,
              minAngle: this.minAngleInCurrentRep,
              durationMs: repDuration,
              side: this.currentSide
            });
          }

          this.state = SQUAT_STATES.STANDING;
          this.minAngleInCurrentRep = 180;
        } else if (angle <= BOTTOM_THRESHOLD_DEG) {
          // Re-descended before standing back up
          this.state = SQUAT_STATES.BOTTOM;
        }
        break;

      default:
        this.state = SQUAT_STATES.UNKNOWN;
    }

    return {
      state: this.state,
      repetitionCount: this.repetitionCount,
      currentAngle: this.currentAngle,
      minAngle: this.minAngleInCurrentRep,
      isNewRep,
      side: this.currentSide
    };
  }

  /**
   * Summary metrics for results dashboard and AI summary
   */
  getMetrics() {
    const depths = this.repHistory.map((r) => r.minAngle);
    const avgDepth = depths.length > 0 ? Math.round(depths.reduce((a, b) => a + b, 0) / depths.length) : null;
    const minDepthOverall = depths.length > 0 ? Math.min(...depths) : null;

    return {
      exerciseType: 'squat',
      repetitionCount: this.repetitionCount,
      avgDepthDegrees: avgDepth,
      bestDepthDegrees: minDepthOverall,
      repHistory: this.repHistory,
      totalFramesProcessed: this.totalFramesProcessed,
      usableFrameRatio:
        this.totalFramesProcessed > 0
          ? Number((this.validFramesCount / this.totalFramesProcessed).toFixed(2))
          : 0
    };
  }
}
