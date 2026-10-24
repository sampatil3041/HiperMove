import React, { useState, useRef } from 'react';

/**
 * Drag-and-drop & file picker component for video inputs
 * @param {{
 *   onFileSelected: (file: File) => void,
 *   isValidating: boolean,
 *   disabled?: boolean
 * }} props
 */
export default function VideoUploader({ onFileSelected, isValidating, disabled = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isValidating && !isLoadingSample) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isValidating || isLoadingSample) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileSelected(file);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileSelected(file);
      e.target.value = '';
    }
  };

  const handleClickBrowse = () => {
    if (!disabled && !isValidating && !isLoadingSample && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleLoadSampleVideo = async (e) => {
    e.stopPropagation();
    if (disabled || isValidating || isLoadingSample) return;

    setIsLoadingSample(true);
    try {
      const response = await fetch('/samples/squat_sample.webm');
      if (!response.ok) {
        throw new Error(`Failed to load sample video (HTTP ${response.status})`);
      }
      const blob = await response.blob();
      const sampleFile = new File([blob], 'sample_squat_demo.webm', { type: 'video/webm' });
      onFileSelected(sampleFile);
    } catch (err) {
      console.error('Error loading sample video:', err);
      alert(`Could not load sample video: ${err.message}`);
    } finally {
      setIsLoadingSample(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClickBrowse}
      style={{
        border: `2px dashed ${isDragOver ? '#38bdf8' : '#334155'}`,
        borderRadius: '12px',
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        backgroundColor: isDragOver ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.6)',
        cursor: disabled || isValidating || isLoadingSample ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        userSelect: 'none'
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
        disabled={disabled || isValidating || isLoadingSample}
      />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}
        >
          {isValidating || isLoadingSample ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
        </div>

        <div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
            {isValidating
              ? 'Validating video file...'
              : isLoadingSample
              ? 'Loading built-in demo video...'
              : 'Choose a video or drag & drop here'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            Supported: <strong>MP4, WebM</strong> &bull; Max <strong>25 MB</strong> &bull; Max <strong>60 seconds</strong>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Recommended: 10–30s side or angled view with the entire body visible
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            disabled={disabled || isValidating || isLoadingSample}
            onClick={(e) => {
              e.stopPropagation();
              handleClickBrowse();
            }}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: disabled || isValidating || isLoadingSample ? 'not-allowed' : 'pointer',
              opacity: disabled || isValidating || isLoadingSample ? 0.6 : 1
            }}
          >
            Browse files
          </button>

          <button
            type="button"
            disabled={disabled || isValidating || isLoadingSample}
            onClick={handleLoadSampleVideo}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: disabled || isValidating || isLoadingSample ? 'not-allowed' : 'pointer',
              opacity: disabled || isValidating || isLoadingSample ? 0.6 : 1
            }}
          >
            {isLoadingSample ? 'Loading Demo...' : 'Load Demo Squat Video'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
