/**
 * Movement Metrics Formatter and Validator for HiperMove
 * Aggregates deterministic counter data and formats metrics for dashboard and Gemma 4
 */

/**
 * Format raw counter metrics for UI display and backend serialization
 * @param {object} squatCounterInstance
 * @param {number} videoDuration
 * @returns {object}
 */
export function buildMovementSessionSummary(squatCounterInstance, videoDuration = 0) {
  if (!squatCounterInstance) {
    return {
      exerciseType: 'squat',
      repetitionCount: 0,
      videoDurationSeconds: Math.round(videoDuration),
      usableFrameRatio: 0,
      avgDepthDegrees: null,
      bestDepthDegrees: null,
      repHistory: [],
      qualityAssessment: 'insufficient_data'
    };
  }

  const raw = squatCounterInstance.getMetrics();
  const reps = raw.repetitionCount || 0;
  const coverage = raw.usableFrameRatio || 0;

  let qualityAssessment = 'good';
  if (coverage < 0.5) {
    qualityAssessment = 'low_visibility';
  } else if (reps === 0) {
    qualityAssessment = 'no_reps_detected';
  }

  return {
    exerciseType: 'squat',
    repetitionCount: reps,
    videoDurationSeconds: Number(videoDuration.toFixed(1)),
    usableFrameRatio: coverage,
    avgDepthDegrees: raw.avgDepthDegrees,
    bestDepthDegrees: raw.bestDepthDegrees,
    repHistory: raw.repHistory || [],
    qualityAssessment
  };
}
