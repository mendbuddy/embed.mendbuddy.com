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
  bubbleSize: string;
  unreadCount: number;
  badgeColor: string;
  badgeAnimation: string;
  scrollState?: 'idle' | 'hidden' | 'bouncing';
}

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
  bubbleSize,
  unreadCount,
  badgeColor,
  badgeAnimation,
  scrollState = 'idle',
}: ChatButtonProps) {
  const posStyle = BUTTON_POSITIONS[widgetPosition] || BUTTON_POSITIONS['bottom-right'];
  const animClass = badgeAnimation && badgeAnimation !== 'none' ? ` mb-badge-${badgeAnimation}` : '';
  const sizeNum = parseInt(bubbleSize) || 60;
  const iconSize = Math.round(sizeNum * 0.47); // scale icon proportionally

  // Determine scroll-based CSS class
  const scrollClass = scrollState === 'hidden' ? ' mb-button-scroll-hidden'
    : scrollState === 'bouncing' ? ' mb-button-scroll-visible'
    : '';

  // Slide direction: bottom positions slide down, top positions slide up
  const isTop = widgetPosition === 'top-right' || widgetPosition === 'top-left';
  const hideY = isTop ? '-100px' : '100px';

  return (
    <button
      class={`mb-button${scrollClass}`}
      onClick={onClick}
      style={{ backgroundColor: buttonColor, width: `${sizeNum}px`, height: `${sizeNum}px`, '--mb-hide-y': hideY, ...posStyle } as any}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      {isOpen ? (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: `${iconSize}px`, height: `${iconSize}px` }}>
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      ) : (
        <svg viewBox="0 0 256 256" fill="currentColor" style={{ width: `${iconSize}px`, height: `${iconSize}px` }} dangerouslySetInnerHTML={{ __html: getIconSvg(chatIcon) }} />
      )}
      {!isOpen && unreadCount > 0 && (
        <span
          class={`mb-badge${animClass}`}
          style={{ backgroundColor: badgeColor }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
