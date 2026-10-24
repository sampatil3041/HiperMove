import { Router } from 'express';
import { generateSessionSummary } from '../services/gemmaService.js';

const router = Router();

/**
 * POST /api/analysis/summary
 * Generates an AI summary for deterministic movement metrics
 */
router.post('/summary', async (req, res) => {
  const body = req.body;

  // 1. Strict Schema Validation
  if (!body || typeof body !== 'object') {
    return res.status(400).json({
      error: 'Invalid Request',
      message: 'Request body must be a JSON object containing measured exercise metrics.'
    });
  }

  // Ensure no video data was sent
  if (body.video || body.videoData || body.file || body.frames) {
    return res.status(400).json({
      error: 'Invalid Payload',
      message: 'Video files must not be submitted to the AI analysis endpoint. Send calculated metrics only.'
    });
  }

  const {
    exerciseType,
    repetitionCount,
    videoDurationSeconds,
    usableFrameRatio,
    avgDepthDegrees,
    bestDepthDegrees,
    repHistory
  } = body;

  if (exerciseType !== 'squat') {
    return res.status(400).json({
      error: 'Validation Error',
      message: `Invalid exerciseType: "${exerciseType}". Only "squat" is supported in this MVP.`
    });
  }

  if (typeof repetitionCount !== 'number' || repetitionCount < 0 || !Number.isInteger(repetitionCount)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'repetitionCount must be a non-negative integer.'
    });
  }

  if (typeof videoDurationSeconds !== 'number' || videoDurationSeconds < 0 || videoDurationSeconds > 300) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'videoDurationSeconds must be a number between 0 and 300.'
    });
  }

  if (typeof usableFrameRatio !== 'number' || usableFrameRatio < 0 || usableFrameRatio > 1) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'usableFrameRatio must be a normalized number between 0.0 and 1.0.'
    });
  }

  // 2. Execute Summary Generation
  try {
    const result = await generateSessionSummary({
      exerciseType,
      repetitionCount,
      videoDurationSeconds,
      usableFrameRatio,
      avgDepthDegrees: typeof avgDepthDegrees === 'number' ? avgDepthDegrees : null,
      bestDepthDegrees: typeof bestDepthDegrees === 'number' ? bestDepthDegrees : null,
      repHistory: Array.isArray(repHistory) ? repHistory : []
    });

    return res.json(result);
  } catch (err) {
    console.error('Analysis summary generation failed:', err.message);
    return res.status(502).json({
      error: 'AI Summary Service Unavailable',
      message: err.message,
      allowMock: true
    });
  }
});

export default router;
