
import { GoogleGenAI } from '@google/genai';

/**
 * HiperMove AI Summary Service
 *
 * Features:
 * 1. Generates summaries using the configured Google AI model.
 * 2. Retries temporary API errors with exponential backoff.
 * 3. Optionally tries a second model if configured.
 * 4. Returns a local metric-based summary if AI remains unavailable.
 *
 * Important:
 * Local summaries are clearly labeled and are not presented as AI-generated.
 */

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemma-4-31b-it';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || '';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getErrorMessage(error) {
  if (typeof error?.message === 'string') {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isTemporaryError(error) {
  const message = getErrorMessage(error).toUpperCase();

  return (
    message.includes('503') ||
    message.includes('UNAVAILABLE') ||
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('504') ||
    message.includes('INTERNAL')
  );
}

function isModelError(error) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('not found') ||
    message.includes('not supported') ||
    message.includes('invalid model') ||
    message.includes('unknown model')
  );
}

/**
 * Extract text from a Google GenAI response.
 */
function extractResponseText(response) {
  if (typeof response?.text === 'string' && response.text.trim()) {
    return response.text.trim();
  }

  const parts = response?.candidates?.[0]?.content?.parts;

  if (Array.isArray(parts)) {
    return parts
      .map((part) => part?.text || '')
      .join('\n')
      .trim();
  }

  return '';
}

/**
 * Retry temporary failures using exponential backoff.
 */
