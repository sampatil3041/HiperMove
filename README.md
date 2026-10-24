# HiperMove — AI Movement & Mobility Assistant

HiperMove is an AI-assisted movement and mobility prototype designed to analyze short exercise videos (squats), visualize 33 body-pose landmarks, count completed repetitions using deterministic logic, and generate an AI-assisted plain-language summary of the calculated results.

## Project Architecture

- **Frontend:** React + Vite (located in `frontend/`)
- **Pose Landmarker:** `@mediapipe/tasks-vision` (browser-side execution)
- **Squat Counter:** Deterministic Finite State Machine (pure application logic)
- **Backend:** Node.js + Express (located in `backend/`)
- **AI Summary:** Gemma 4 via Gemini API (Phase 8 — evaluates calculated metrics only)

## Directory Structure

```text
hipermove/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoUploader.jsx
│   │   │   ├── VideoPreview.jsx
│   │   │   ├── PoseOverlay.jsx
│   │   │   ├── ResultsDashboard.jsx
│   │   │   └── StatusMessage.jsx
│   │   ├── hooks/
│   │   │   └── usePoseDetection.js
│   │   ├── services/
│   │   │   └── poseLandmarker.js
│   │   ├── utils/
│   │   │   ├── videoValidation.js
│   │   │   ├── squatCounter.js
│   │   │   └── movementMetrics.js
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   └── server.js
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
├── docs/                     # Testing & Demo resources
├── .gitignore
└── README.md
```

## Quick Start Guide

### 1. Start the Backend Server (Port 3001)
```bash
cd backend
npm install
npm start
```
Health check endpoint: `http://localhost:3001/api/health`

### 2. Start the Frontend Application (Port 3000)
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

## Honest Limitations

- Measurements depend heavily on camera angle, distance, lighting, and clothing contrast.
- Single-person view is expected (side or 45-degree angle recommended).
- This application is an educational and hackathon prototype, not a medical or clinical assessment tool.
