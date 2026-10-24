import React from 'react';

export default function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1 className="brand-title">HiperMove</h1>
          <p className="brand-subtitle">
            AI Movement & Mobility Assistant — Squat Analysis MVP
          </p>
        </div>
        <div>
          <span className="badge-tag">Phase 1: Project Scaffold Active</span>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="left-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Phase 2: Video Upload & Preview Component */}
          <div className="card">
            <h2 className="card-title">1. Upload Video</h2>
            <p className="card-desc">
              Upload a short squat video (MP4/WebM, &le; 25MB, &le; 60 seconds).
            </p>
            <div className="placeholder-box">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto', color: '#64748b' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p>Video uploader and preview will be implemented in Phase 2.</p>
            </div>
          </div>

          {/* Phase 3 & 4: Pose Detection & Video Canvas View */}
          <div className="card">
            <h2 className="card-title">2. Pose Estimation & Video Analysis</h2>
            <p className="card-desc">
              MediaPipe Pose Landmarker estimates 33 body landmarks on sampled frames.
            </p>
            <div className="placeholder-box">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto', color: '#64748b' }}>
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                <line x1="7" y1="2" x2="7" y2="22" />
                <line x1="17" y1="2" x2="17" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="2" y1="7" x2="7" y2="7" />
                <line x1="2" y1="17" x2="7" y2="17" />
                <line x1="17" y1="17" x2="22" y2="17" />
                <line x1="17" y1="7" x2="22" y2="7" />
              </svg>
              <p>Synchronized video & pose canvas overlay will be implemented in Phases 3 and 4.</p>
            </div>
          </div>
        </section>

        <section className="right-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Phase 5 & 6: Repetition Counter & Deterministic Metrics */}
          <div className="card">
            <h2 className="card-title">3. Repetition Count & Metrics</h2>
            <p className="card-desc">
              Deterministic calculation of completed squat cycles based on knee angles.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repetitions</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.25rem' }}>0</div>
              </div>
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>State</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#94a3b8', marginTop: '0.75rem' }}>IDLE</div>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
              Finite state machine counter will be integrated in Phase 5.
            </p>
          </div>

          {/* Phase 8: Gemma 4 AI Summary */}
          <div className="card">
            <h2 className="card-title">4. AI Session Summary</h2>
            <p className="card-desc">
              Plain-language explanation of measured metrics powered by Gemma 4.
            </p>
            <div className="placeholder-box">
              <p>AI session explanation will be connected in Phase 8 via backend endpoint.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Honest Limitations & Disclaimer */}
      <footer className="disclaimer-banner">
        <div>
          <strong>Disclaimer & Honest Limitations:</strong> Estimates depend on camera angle, lighting, visibility, and video quality. This prototype uses computer vision for demonstration purposes and is not a medical device or professional coaching tool.
        </div>
      </footer>
    </div>
  );
}
