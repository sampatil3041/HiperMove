import { GoogleGenAI } from '@google/genai';

/**
 * Service to generate plain-language movement session summaries using Gemma / Gemini API.
 * Follows strict PRD guidelines:
 * - Summarizes ONLY the supplied metrics
 * - Prohibits medical diagnoses, injury claims, or invented repetitions
 * - Transparently distinguishes real Gemma responses from local test mocks
 */

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemma-4-31b-it';

/**
 * Generates local clearly-labeled mock summary when GEMINI_API_KEY is not configured
 */
function generateLocalMockSummary(metrics) {
  const {
    repetitionCount,
    videoDurationSeconds,
    usableFrameRatio,
    avgDepthDegrees,
    bestDepthDegrees
  } = metrics;

  const coveragePercent = Math.round((usableFrameRatio || 0) * 100);

  let depthText = 'No depth data was recorded.';
  if (bestDepthDegrees !== null) {
    if (bestDepthDegrees <= 90) {
      depthText = `Deep/parallel squat depth was reached with a lowest recorded knee flexion angle of ${bestDepthDegrees}°.`;
    } else if (bestDepthDegrees <= 100) {
      depthText = `Standard squat depth was reached with a lowest knee flexion angle of ${bestDepthDegrees}°.`;
    } else {
      depthText = `Lowest knee flexion recorded was ${bestDepthDegrees}°.`;
    }
  }

  let repsText = '';
  if (repetitionCount === 0) {
    repsText = `Zero completed repetitions were detected over the ${videoDurationSeconds}s clip.`;
  } else if (repetitionCount === 1) {
    repsText = `1 completed squat repetition was measured over the ${videoDurationSeconds}s clip.`;
  } else {
    repsText = `${repetitionCount} completed squat repetitions were measured over the ${videoDurationSeconds}s clip.`;
  }

  return {
    source: 'mock_demo',
    isMock: true,
    notice: 'DEMO MOCK SUMMARY: GEMINI_API_KEY is not configured in backend/.env. This summary was generated locally for UI testing and was NOT produced by Gemma.',
    summary: `${repsText} ${depthText} Usable landmark coverage was ${coveragePercent}%. Movement showed consistent joint visibility during the recorded frames.`,
    metricsSupplied: {
      repetitionCount,
      videoDurationSeconds,
      avgDepthDegrees,
      bestDepthDegrees,
      usableFrameRatio
    }
  };
}

/**
 * Generates AI session summary using Gemma through Gemini API
 * @param {object} metrics
 * @returns {Promise<object>}
 */
export async function generateSessionSummary(metrics) {
  const apiKey = process.env.GEMINI_API_KEY;

  // If no API key is provided, return clearly labelled mock summary
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return generateLocalMockSummary(metrics);
  }

  const {
    exerciseType,
    repetitionCount,
    videoDurationSeconds,
    usableFrameRatio,
    avgDepthDegrees,
    bestDepthDegrees,
    repHistory
  } = metrics;

  const coveragePercent = Math.round((usableFrameRatio || 0) * 100);

  const prompt = `You are a careful movement and mobility assistant for the HiperMove prototype.
Your task is to summarize the following measured squat exercise session in 2 to 3 concise, objective sentences.

MEASURED SESSION METRICS:
- Exercise Type: ${exerciseType}
- Completed Repetitions: ${repetitionCount}
- Video Duration: ${videoDurationSeconds} seconds
- Landmark Usability Coverage: ${coveragePercent}% of frames
- Average Bottom Knee Flexion Angle: ${avgDepthDegrees !== null ? `${avgDepthDegrees}°` : 'N/A'}
- Deepest Knee Flexion Angle: ${bestDepthDegrees !== null ? `${bestDepthDegrees}°` : 'N/A'}
- Individual Reps: ${JSON.stringify(repHistory || [])}

STRICT INSTRUCTIONS:
1. Base your explanation strictly on the provided numbers.
2. Do NOT invent repetitions, angles, calories, heart rates, injury risks, or medical diagnoses.
3. Do NOT make professional clinical claims or rehabilitation prescriptions.
4. Keep the tone encouraging, factual, and concise (maximum 3 sentences).
5. Conclude with a reminder that camera angle and clothing can influence video landmark estimates.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

    const response = await ai.models.generateContent({
      model,
      contents: prompt
    });

    const summaryText = response.text ? response.text.trim() : 'Summary could not be generated.';

    return {
      source: 'gemma',
      model,
      isMock: false,
      summary: summaryText,
      metricsSupplied: {
        repetitionCount,
        videoDurationSeconds,
        avgDepthDegrees,
        bestDepthDegrees,
        usableFrameRatio
      }
    };
  } catch (err) {
    console.error('Google GenAI Error:', err.message);

    // If the specific model ID failed, check if we can fall back to standard gemini flash model
    if (err.message && err.message.includes('not found') && process.env.GEMINI_MODEL !== 'gemini-1.5-flash') {
      try {
        console.warn('Retrying with gemini-1.5-flash fallback...');
        const ai = new GoogleGenAI({ apiKey });
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt
        });

        return {
          source: 'gemini_fallback',
          model: 'gemini-1.5-flash',
          isMock: false,
          summary: fallbackResponse.text.trim(),
          metricsSupplied: {
            repetitionCount,
            videoDurationSeconds,
            avgDepthDegrees,
            bestDepthDegrees,
            usableFrameRatio
          }
        };
      } catch (fallbackErr) {
        console.error('Fallback model also failed:', fallbackErr.message);
      }
    }

    throw new Error(`AI Summary service error: ${err.message}`);
  }
}
