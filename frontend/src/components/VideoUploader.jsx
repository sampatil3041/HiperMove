
import React, { useRef, useState } from 'react';

export default function VideoUploader({
  onFileSelected,
  isValidating = false,
  disabled = false
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState('');

  const isBusy = disabled || isValidating;

  const selectFile = (file) => {
    setLocalError('');

    if (!file) return;

    const allowedExtensions = /\.(mp4|webm|mov|m4v)$/i;

    if (
      !allowedExtensions.test(file.name) &&
      !file.type.startsWith('video/')
    ) {
      setLocalError('Please select a supported video file, such as MP4 or WebM.');
      return;
    }

    onFileSelected(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    if (isBusy) return;

    selectFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
        hidden
        onChange={(event) => {
          selectFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <button
        type="button"
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isBusy) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          width: '100%',
          minHeight: '210px',
          padding: '1.5rem',
          borderRadius: '16px',
          border: `2px dashed ${
            isDragging ? '#5278f5' : 'rgba(145, 163, 196, 0.5)'
          }`,
          background: isDragging
            ? 'rgba(82, 120, 245, 0.09)'
            : 'rgba(255, 255, 255, 0.65)',
          color: '#34445f',
          cursor: isBusy ? 'not-allowed' : 'pointer',
          textAlign: 'center',
          transition: 'all 0.2s ease',
          opacity: isBusy ? 0.7 : 1
        }}
      >
        <span style={{ fontSize: '2.2rem' }} aria-hidden="true">
          {isValidating ? '⏳' : '📁'}
        </span>

        <strong style={{ fontSize: '1rem' }}>
          {isValidating ? 'Validating video...' : 'Choose a squat video'}
        </strong>

        <span style={{ fontSize: '0.85rem', color: '#728098' }}>
          {isValidating
            ? 'Please wait while we check your video.'
            : 'Click to browse or drag and drop a file here.'}
        </span>

        <span
          style={{
            padding: '0.55rem 0.9rem',
            borderRadius: '9px',
            background: '#5278f5',
            color: '#fff',
            fontSize: '0.82rem',
            fontWeight: 650
          }}
        >
          Browse Videos
        </span>
      </button>

      <p style={{ margin: 0, color: '#728098', fontSize: '0.78rem' }}>
        Recommended: MP4 or WebM, up to 25 MB and 60 seconds. Actual format
        support depends on your browser.
      </p>

      {localError && (
        <p
          role="alert"
          style={{
            margin: 0,
            color: '#b4233b',
            fontSize: '0.85rem'
          }}
        >
          {localError}
        </p>
      )}
    </div>
  );
}
