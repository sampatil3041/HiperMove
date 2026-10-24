import assert from 'node:assert';
import {
  formatFileSize,
  formatDuration,
  validateFileBasic,
  VIDEO_LIMITS
} from './videoValidation.js';

console.log('--- Running videoValidation unit tests ---');

// Test 1: formatFileSize
assert.strictEqual(formatFileSize(0), '0 B');
assert.strictEqual(formatFileSize(500), '500 B');
assert.strictEqual(formatFileSize(1024 * 1024), '1.00 MB');
assert.strictEqual(formatFileSize(25 * 1024 * 1024), '25.00 MB');
console.log('✓ formatFileSize tests passed');

// Test 2: formatDuration
assert.strictEqual(formatDuration(0), '0.0s');
assert.strictEqual(formatDuration(15.4), '15.4s');
assert.strictEqual(formatDuration(60), '1:00');
assert.strictEqual(formatDuration(75), '1:15');
console.log('✓ formatDuration tests passed');

// Test 3: validateFileBasic - rejection of null/empty
const noFileResult = validateFileBasic(null);
assert.strictEqual(noFileResult.isValid, false);
assert.match(noFileResult.error, /No video file/);

// Test 4: validateFileBasic - rejection of file > 25MB
const oversizedFile = {
  name: 'test.mp4',
  size: 26 * 1024 * 1024,
  type: 'video/mp4'
};
const oversizedResult = validateFileBasic(oversizedFile);
assert.strictEqual(oversizedResult.isValid, false);
assert.match(oversizedResult.error, /exceeds the maximum allowed limit of 25 MB/);
console.log('✓ Oversized file (>25MB) rejection passed');

// Test 5: validateFileBasic - rejection of 0 byte file
const emptyFile = {
  name: 'empty.mp4',
  size: 0,
  type: 'video/mp4'
};
const emptyResult = validateFileBasic(emptyFile);
assert.strictEqual(emptyResult.isValid, false);
assert.match(emptyResult.error, /empty/);
console.log('✓ Empty file (0 bytes) rejection passed');

// Test 6: validateFileBasic - rejection of invalid extension and mime
const aviFile = {
  name: 'test.avi',
  size: 5 * 1024 * 1024,
  type: 'video/x-msvideo'
};
const aviResult = validateFileBasic(aviFile);
assert.strictEqual(aviResult.isValid, false);
assert.match(aviResult.error, /Unsupported file format/);
console.log('✓ Invalid format (.avi) rejection passed');

// Test 7: validateFileBasic - acceptance of valid MP4
const validMp4 = {
  name: 'squats.mp4',
  size: 10 * 1024 * 1024,
  type: 'video/mp4'
};
const mp4Result = validateFileBasic(validMp4);
assert.strictEqual(mp4Result.isValid, true);
assert.strictEqual(mp4Result.error, undefined);
console.log('✓ Valid MP4 accepted');

// Test 8: validateFileBasic - acceptance of valid WebM
const validWebm = {
  name: 'squats.webm',
  size: 8 * 1024 * 1024,
  type: 'video/webm'
};
const webmResult = validateFileBasic(validWebm);
assert.strictEqual(webmResult.isValid, true);
assert.strictEqual(webmResult.error, undefined);
console.log('✓ Valid WebM accepted');

console.log('--- All videoValidation unit tests completed successfully! ---');
