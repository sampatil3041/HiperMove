import assert from 'node:assert';
import app from '../server.js';

console.log('--- Running Backend API Schema & Route Tests ---');

// Test 1: Invalid payload (missing exerciseType)
const res1 = await fetch('http://localhost:3001/api/analysis/summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ repetitionCount: 5 })
});
assert.strictEqual(res1.status, 400);
const data1 = await res1.json();
assert.match(data1.message, /exerciseType/);
console.log('✓ Rejection of missing/invalid exerciseType passed (400 Bad Request)');

// Test 2: Rejection of video payload
const res2 = await fetch('http://localhost:3001/api/analysis/summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ exerciseType: 'squat', video: 'base64...' })
});
assert.strictEqual(res2.status, 400);
const data2 = await res2.json();
assert.match(data2.message, /Video files must not be submitted/);
console.log('✓ Rejection of video payload passed (400 Bad Request)');

// Test 3: Successful generation with valid metrics
const validMetrics = {
  exerciseType: 'squat',
  repetitionCount: 1,
  videoDurationSeconds: 2.1,
  usableFrameRatio: 0.95,
  avgDepthDegrees: 85,
  bestDepthDegrees: 85,
  repHistory: [{ repNumber: 1, minAngle: 85, durationMs: 1800, side: 'left' }]
};

const res3 = await fetch('http://localhost:3001/api/analysis/summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(validMetrics)
});
assert.strictEqual(res3.status, 200);
const data3 = await res3.json();
assert.ok(data3.summary);
assert.ok(data3.source);
console.log(`✓ Valid metrics successfully generated summary (Source: ${data3.source})`);
console.log(`  Sample Summary: "${data3.summary}"`);

console.log('--- All Backend API Route Tests Passed Successfully! ---');
process.exit(0);
