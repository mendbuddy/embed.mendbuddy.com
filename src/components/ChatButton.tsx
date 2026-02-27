// ============================================================================
// Chat Button Component - Floating button to open/close chat
// ============================================================================

import { h } from 'preact';
import type { EmbedButtonIcon } from '../types';

interface ChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
  position: 'left' | 'right';
  primaryColor: string;
  icon: EmbedButtonIcon;
  customIconUrl?: string | null;
}

// SVG icons
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
    <path d="M7 9h10v2H7zm0-3h10v2H7z" />
  </svg>
);

const MessageIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
  </svg>
);

const HelpIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

export function ChatButton({
  onClick,
  isOpen,
  position,
  primaryColor,
  icon,
  customIconUrl,
}: ChatButtonProps) {
  const getIcon = () => {
    if (isOpen) return <CloseIcon />;
    if (icon === 'custom' && customIconUrl) {
      return <img src={customIconUrl} alt="Chat" style={{ width: '28px', height: '28px' }} />;
    }
    switch (icon) {
      case 'message':
        return <MessageIcon />;
      case 'help':
        return <HelpIcon />;
      case 'chat':
      default:
        return <ChatIcon />;
    }
  };

  return (
    <button
      class={`mb-button ${position}`}
      onClick={onClick}
      style={{ backgroundColor: primaryColor }}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      {getIcon()}
    </button>
  );
}
