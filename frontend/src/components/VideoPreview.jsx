import React, { useRef, useEffect } from 'react';

/**
 * Video preview and metadata inspector component
 * @param {{
 *   videoUrl: string,
 *   metadata: {
 *     name: string,
 *     sizeFormatted: string,
 *     durationFormatted: string,
 *     width: number,
 *     height: number,
 *     aspectRatio: string,
 *     type: string
 *   },
 *   onReplaceVideo: () => void,
 *   isAnalyzing?: boolean
 * }} props
 */
export default function VideoPreview({
  videoUrl,
  metadata,
  onReplaceVideo,
  isAnalyzing = false,
  onVideoElementReady
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && onVideoElementReady) {
      onVideoElementReady(videoRef.current);
    }
  }, [videoUrl, onVideoElementReady]);

  if (!videoUrl || !metadata) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Video Player */}
      <div
        style={{
          position: 'relative',
          backgroundColor: '#000000',
          borderRadius: '10px',
          overflow: 'hidden',
          aspectRatio: `${metadata.width} / ${metadata.height}`,
          maxHeight: '420px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #334155'
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      </div>

      {/* Metadata Overview Card */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          fontSize: '0.85rem'
        }}
      >
        <div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>File Name</div>
          <div
            style={{
              fontWeight: 500,
              color: '#f8fafc',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title={metadata.name}
          >
            {metadata.name}
          </div>
        </div>

        <div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Duration</div>
          <div style={{ fontWeight: 600, color: '#38bdf8' }}>
            {metadata.durationFormatted}
          </div>
        </div>

        <div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>File Size</div>
          <div style={{ fontWeight: 500, color: '#f8fafc' }}>
            {metadata.sizeFormatted}
          </div>
        </div>

        <div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Resolution</div>
          <div style={{ fontWeight: 500, color: '#f8fafc' }}>
            {metadata.width} &times; {metadata.height}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={onReplaceVideo}
          disabled={isAnalyzing}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            border: '1px solid #475569',
            color: '#cbd5e1',
            borderRadius: '6px',
            fontSize: '0.85rem',
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
            opacity: isAnalyzing ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!isAnalyzing) e.currentTarget.style.borderColor = '#94a3b8';
          }}
          onMouseLeave={(e) => {
            if (!isAnalyzing) e.currentTarget.style.borderColor = '#475569';
          }}
        >
          &larr; Choose Different Video
        </button>

        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 500 }}>
          &#10003; Video validated and ready for analysis
        </span>
      </div>
    </div>
  );
}
