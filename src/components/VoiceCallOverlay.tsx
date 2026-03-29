// ============================================================================
// Voice Call Overlay — Playground-style voice call UI
// Replaces MessageList + MessageInput during an active voice call
// ============================================================================

import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import type { VoiceCallState } from '../types';

interface VoiceCallOverlayProps {
  state: VoiceCallState;
  assistantName: string;
  primaryColor: string;
  micVolume: number;
  playbackVolume: number;
  isMuted: boolean;
  transcript: Array<{ role: 'user' | 'assistant'; text: string }>;
  onConfirm: () => void;
  onCancel: () => void;
  onMuteToggle: () => void;
  onHangUp: () => void;
  isMobile: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Phone icon SVG
const PhoneIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
  </svg>
);

// Hang up icon
const HangUpIcon = () => (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
  </svg>
);

// Mic icon
const MicIcon = ({ muted }: { muted: boolean }) => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor">
    {muted ? (
      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
    ) : (
      <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
    )}
  </svg>
);

// Status ring animation
function StatusRing({ state, micVolume, playbackVolume, primaryColor }: {
  state: VoiceCallState;
  micVolume: number;
  playbackVolume: number;
  primaryColor: string;
}) {
  const volume = state === 'listening' ? micVolume : state === 'speaking' ? playbackVolume : 0;
  const scale = 1 + volume * 0.3;
  const opacity = state === 'connecting' ? 0.5 : 1;

  return (
    <div class="mb-voice-ring-container">
      <div
        class={`mb-voice-ring ${state === 'connecting' ? 'mb-voice-ring-pulse' : ''}`}
        style={{
          borderColor: primaryColor,
          transform: `scale(${scale})`,
          opacity,
          boxShadow: volume > 0.1 ? `0 0 ${20 * volume}px ${primaryColor}40` : 'none',
        }}
      />
      <div class="mb-voice-ring-icon" style={{ color: primaryColor }}>
        {state === 'connecting' ? (
          <div class="mb-voice-dots">
            <span style={{ backgroundColor: primaryColor }} />
            <span style={{ backgroundColor: primaryColor }} />
            <span style={{ backgroundColor: primaryColor }} />
          </div>
        ) : (
          <PhoneIcon size={32} />
        )}
      </div>
    </div>
  );
}

export function VoiceCallOverlay({
  state,
  assistantName,
  primaryColor,
  micVolume,
  playbackVolume,
  isMuted,
  transcript,
  onConfirm,
  onCancel,
  onMuteToggle,
  onHangUp,
  isMobile,
}: VoiceCallOverlayProps) {
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Call timer
  useEffect(() => {
    if (state === 'ready' || state === 'listening' || state === 'speaking') {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  // Confirmation dialog
  if (state === 'confirming') {
    return (
      <div class="mb-voice-overlay">
        <div class="mb-voice-confirm">
          <PhoneIcon size={40} />
          <h3>Start a voice conversation with {assistantName}?</h3>
          {isMobile && (
            <p class="mb-voice-mobile-warning">Please keep this page open during the call</p>
          )}
          <div class="mb-voice-confirm-buttons">
            <button class="mb-voice-btn-cancel" onClick={onCancel}>Cancel</button>
            <button class="mb-voice-btn-call" style={{ backgroundColor: primaryColor }} onClick={onConfirm}>
              <PhoneIcon size={18} /> Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Minutes exhausted
  if (state === 'exhausted') {
    return (
      <div class="mb-voice-overlay">
        <div class="mb-voice-confirm">
          <PhoneIcon size={40} />
          <h3>Voice calling unavailable</h3>
          <p>Voice calling is currently unavailable. Please try again later.</p>
          <div class="mb-voice-confirm-buttons">
            <button class="mb-voice-btn-cancel" onClick={onCancel}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div class="mb-voice-overlay">
        <div class="mb-voice-confirm">
          <h3>Call ended</h3>
          <p>The connection was lost. Please try again.</p>
          <div class="mb-voice-confirm-buttons">
            <button class="mb-voice-btn-cancel" onClick={onCancel}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // Call ended — dismiss immediately back to text chat
  // The voice messages are saved to the thread and will show in the chat history
  if (state === 'ended') {
    // Auto-dismiss after a brief moment
    useEffect(() => {
      const t = setTimeout(onCancel, 500);
      return () => clearTimeout(t);
    }, []);
    return (
      <div class="mb-voice-overlay">
        <div class="mb-voice-confirm">
          <h3>Call ended</h3>
          <p>Duration: {formatDuration(duration)}</p>
        </div>
      </div>
    );
  }

  // Active call (loading, connecting, ready, listening, speaking)
  // Centred mic visualiser, no live transcript
  const statusText = {
    loading: 'Loading...',
    connecting: 'Connecting...',
    ready: 'Connected',
    listening: 'Listening...',
    speaking: 'Speaking...',
  }[state] || '';

  return (
    <div class="mb-voice-overlay mb-voice-active">
      <StatusRing
        state={state}
        micVolume={micVolume}
        playbackVolume={playbackVolume}
        primaryColor={primaryColor}
      />

      <div class="mb-voice-info">
        <div class="mb-voice-name">{assistantName}</div>
        <div class="mb-voice-status">{statusText}</div>
        <div class="mb-voice-timer">{formatDuration(duration)}</div>
      </div>

      <div class="mb-voice-controls">
        <button
          class={`mb-voice-mute ${isMuted ? 'mb-voice-muted' : ''}`}
          onClick={onMuteToggle}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          <MicIcon muted={isMuted} />
        </button>
        <button class="mb-voice-hangup" onClick={onHangUp} aria-label="End call">
          <HangUpIcon />
        </button>
      </div>
    </div>
  );
}
