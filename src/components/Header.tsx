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
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

export function Header({
  assistantName,
  brandImageUrl,
  logoUrl,
  isOnline,
  primaryColor,
  showResetButton,
  onReset,
  onClose,
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
