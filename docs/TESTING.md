# HiperMove — Verification & Testing Report

This document records the automated tests, verification suites, and manual testing procedures conducted for the HiperMove prototype in accordance with Section 14 of the Product Requirements Document (PRD).

---

## 1. Automated Test Suites

The project includes deterministic unit tests that run in Node.js without requiring a browser or network connection.

### A. Video Validation & Boundary Suite
- **File:** [`frontend/src/utils/videoValidation.test.mjs`](file:///Users/samarthpatil/Desktop/hipermove/frontend/src/utils/videoValidation.test.mjs)
- **Command:** `node src/utils/videoValidation.test.mjs`
- **Results:**
  - `✓ formatFileSize tests passed` (0 B, 500 B, 1 MB, 25 MB boundary formatting)
  - `✓ formatDuration tests passed` (0.0s, 15.4s, 1:00, 1:15 mm:ss formatting)
  - `✓ Oversized file (>25MB) rejection passed` (26 MB file rejected with descriptive error)
  - `✓ Empty file (0 bytes) rejection passed` (0 byte file rejected)
  - `✓ Invalid format (.avi) rejection passed` (Non-MP4/WebM rejected)
  - `✓ Valid MP4 accepted` (Standard MP4 passed validation)
  - `✓ Valid WebM accepted` (Standard WebM passed validation)

### B. Squat Counter Finite State Machine (FSM) Suite
- **File:** [`frontend/src/utils/squatCounter.test.mjs`](file:///Users/samarthpatil/Desktop/hipermove/frontend/src/utils/squatCounter.test.mjs)
- **Command:** `node src/utils/squatCounter.test.mjs`
- **Results:**
  - `✓ calculateAngle geometric calculations passed` (Exact 90° and 180° vector calculations)
  - `✓ Test 1: No-squat video produces 0 repetitions` (Standing still at 170° for 30 frames remains in STANDING with 0 reps)
  - `✓ Test 2: One full squat counts exactly 1 with minDepth 85°` (Descent to 85° followed by return to 168° increments count to 1)
  - `✓ Test 3: Multiple consecutive squats counts exactly 3` (3 down-and-up cycles increment count to exactly 3)
  - `✓ Test 4: Extended pause at bottom increments only once upon standing` (Holding bottom position at 82° for 20 frames produces 0 increments until the user returns to standing)
  - `✓ Test 5: Partial squat does not count as completed cycle` (Knee flexes to 120° and returns to standing without reaching the 100° bottom threshold; count remains 0)
  - `✓ Test 6: Occluded landmarks handled gracefully without crashing` (Null landmarks and low confidence (< 0.45) maintain safe state without exception)

### C. Backend API Route & Schema Validation Suite
- **File:** [`backend/src/routes/analysis.test.mjs`](file:///Users/samarthpatil/Desktop/hipermove/backend/src/routes/analysis.test.mjs)
- **Command:** `node src/routes/analysis.test.mjs`
- **Results:**
  - `✓ Rejection of missing/invalid exerciseType passed` (400 Bad Request)
  - `✓ Rejection of video payload passed` (400 Bad Request — verifies zero video uploads policy)
  - `✓ Valid metrics successfully generated summary` (200 OK — dual-mode support verified)

---

## 2. Test Video Matrix (PRD Section 14)

| Test Case | Video Input Condition | Expected Behavior | Observed Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Case 1: Standard Squat** | 1 full squat (built-in demo) | Detects pose, reaches $\le 100^\circ$, returns $\ge 155^\circ$, counts 1 | Count: 1, Lowest Angle: $85^\circ$, Usable: 100% | **PASS** |
| **Case 2: Multiple Squats** | 3 consecutive full squats | Counts 3 without double increments | Count: 3, 3 log entries in Rep History | **PASS** |
| **Case 3: No Movement** | Person standing still | Tracks pose, remains in `STANDING`, counts 0 | Count: 0, State: `STANDING` | **PASS** |
| **Case 4: Partial Squat** | Descent stops at $120^\circ$ | Never enters `BOTTOM`, returns to standing, counts 0 | Count: 0, State: transitions to `STANDING` with 0 reps | **PASS** |
| **Case 5: Paused at Bottom** | Lifter holds bottom squat for 2s | Does not increment repeatedly while stationary at bottom | Count remains 0 until standing, then increments to 1 | **PASS** |
| **Case 6: Missing / Occluded** | Person steps out of frame | Degrades to `UNKNOWN` or keeps previous state, zero crash | HUD shows searching/usable ratio drops, no unhandled exception | **PASS** |
| **Case 7: Unsupported File** | `.avi` or `.mov` or corrupt file | Immediate client validation error, player not mounted | Alert banner appears: "Unsupported file format" | **PASS** |
| **Case 8: Oversized Video** | File $> 25$ MB | Immediate rejection with human-readable file size | Alert banner appears: "File size exceeds 25 MB limit" | **PASS** |

---

## 3. Honest Limitations & Edge Cases

1. **Camera Angle Sensitivity:** The 2D joint angle formula assumes a sagittal (side profile) or 45-degree perspective. Pure frontal camera views compress depth perspective and can lead to under-measured knee flexion.
2. **Clothing Contrast & Loose Attire:** Very baggy pants or dark backgrounds with low lighting can reduce MediaPipe confidence scores for knees and ankles. The app handles this by dropping unusable frames rather than inventing coordinates.
3. **Framerate Requirements:** Recommended video framerate is 24–30 FPS. Videos recorded under 10 FPS may miss rapid turnaround at the bottom position.
4. **Demonstration Scope:** This application is strictly an educational fitness prototype and does not provide medical diagnosis, clinical assessment, or certified coaching advice.
