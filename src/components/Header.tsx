// ============================================================================
// Header Component - Chat window header
// ============================================================================

import { h } from 'preact';

interface HeaderProps {
  assistantName: string;
  brandImageUrl?: string | null;
  logoUrl?: string | null;
  isOnline: boolean;
  primaryColor: string;
  showResetButton: boolean;
  onReset: () => void;
  onClose: () => void;
  voiceEnabled?: boolean;
  voiceButtonColor?: string | null;
  voiceButtonIcon?: string;
  onVoiceCall?: () => void;
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const PhoneCallIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
  </svg>
);

const MicrophoneIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
  </svg>
);

const HeadsetIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z" />
  </svg>
);

const WaveformIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);

function getVoiceIcon(icon: string) {
  switch (icon) {
    case 'microphone': return <MicrophoneIcon />;
    case 'headset': return <HeadsetIcon />;
    case 'waveform': return <WaveformIcon />;
    default: return <PhoneCallIcon />;
  }
}

export function Header({
  assistantName,
  brandImageUrl,
  logoUrl,
  isOnline,
  primaryColor,
  showResetButton,
  onReset,
  onClose,
  voiceEnabled,
  voiceButtonColor,
  voiceButtonIcon,
  onVoiceCall,
}: HeaderProps) {
  const headerLogo = brandImageUrl || logoUrl;

  return (
    <div class="mb-header" style={{ borderBottomColor: `${primaryColor}20` }}>
      {headerLogo && (
        <img src={headerLogo} alt="" class="mb-header-logo" />
      )}
      <div class="mb-header-info">
        <div class="mb-header-title">{assistantName || 'AI Assistant'}</div>
        {isOnline && (
          <div class="mb-header-status">
            <span class="mb-status-dot" style={{ backgroundColor: '#22c55e' }} />
            Available
          </div>
        )}
      </div>
      {voiceEnabled && onVoiceCall && (
        <button
          class="mb-header-voice"
          onClick={onVoiceCall}
          aria-label="Start voice call"
          title="Start voice call"
          style={{ color: voiceButtonColor || primaryColor }}
        >
          {getVoiceIcon(voiceButtonIcon || 'phone')}
        </button>
      )}
      {showResetButton && (
        <button class="mb-header-close" onClick={onReset} aria-label="New conversation" title="New conversation">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
          </svg>
        </button>
      )}
      <button class="mb-header-close" onClick={onClose} aria-label="Close chat">
        <CloseIcon />
      </button>
    </div>
  );
}
