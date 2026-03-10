// ============================================================================
// Chat Button Component - Floating button to open/close chat
// ============================================================================

import { h } from 'preact';
import { getIconSvg } from '../icons';

interface ChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
  buttonColor: string;
  chatIcon: string;
  widgetPosition: string;
  unreadCount: number;
  badgeColor: string;
  badgeAnimation: string;
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const BUTTON_POSITIONS: Record<string, Record<string, string>> = {
  'bottom-right': { bottom: '20px', right: '20px' },
  'bottom-left': { bottom: '20px', left: '20px' },
  'top-right': { top: '20px', right: '20px' },
  'top-left': { top: '20px', left: '20px' },
};

export function ChatButton({
  onClick,
  isOpen,
  buttonColor,
  chatIcon,
  widgetPosition,
  unreadCount,
  badgeColor,
  badgeAnimation,
}: ChatButtonProps) {
  const posStyle = BUTTON_POSITIONS[widgetPosition] || BUTTON_POSITIONS['bottom-right'];
  const animClass = badgeAnimation && badgeAnimation !== 'none' ? ` mb-badge-${badgeAnimation}` : '';

  return (
    <button
      class="mb-button"
      onClick={onClick}
      style={{ backgroundColor: buttonColor, ...posStyle }}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      {isOpen ? (
        <CloseIcon />
      ) : (
        <svg viewBox="0 0 256 256" fill="currentColor" dangerouslySetInnerHTML={{ __html: getIconSvg(chatIcon) }} />
      )}
      {!isOpen && unreadCount > 0 && (
        <span
          class={`mb-badge mb-badge-pop${animClass}`}
          style={{ backgroundColor: badgeColor }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
