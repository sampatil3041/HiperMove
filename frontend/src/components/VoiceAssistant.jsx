
import React, { useEffect, useRef, useState } from 'react';

export default function VoiceAssistant({ metrics, sessionSummary }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [speakReplies, setSpeakReplies] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const metricsRef = useRef({ metrics, sessionSummary });
  const speakRepliesRef = useRef(speakReplies);
  const speechQueueRef = useRef([]);
  const speechIndexRef = useRef(0);
  const speechRunRef = useRef(0);

  metricsRef.current = { metrics, sessionSummary };
  speakRepliesRef.current = speakReplies;

  const formatValue = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      (typeof value === 'number' && !Number.isFinite(value))
    ) {
      return 'Not available yet';
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? String(value) : value.toFixed(1);
    }

    return String(value);
  };

  // Break long replies into short, natural speech segments.
  const splitIntoChunks = (text, maxLength = 180) => {
    const sentences = String(text)
      .match(/[^.!?]+[.!?]*|[^.!?]+$/g) || [String(text)];

    const chunks = [];
    let current = '';

    for (const sentence of sentences) {
      const part = sentence.trim();
      if (!part) continue;

      if (part.length > maxLength) {
        if (current) {
          chunks.push(current);
          current = '';
        }

        const words = part.split(/\s+/);
        let wordChunk = '';

        for (const word of words) {
          if ((wordChunk + ' ' + word).trim().length > maxLength) {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = word;
          } else {
            wordChunk = (wordChunk + ' ' + word).trim();
          }
        }

        if (wordChunk) chunks.push(wordChunk);
        continue;
      }

      if ((current + ' ' + part).trim().length > maxLength) {
        if (current) chunks.push(current);
        current = part;
      } else {
        current = (current + ' ' + part).trim();
      }
    }

    if (current) chunks.push(current);
    return chunks;
  };

  const stopSpeaking = () => {
    // Invalidate any callbacks from previous speech.
    speechRunRef.current += 1;
    speechQueueRef.current = [];
    speechIndexRef.current = 0;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  };

  const speakNextChunk = (runId) => {
    if (runId !== speechRunRef.current) return;

    if (!speakRepliesRef.current || !('speechSynthesis' in window)) {
      setIsSpeaking(false);
      return;
    }

    const queue = speechQueueRef.current;
    const index = speechIndexRef.current;

    if (index >= queue.length) {
      setIsSpeaking(false);
      speechQueueRef.current = [];
      speechIndexRef.current = 0;
      return;
    }

    const utterance = new SpeechSynthesisUtterance(queue[index]);

    utterance.lang = 'en-IN';
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      if (runId !== speechRunRef.current) return;

      speechIndexRef.current += 1;
      speakNextChunk(runId);
    };

    utterance.onerror = (event) => {
      if (runId !== speechRunRef.current) return;

      console.error('Speech synthesis error:', event.error);

      // Try the next chunk if the current chunk fails.
      speechIndexRef.current += 1;
      speakNextChunk(runId);
    };

    window.speechSynthesis.speak(utterance);
  };

  const speakResponse = (text) => {
    if (!speakRepliesRef.current || !('speechSynthesis' in window)) {
      return;
    }

    stopSpeaking();

    speechQueueRef.current = splitIntoChunks(text);
    speechIndexRef.current = 0;

    const runId = speechRunRef.current;
    setIsSpeaking(true);

    // Start speech on the next event-loop turn after cancel().
    window.setTimeout(() => {
      if (runId === speechRunRef.current) {
        speakNextChunk(runId);
      }
    }, 150);
  };

  const answerCommand = (spokenText) => {
    const command = spokenText.toLowerCase().replace(/[?.!,]/g, '').trim();
    const { metrics: currentMetrics, sessionSummary: summary } =
      metricsRef.current;

    if (/\b(help|what can you do|available commands)\b/.test(command)) {
      return (
        'You can ask how many squats you did, your current knee angle, ' +
        'your best depth, your squat state, or for a session summary.'
      );
    }

    if (
      /\b(session summary|summarize|summary of my session|how was my session)\b/.test(
        command
      )
    ) {
      if (!summary || Object.keys(summary).length === 0) {
        return 'Your session summary is not available yet. Analyze a video first.';
      }

      const entries = Object.entries(summary).filter(
        ([, value]) =>
          value !== null &&
          value !== undefined &&
          ['string', 'number', 'boolean'].includes(typeof value)
      );

      if (entries.length === 0) {
        return 'Your session summary does not contain any reportable metrics yet.';
      }

      return (
        'Here is your session summary. ' +
        entries
          .map(
            ([key, value]) =>
              `${key
                .replace(/([A-Z])/g, ' $1')
                .replace(/[_-]/g, ' ')}: ${formatValue(value)}`
          )
          .join('. ') +
        '.'
      );
    }

    if (/\b(best depth|deepest squat|lowest depth)\b/.test(command)) {
      const depth = currentMetrics?.bestDepth;

      return depth !== null && depth !== undefined && depth !== 0
        ? `Your recorded best squat depth angle is ${formatValue(depth)} degrees.`
        : 'Your best depth has not been recorded yet. Analyze a squat video first.';
    }

    if (
      /\b(current angle|knee angle|joint angle|angle right now)\b/.test(command)
    ) {
      const angle = currentMetrics?.currentAngle;

      return angle !== null && angle !== undefined
        ? `Your current recorded knee angle is ${formatValue(angle)} degrees.`
        : 'A knee angle is not available yet. Start analyzing your video first.';
    }

    if (/\b(state|position|movement state)\b/.test(command)) {
      return currentMetrics?.state
        ? `Your current squat state is ${currentMetrics.state}.`
        : 'Your squat state is not available yet.';
    }

    if (/\b(how many|number of|count|repetitions|reps|squats)\b/.test(command)) {
      const count = currentMetrics?.repetitionCount;

      return typeof count === 'number'
        ? `Your current recorded squat count is ${count}.`
        : 'Your squat count is not available yet.';
    }

    return (
      'I did not recognize that command yet. Say help to hear ' +
      'the commands I currently support.'
    );
  };

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Try Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const resultText = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalText += resultText;
        } else {
          interimText += resultText;
        }
      }

      if (finalText.trim()) {
        const recognizedText = finalText.trim();
        const answer = answerCommand(recognizedText);

        setTranscript(recognizedText);
        setResponse(answer);
        speakResponse(answer);
      } else if (interimText.trim()) {
        setTranscript(interimText.trim());
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);

      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Allow microphone access in browser settings.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;

      try {
        recognition.stop();
      } catch {
        // Recognition may already be stopped.
      }

      stopSpeaking();
      recognitionRef.current = null;
    };
  }, []);

  const toggleListening = () => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      setError('Speech recognition is unavailable in this browser.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    stopSpeaking();
    setTranscript('');
    setResponse('');
    setError('');

    try {
      recognition.start();
    } catch {
      setError('Could not start listening. Please try again.');
    }
  };

  const toggleSpokenReplies = () => {
    setSpeakReplies((enabled) => {
      const nextValue = !enabled;

      if (!nextValue) {
        stopSpeaking();
      }

      return nextValue;
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Close voice assistant' : 'Open voice assistant'}
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
          cursor: 'pointer',
          zIndex: 1000,
          display: 'grid',
          placeItems: 'center',
          fontSize: '25px',
        }}
      >
        {isOpen ? '×' : '🎤'}
      </button>

      {isOpen && (
        <section
          role="dialog"
          aria-label="HiperMove Voice Assistant"
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '96px',
            width: 'min(350px, calc(100vw - 32px))',
            padding: '20px',
            borderRadius: '22px',
            background: 'rgba(255, 255, 255, 0.97)',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.18)',
            backdropFilter: 'blur(18px)',
            zIndex: 999,
            color: '#0f172a',
            fontFamily: 'inherit',
          }}
        >
          <h3 style={{ margin: '0 0 6px', fontSize: '18px' }}>
            HiperMove Assistant
          </h3>

          <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>
            Ask me about your movement session.
          </p>

          <div
            style={{
              padding: '10px',
              marginBottom: '10px',
              borderRadius: '12px',
              background: '#f1f5f9',
              fontSize: '13px',
              lineHeight: 1.5,
              overflowWrap: 'anywhere',
            }}
          >
            <strong>You said:</strong>
            <div aria-live="polite">
              {transcript || 'Your recognized speech will appear here.'}
            </div>
          </div>

          <div
            style={{
              minHeight: '65px',
              padding: '12px',
              borderRadius: '12px',
              background: '#eef2ff',
              color: '#263b80',
              fontSize: '14px',
              lineHeight: 1.5,
              overflowWrap: 'anywhere',
            }}
          >
            <strong>Assistant:</strong>
            <div aria-live="polite">
              {response || 'Ask about your squat count, knee angle, or session summary.'}
            </div>
          </div>

          <button
            type="button"
            onClick={toggleSpokenReplies}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '10px',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              background: speakReplies ? '#ecfdf5' : '#f8fafc',
              color: '#334155',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {speakReplies ? '🔊 Spoken Replies: On' : '🔇 Spoken Replies: Off'}
          </button>

          {isSpeaking && (
            <p style={{ fontSize: '12px', color: '#2563eb', marginBottom: 0 }}>
              Speaking your answer…
            </p>
          )}

          {error && (
            <p style={{ color: '#dc2626', fontSize: '12px', marginBottom: 0 }}>
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={toggleListening}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '12px',
              border: 'none',
              borderRadius: '12px',
              background: isListening ? '#dc2626' : '#2563eb',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isListening ? '■ Stop Listening' : '🎤 Start Listening'}
          </button>

          <p style={{ margin: '12px 0 0', fontSize: '11px', color: '#64748b' }}>
            English (India) · Voice assistant
          </p>
        </section>
      )}
    </>
  );
}