async function generateWithRetry(ai, model, prompt, attempts = MAX_RETRIES) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 180,
        },
      });

      const text = extractResponseText(response);

      if (!text) {
        const finishReason =
          response?.candidates?.[0]?.finishReason || 'UNKNOWN';

        throw new Error(
          `The AI model returned no summary text. Finish reason: ${finishReason}`
        );
      }

      return text;
    } catch (error) {
      lastError = error;

      const canRetry =
        isTemporaryError(error) &&
        attempt < attempts - 1;

      if (!canRetry) {
        throw error;
      }

      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);

      console.warn(
        `[HiperMove] ${model} request failed. ` +
        `Retrying in ${delay}ms (${attempt + 1}/${attempts - 1}).`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Local summary used when the API key is missing or AI generation fails.
 * It uses only the supplied session metrics.
 */
function generateLocalSummary(metrics, reason = 'AI service unavailable') {
  const {
    exerciseType = 'squat',
    repetitionCount = 0,
    videoDurationSeconds = 0,
    usableFrameRatio = 0,
    avgDepthDegrees = null,
    bestDepthDegrees = null,
  } = metrics || {};

  const safeReps =
    Number.isFinite(repetitionCount) && repetitionCount >= 0
      ? repetitionCount
      : 0;

  const safeDuration =
    Number.isFinite(videoDurationSeconds) && videoDurationSeconds >= 0
      ? videoDurationSeconds
      : 0;

  const safeCoverage =
    Number.isFinite(usableFrameRatio)
      ? Math.max(0, Math.min(1, usableFrameRatio))
      : 0;

  const coveragePercent = Math.round(safeCoverage * 100);

  let repsText;

  if (safeReps === 0) {
    repsText =
      `No completed squat repetitions were detected in the ` +
      `${safeDuration}-second clip.`;
  } else if (safeReps === 1) {
    repsText =
      `1 completed squat repetition was detected in the ` +
      `${safeDuration}-second clip.`;
  } else {
    repsText =
      `${safeReps} completed squat repetitions were detected in the ` +
      `${safeDuration}-second clip.`;
  }

  let depthText = 'A reliable squat depth measurement was not available.';

  if (Number.isFinite(bestDepthDegrees)) {
    if (bestDepthDegrees <= 90) {
      depthText =
        `The lowest recorded knee flexion angle was ` +
        `${bestDepthDegrees}°, within the deep/parallel range used by this prototype.`;
    } else if (bestDepthDegrees <= 100) {
      depthText =
        `The lowest recorded knee flexion angle was ` +
        `${bestDepthDegrees}°, within the standard depth range used by this prototype.`;
    } else {
      depthText =
        `The lowest recorded knee flexion angle was ${bestDepthDegrees}°.`;
    }
  }

  let averageText = '';

  if (Number.isFinite(avgDepthDegrees)) {
    averageText =
      ` The average bottom knee flexion angle was ${avgDepthDegrees}°.`;
  }

  const summary =
    `${repsText} ${depthText}${averageText} ` +
    `Usable landmark coverage was ${coveragePercent}%. ` +
    `Camera angle, lighting, and clothing can affect video-based estimates.`;

  return {
    source: 'local_fallback',
    model: null,
    isMock: true,
    notice:
      `AI-generated summary was unavailable (${reason}). ` +
      'This summary was generated locally from measured session metrics.',
    summary,
    metricsSupplied: {
      exerciseType,
      repetitionCount: safeReps,
      videoDurationSeconds: safeDuration,
      avgDepthDegrees: Number.isFinite(avgDepthDegrees)
        ? avgDepthDegrees
        : null,
      bestDepthDegrees: Number.isFinite(bestDepthDegrees)
        ? bestDepthDegrees
        : null,
      usableFrameRatio: safeCoverage,
    },
  };
}

/**
 * Build a concise prompt using only measured session metrics.
 */
function buildPrompt(metrics) {
  const {
    exerciseType = 'squat',
    repetitionCount = 0,
    videoDurationSeconds = 0,
    usableFrameRatio = 0,
    avgDepthDegrees = null,
    bestDepthDegrees = null,
    repHistory = [],
  } = metrics;

  const coveragePercent = Math.round(
    (Number.isFinite(usableFrameRatio) ? usableFrameRatio : 0) * 100
  );

  // Limit prompt size if a long repetition history is provided.
  const recentReps = Array.isArray(repHistory)
    ? repHistory.slice(-10)
    : [];

  return `
You are a careful movement-analysis assistant for the HiperMove prototype.

Write a concise summary of the user's measured squat session in 2-3 sentences.

MEASURED SESSION METRICS:
- Exercise: ${exerciseType}
- Completed repetitions: ${repetitionCount}
- Video duration: ${videoDurationSeconds} seconds
- Usable landmark coverage: ${coveragePercent}%
- Average bottom knee flexion angle: ${
    Number.isFinite(avgDepthDegrees) ? `${avgDepthDegrees} degrees` : 'N/A'
  }
- Lowest recorded knee flexion angle: ${
    Number.isFinite(bestDepthDegrees) ? `${bestDepthDegrees} degrees` : 'N/A'
  }
- Recent repetition history: ${JSON.stringify(recentReps)}

STRICT RULES:
1. Use only the supplied metrics.
2. Do not invent repetitions, angles, calories, heart rate, or other measurements.
3. Do not diagnose medical conditions or claim that the user is injured.
4. Do not make unsupported claims about form or movement consistency.
5. Keep the response objective, encouraging, and under 3 sentences.
6. Mention that camera angle, lighting, and clothing may affect estimates.
7. Return plain text without markdown headings.
`.trim();
}

/**
 * Generate a session summary.
 *
 * @param {object} metrics - Calculated squat metrics from the backend.
 * @returns {Promise<object>}
 */
export async function generateSessionSummary(metrics) {
  const safeMetrics = metrics || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return generateLocalSummary(
      safeMetrics,
      'GEMINI_API_KEY is not configured'
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const prompt = buildPrompt(safeMetrics);

  try {
    // First attempt: configured primary model with automatic retries.
    const summary = await generateWithRetry(ai, primaryModel, prompt);

    return {
      source: 'gemma',
      model: primaryModel,
      isMock: false,
      summary,
      metricsSupplied: {
        repetitionCount: safeMetrics.repetitionCount,
        videoDurationSeconds: safeMetrics.videoDurationSeconds,
        avgDepthDegrees: safeMetrics.avgDepthDegrees ?? null,
        bestDepthDegrees: safeMetrics.bestDepthDegrees ?? null,
        usableFrameRatio: safeMetrics.usableFrameRatio,
      },
    };
  } catch (primaryError) {
    console.error(
      `[HiperMove] Primary model "${primaryModel}" failed:`,
      getErrorMessage(primaryError)
    );

    // Second attempt: optional model configured in backend/.env.
    if (
      FALLBACK_MODEL &&
      FALLBACK_MODEL !== primaryModel
    ) {
      try {
        console.warn(
          `[HiperMove] Trying configured fallback model "${FALLBACK_MODEL}".`
        );

        const summary = await generateWithRetry(
          ai,
          FALLBACK_MODEL,
          prompt,
          2
        );

        return {
          source: 'gemini_fallback',
          model: FALLBACK_MODEL,
          isMock: false,
          summary,
          metricsSupplied: {
            repetitionCount: safeMetrics.repetitionCount,
            videoDurationSeconds: safeMetrics.videoDurationSeconds,
            avgDepthDegrees: safeMetrics.avgDepthDegrees ?? null,
            bestDepthDegrees: safeMetrics.bestDepthDegrees ?? null,
            usableFrameRatio: safeMetrics.usableFrameRatio,
          },
        };
      } catch (fallbackError) {
        console.error(
          `[HiperMove] Fallback model "${FALLBACK_MODEL}" failed:`,
          getErrorMessage(fallbackError)
        );
      }
    }

    // Final fallback: keep the summary feature usable without the AI API.
    const reason = isModelError(primaryError)
      ? 'configured AI model is unavailable or unsupported'
      : isTemporaryError(primaryError)
        ? 'Google AI service is temporarily unavailable'
        : 'AI summary generation failed';

    console.warn(
      '[HiperMove] Returning a local metric-based summary.'
    );

    return generateLocalSummary(safeMetrics, reason);
  }
}
