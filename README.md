# HiperMove — AI Movement & Mobility Assistant

HiperMove is an AI-assisted movement and mobility prototype designed to analyze short exercise videos (squats), visualize 33 body-pose landmarks, count completed repetitions using deterministic logic, and generate an AI-assisted plain-language summary of the calculated results.

## Project Architecture

- **Frontend:** React + Vite (located in `frontend/`)
- **Pose Landmarker:** `@mediapipe/tasks-vision` (browser-side execution)
- **Squat Counter:** Deterministic Finite State Machine (pure application logic)
- **Backend:** Node.js + Express (located in `backend/` — introduced in Phase 7)
- **AI Summary:** Gemma 4 via Gemini API (evaluates calculated metrics only)

## Directory Structure

```text
hipermove/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/                  # Phase 7
├── docs/                     # Testing & Demo resources
├── .gitignore
└── README.md
```

## Quick Start (Frontend)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the displayed local URL (default: `http://localhost:3000`).

## Honest Limitations

- Measurements depend heavily on camera angle, distance, lighting, and clothing contrast.
- Single-person view is expected (side or 45-degree angle recommended).
- This application is an educational and hackathon prototype, not a medical or clinical assessment tool.
