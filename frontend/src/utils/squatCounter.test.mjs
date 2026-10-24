import assert from 'node:assert';
import {
  calculateAngle,
  extractKneeAngle,
  SquatCounter,
  SQUAT_STATES
} from './squatCounter.js';

console.log('--- Running SquatCounter unit tests ---');

// Helper to generate a mock 33-landmark array for a given knee angle
function createMockPose(kneeAngleDeg) {
  const rad = (kneeAngleDeg * Math.PI) / 180;
  // Knee at (0.5, 0.5)
  // Hip straight up at (0.5, 0.2) -> vector (0, -0.3)
  // Ankle placed according to kneeAngleDeg relative to Hip-Knee
  const ankleX = 0.5 + 0.3 * Math.sin(Math.PI - rad);
  const ankleY = 0.5 + 0.3 * Math.cos(Math.PI - rad);

  const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0.9 }));
  // Left side landmarks (indices 23, 25, 27)
  landmarks[23] = { x: 0.5, y: 0.2, z: 0, visibility: 0.95 }; // Left Hip
  landmarks[25] = { x: 0.5, y: 0.5, z: 0, visibility: 0.95 }; // Left Knee
  landmarks[27] = { x: ankleX, y: ankleY, z: 0, visibility: 0.95 }; // Left Ankle

  return landmarks;
}

// 1. Pure angle calculation tests
const pointA = { x: 0, y: 1 };
const pointB = { x: 0, y: 0 };
const pointC = { x: 1, y: 0 };
const angle90 = calculateAngle(pointA, pointB, pointC);
assert.strictEqual(Math.round(angle90), 90);

const pointStraight = { x: 0, y: -1 };
const angle180 = calculateAngle(pointA, pointB, pointStraight);
assert.strictEqual(Math.round(angle180), 180);
console.log('✓ calculateAngle geometric calculations passed (90°, 180°)');

// 2. Acceptance Test 1: No squats (standing still at 170°)
const counterNoSquats = new SquatCounter();
for (let t = 0; t < 30; t += 1) {
  counterNoSquats.processFrame(createMockPose(170), t * 100);
}
assert.strictEqual(counterNoSquats.repetitionCount, 0);
assert.strictEqual(counterNoSquats.state, SQUAT_STATES.STANDING);
console.log('✓ Test 1: No-squat video produces 0 repetitions (Passed)');

// 3. Acceptance Test 2: One full completed squat
// Standing (170) -> Descending (130) -> Bottom (88) -> Ascending (125) -> Standing (168)
const counterOneSquat = new SquatCounter();
const oneSquatAngles = [170, 168, 150, 130, 110, 88, 85, 95, 125, 145, 165, 168];
let timeMs = 0;
for (const ang of oneSquatAngles) {
  counterOneSquat.processFrame(createMockPose(ang), timeMs);
  timeMs += 100;
}
assert.strictEqual(counterOneSquat.repetitionCount, 1);
assert.strictEqual(counterOneSquat.state, SQUAT_STATES.STANDING);
assert.strictEqual(counterOneSquat.repHistory.length, 1);
assert.strictEqual(counterOneSquat.repHistory[0].minAngle, 85);
console.log('✓ Test 2: One full squat counts exactly 1 with minDepth 85° (Passed)');

// 4. Acceptance Test 3: Multiple completed squats (3 cycles)
const counterThreeSquats = new SquatCounter();
timeMs = 0;
for (let cycle = 0; cycle < 3; cycle++) {
  // Descend to bottom
  for (const ang of [170, 140, 110, 85, 90, 120, 145, 168]) {
    counterThreeSquats.processFrame(createMockPose(ang), timeMs);
    timeMs += 100;
  }
}
assert.strictEqual(counterThreeSquats.repetitionCount, 3);
assert.strictEqual(counterThreeSquats.repHistory.length, 3);
console.log('✓ Test 3: Multiple consecutive squats counts exactly 3 (Passed)');

// 5. Acceptance Test 4: Extended pause at bottom does NOT repeatedly increment
const counterBottomPause = new SquatCounter();
timeMs = 0;
// Descend into bottom
for (const ang of [170, 140, 90, 82]) {
  counterBottomPause.processFrame(createMockPose(ang), timeMs);
  timeMs += 100;
}
assert.strictEqual(counterBottomPause.state, SQUAT_STATES.BOTTOM);
assert.strictEqual(counterBottomPause.repetitionCount, 0);

// Stay at bottom for 20 frames (2 seconds)
for (let pause = 0; pause < 20; pause++) {
  counterBottomPause.processFrame(createMockPose(82), timeMs);
  timeMs += 100;
  assert.strictEqual(counterBottomPause.repetitionCount, 0, 'Must not increment while paused at bottom');
}
// Finally ascend back up
for (const ang of [95, 125, 150, 168]) {
  counterBottomPause.processFrame(createMockPose(ang), timeMs);
  timeMs += 100;
}
assert.strictEqual(counterBottomPause.repetitionCount, 1);
console.log('✓ Test 4: Extended pause at bottom increments only once upon standing (Passed)');

// 6. Acceptance Test 5: Partial squat only (bends to 120° then stands back up)
const counterPartial = new SquatCounter();
timeMs = 0;
for (const ang of [170, 150, 135, 120, 135, 155, 168]) {
  counterPartial.processFrame(createMockPose(ang), timeMs);
  timeMs += 100;
}
assert.strictEqual(counterPartial.repetitionCount, 0, 'Partial squat without reaching bottom threshold must not count');
assert.strictEqual(counterPartial.state, SQUAT_STATES.STANDING);
console.log('✓ Test 5: Partial squat does not count as completed cycle (Passed)');

// 7. Acceptance Test 6: Occluded / missing landmarks
const counterOccluded = new SquatCounter();
const occludedResult = counterOccluded.processFrame(null, 0);
assert.strictEqual(occludedResult.repetitionCount, 0);
assert.strictEqual(occludedResult.state, SQUAT_STATES.UNKNOWN);

const lowConfLandmarks = createMockPose(170);
lowConfLandmarks[25].visibility = 0.1; // occluded knee
const lowConfResult = counterOccluded.processFrame(lowConfLandmarks, 100);
assert.strictEqual(lowConfResult.repetitionCount, 0);
console.log('✓ Test 6: Occluded landmarks handled gracefully without crashing (Passed)');

console.log('--- All SquatCounter acceptance tests passed 100%! ---');
