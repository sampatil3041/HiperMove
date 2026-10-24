# HiperMove — AI Movement & Mobility Assistant

HiperMove is a local-first, AI-assisted movement and mobility prototype designed to analyze exercise videos (squats), visualize 33 body-pose landmarks, count repetitions using deterministic geometric logic, and generate concise plain-language session summaries powered by Gemma 4 through the Google Gen AI SDK.

---

## Core Principle

> **Computer vision estimates landmarks; deterministic code calculates repetitions and metrics; the language model explains the calculated results.**
>
> Zero video or image data is ever sent to the cloud. Video processing runs 100% locally in the browser. Only verified numeric metrics are sent to the backend for AI session explanations.

---

## Architecture Overview

```text
[Local Video / WebM / MP4]
           │
           ▼
[HTML5 Video Player + Validation]
           │
           ▼
[@mediapipe/tasks-vision (Browser WASM/GPU)] ──► [Canvas Skeleton Overlay]
           │ (33 Normalized Landmarks)
           ▼
[Deterministic Squat FSM Counter] ───────────► [Results Dashboard]
 (Knee Flexion Angle & Hysteresis)                   │
                                                     │ (Aggregated Numbers Only)
                                                     ▼
                                          [Node.js / Express Backend]
                                                     │
                                                     ▼
                                          [Gemma 4 / Google Gen AI]
```

### Technology Stack
- **Frontend:** React 18, Vite 5, JavaScript (ESM), Canvas 2D API.
- **Computer Vision:** `@mediapipe/tasks-vision` (Pose Landmarker running locally via WebAssembly and WebGL/GPU).
- **Repetition Logic:** Pure deterministic Finite State Machine (Hip-Knee-Ankle 2D vector calculation).
- **Backend:** Node.js (v20+), Express.js.
- **AI Summary:** Google Gen AI SDK (`@google/genai`) accessing Gemma 4 / Gemini API.

---

## Directory Structure

```text
hipermove/
├── frontend/
│   ├── public/
│   │   ├── models/                 # Official pose_landmarker_lite.task (5.5 MB)
│   │   └── samples/                # Built-in sample squat demonstration video
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoUploader.jsx   # Drag-and-drop & file picker with demo video loader
│   │   │   ├── VideoPreview.jsx    # Video player & file metadata overview
│   │   │   ├── PoseOverlay.jsx     # Synchronized skeleton canvas overlay & controls
│   │   │   ├── ResultsDashboard.jsx# Completed metrics, depth summary & JSON export
│   │   │   ├── AISummaryCard.jsx   # Gemma 4 explanation card with dual-mode fallback
│   │   │   └── StatusMessage.jsx   # Accessible alert banners
│   │   ├── hooks/
│   │   │   └── usePoseDetection.js # MediaPipe lifecycle & continuous frame loop
│   │   ├── services/
│   │   │   └── poseLandmarker.js   # Singleton Landmarker instance & canvas drawing
│   │   ├── utils/
│   │   │   ├── videoValidation.js  # Size (25MB), duration (60s), and format validation
│   │   │   ├── squatCounter.js     # Pure deterministic squat FSM & angle formulas
│   │   │   └── movementMetrics.js  # Metric aggregator & payload builder
│   │   ├── styles/
│   │   │   └── global.css          # Modern dark slate fitness theme
│   │   ├── App.jsx                 # Central application state and layout
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── analysis.js         # Validated POST /api/analysis/summary endpoint
│   │   │   └── analysis.test.mjs   # Automated API schema and route tests
│   │   ├── services/
│   │   │   └── gemmaService.js     # Google GenAI Gemma 4 integration & mock fallback
│   │   └── server.js               # Express application entry point
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
├── docs/
│   ├── TESTING.md                  # Comprehensive verification & test matrix report
│   └── DEMO_SCRIPT.md              # 5-minute hackathon presentation script
├── .gitignore
└── README.md
```

---

## Quick Start Guide

### Prerequisites
- Node.js `v20.x` or higher
- npm `10.x` or higher

### 1. Start the Backend Server (Port 3001)
```bash
cd backend
npm install
npm start
```
- Health check available at: `http://localhost:3001/api/health`
- *(Optional)* To enable live Gemma 4 responses, copy `.env.example` to `.env` and configure your key:
  ```bash
  cp .env.example .env
  # Add your GEMINI_API_KEY inside .env
  ```
  *(If no key is configured, the backend automatically provides a clearly-labeled local mock response for UI testing).*

### 2. Start the Frontend Application (Port 3000)
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Running Automated Tests

Run the deterministic test suites directly:

```bash
# 1. Video validation tests
cd frontend && node src/utils/videoValidation.test.mjs

# 2. Squat counter finite state machine tests
cd frontend && node src/utils/squatCounter.test.mjs

# 3. Backend API route and schema validation tests
cd backend && node src/routes/analysis.test.mjs

# 4. Frontend production bundle build verification
cd frontend && npm run build
```

---

## Step-by-Step Demo Walkthrough

1. Open **[http://localhost:3000](http://localhost:3000)**.
2. In **1. Upload Video**, click **"Load Demo Squat Video"** (or upload your own squat clip).
3. In **2. Pose Estimation & Video Analysis**, click **"▶ Start Analysis"**.
4. Observe the synchronized skeleton overlay tracking the lifter in real time, with the live knee angle tag displayed beside the knee.
5. In **3. Movement Analysis & Results**, observe the FSM state cycle through `STANDING` $\rightarrow$ `DESCENDING` $\rightarrow$ `BOTTOM` $\rightarrow$ `ASCENDING` $\rightarrow$ `STANDING` with the completed repetition count incrementing to `1`.
6. Once the video ends, review the **Results Dashboard** showing average depth, deepest angle, and landmark coverage ratio. Click **"⬇ Export JSON"** to download the metrics file.
7. In **4. AI Session Summary**, click **"Generate AI Summary"** to receive the plain-language explanation powered by Gemma 4.

---

## Honest Limitations & Disclaimer

- **Camera Angle:** Measurements assume a sagittal (side profile) or 45-degree angle. Pure frontal camera views compress 2D perspective and can under-estimate joint flexion.
- **Lighting and Clothing:** Very loose clothing or dark backgrounds can reduce landmark confidence scores.
- **Non-Medical Use:** HiperMove is an educational and hackathon technology prototype. It is not a medical device, clinical diagnostic tool, or certified personal coaching replacement.

---

## Attributions & Open Source Licenses

- **MediaPipe Pose Landmarker:** Developed by Google, distributed under the Apache-2.0 License.
- **Sample Demonstration Video:** Wikimedia Commons ([File:Squat_-_exercise_demonstration_video.webm](https://commons.wikimedia.org/wiki/File:Squat_-_exercise_demonstration_video.webm)), distributed under Creative Commons Attribution-ShareAlike (CC-BY-SA).
- **Google Gen AI SDK:** `@google/genai` by Google, distributed under the Apache-2.0 License.
