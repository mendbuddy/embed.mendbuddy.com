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
        <div class="mb-header-status">
          <span
            class="mb-status-dot"
            style={{ backgroundColor: isOnline ? '#22c55e' : '#9ca3af' }}
          />
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>
      <button class="mb-header-close" onClick={onClose} aria-label="Close chat">
        <CloseIcon />
      </button>
    </div>
  );
}
