# HiperMove — 5-Minute Hackathon Demo Script

This script provides a structured walkthrough for recording the 5-minute hackathon submission video.

---

## Video Outline & Timing Breakdown

- **0:00 – 1:00: Problem, Core Principle & Architecture**
- **1:00 – 2:00: In-Browser Video Loading & MediaPipe Pose Estimation**
- **2:00 – 3:15: Deterministic Squat Repetition Counter (FSM in Action)**
- **3:15 – 4:15: Results Dashboard & Gemma AI Session Summary**
- **4:15 – 5:00: Privacy, Honest Limitations, and Future Roadmap**

---

## Detailed Script & Actions

### 0:00 – 1:00 | Introduction & Architecture
- **Screen:** Show HiperMove homepage at `http://localhost:3000/`.
- **Spoken:**
  > "Hi everyone, this is HiperMove — an AI-assisted movement and mobility assistant built for the hackathon. 
  > Many fitness apps attempt to feed raw video to expensive large language models, leading to high latency, privacy concerns, and hallucinated repetition counts.
  > HiperMove follows a strict product principle:
  > **Computer vision estimates landmarks locally in the browser; deterministic code calculates repetition counts and joint angles; and Gemma 4 explains the calculated results.**
  > Zero video or image data is ever sent to our backend or cloud servers."

---

### 1:00 – 2:00 | Video Loading & MediaPipe Vision
- **Screen:** Click **"Load Demo Squat Video"** (or drag and drop your own clip).
- **Spoken:**
  > "In Section 1, users can upload their squat video or load our built-in demo clip. The client enforces strict boundary checks: rejecting files over 25 MB, clips over 60 seconds, or unsupported codecs, releasing memory automatically upon reset.
  > Once loaded, the video displays alongside our synchronized skeleton canvas powered by Google's MediaPipe Pose Landmarker running on WebAssembly and WebGL."

---

### 2:00 – 3:15 | Continuous Video Tracking & Squat Counter
- **Screen:** Click **"▶ Start Analysis"**. Watch the skeleton track the lifter. Point out the live knee angle tag and the FSM state changing.
- **Spoken:**
  > "As we click Start Analysis, MediaPipe tracks 33 body landmarks at a steady 15 frames per second without blocking the main UI thread. Notice our letterbox-aware projection ensures the overlay remains 100% aligned even if we resize the browser window.
  > Now look at Card 3 on the right. Rather than asking an AI to guess if that was a squat, a deterministic finite state machine calculates the 2D flexion angle between the hip, knee, and ankle:
  > - At the top, the state is `STANDING` (angle $\ge 155^\circ$).
  > - As the lifter drops below $145^\circ$, the state transitions to `DESCENDING`.
  > - When the knee angle crosses below $100^\circ$, it enters `BOTTOM`, registering a valid squat depth.
  > - A hysteresis band ensures holding the bottom position never increments repetitions repeatedly.
  > - Only upon ascending and returning upright does the counter increment to 1."

---

### 3:15 – 4:15 | Results Dashboard & Gemma 4 AI Summary
- **Screen:** The video ends. The right-hand panel switches to the **"Summary"** tab. Click **"Generate AI Summary"**.
- **Spoken:**
  > "When the clip finishes, HiperMove automatically presents the Results Dashboard:
  > - Exactly 1 completed repetition
  > - Average bottom depth of 85°
  > - 100% usable landmark coverage
  > - A detailed repetition log with cycle duration.
  > Users can export these verified metrics to JSON with one click.
  > Now in Card 4, we click **Generate AI Summary**. Our Express backend evaluates only the calculated numeric metrics using Gemma via the Google GenAI SDK.
  > Gemma translates these numbers into a clear, concise, non-medical summary explaining that depth and completion were achieved, while reminding the user of the influence of camera angles."

---

### 4:15 – 5:00 | Honest Limitations, Privacy & Conclusion
- **Screen:** Scroll down to the Honest Limitations banner and README.
- **Spoken:**
  > "To ensure responsible AI deployment:
  > 1. Privacy is guaranteed: video analysis runs 100% locally in the user's browser.
  > 2. We explicitly avoid unvalidated 'form scores' or medical injury predictions.
  > 3. Limitations are stated transparently: camera angles and clothing contrast can affect landmark estimates.
  > In the future, we plan to support multiple movement types and real-time webcam coaching.
  > Thank you for exploring HiperMove!"
