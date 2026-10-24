/**
 * Video validation and metadata utilities for HiperMove
 * Enforces PRD video policy:
 * - Formats: MP4, WebM
 * - Max size: 25 MB
 * - Max duration: 60 seconds
 */

export const VIDEO_LIMITS = {
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
  MAX_DURATION_SECONDS: 60, // 60 seconds
  ALLOWED_EXTENSIONS: ['.mp4', '.webm'],
  ALLOWED_MIME_TYPES: ['video/mp4', 'video/webm']
};

/**
 * Format bytes into human-readable string (e.g. 14.2 MB)
 */
export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

/**
 * Format seconds into mm:ss or ss.s format
 */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  if (mins === 0) {
    return `${secs}.${tenths}s`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Validate file type and size synchronously
 * @param {File} file
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateFileBasic(file) {
  if (!file) {
    return { isValid: false, error: 'No video file was selected.' };
  }

  // 1. Check size limit
  if (file.size > VIDEO_LIMITS.MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum allowed limit of 25 MB.`
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: 'Selected video file appears to be empty (0 bytes).'
    };
  }

  // 2. Check extension
  const fileName = (file.name || '').toLowerCase();
  const hasValidExt = VIDEO_LIMITS.ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));

  // 3. Check MIME type (if reported by browser)
  const mimeType = (file.type || '').toLowerCase();
  const hasValidMime = mimeType === '' || VIDEO_LIMITS.ALLOWED_MIME_TYPES.includes(mimeType);

  if (!hasValidExt && !hasValidMime) {
    return {
      isValid: false,
      error: `Unsupported file format. Please upload an MP4 or WebM video.`
    };
  }

  return { isValid: true };
}

/**
 * Asynchronously inspects video metadata using an off-screen HTML video element
 * @param {File} file
 * @returns {Promise<{ isValid: boolean, metadata?: object, objectUrl?: string, error?: string }>}
 */
export function loadAndValidateVideoMetadata(file) {
  return new Promise((resolve) => {
    const basicValidation = validateFileBasic(file);
    if (!basicValidation.isValid) {
      resolve({ isValid: false, error: basicValidation.error });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    let isCleanedUp = false;
    const cleanup = () => {
      if (!isCleanedUp) {
        isCleanedUp = true;
        video.removeAttribute('src');
        video.load();
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      URL.revokeObjectURL(objectUrl);
      resolve({
        isValid: false,
        error: 'Video metadata could not be loaded within the timeout window. The file may be corrupt or encoded in an unsupported codec.'
      });
    }, 8000);

    video.onloadedmetadata = () => {
      clearTimeout(timer);
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (!Number.isFinite(duration) || duration <= 0) {
        cleanup();
        URL.revokeObjectURL(objectUrl);
        resolve({
          isValid: false,
          error: 'Unable to determine video duration. The video stream may be corrupt or incomplete.'
        });
        return;
      }

      if (duration > VIDEO_LIMITS.MAX_DURATION_SECONDS) {
        cleanup();
        URL.revokeObjectURL(objectUrl);
        resolve({
          isValid: false,
          error: `Video duration (${formatDuration(duration)}) exceeds the 60-second limit. Please upload a shorter clip (10–30s recommended).`
        });
        return;
      }

      if (width === 0 || height === 0) {
        cleanup();
        URL.revokeObjectURL(objectUrl);
        resolve({
          isValid: false,
          error: 'Video dimensions could not be read. Please ensure the file contains a valid video track.'
        });
        return;
      }

      cleanup();
      resolve({
        isValid: true,
        objectUrl,
        metadata: {
          name: file.name,
          size: file.size,
          sizeFormatted: formatFileSize(file.size),
          duration,
          durationFormatted: formatDuration(duration),
          width,
          height,
          aspectRatio: (width / height).toFixed(2),
          type: file.type || 'video/mp4'
        }
      });
    };

    video.onerror = () => {
      clearTimeout(timer);
      cleanup();
      URL.revokeObjectURL(objectUrl);
      resolve({
        isValid: false,
        error: 'Browser was unable to decode the video. Please verify the video codec is supported (e.g., standard H.264 MP4 or WebM).'
      });
    };

    video.src = objectUrl;
  });
}
