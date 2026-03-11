// ============================================================================
// Message Component - Single chat message (handles all states: typing, content)
// ============================================================================

import { h } from 'preact';
import type { Message as MessageType } from '../types';

interface MessageProps {
  message: MessageType;
  userBgColor: string;
  assistantBgColor: string;
  logoUrl?: string | null;
}

function getTextColor(bgHex: string): string {
  if (!bgHex || bgHex.length < 7) return '#1a1a1a';
  const r = parseInt(bgHex.slice(1, 3), 16);
  const g = parseInt(bgHex.slice(3, 5), 16);
  const b = parseInt(bgHex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
}

export function Message({ message, userBgColor, assistantBgColor, logoUrl }: MessageProps) {
  const isUser = message.role === 'user';
  const bgColor = isUser ? userBgColor : assistantBgColor;
  const textColor = getTextColor(bgColor);
  const isTyping = !isUser && !message.content;

  return (
    <div class={`mb-message ${isUser ? 'user' : 'assistant'}${isTyping ? ' typing' : ''}`}>
      {!isUser && logoUrl && (
        <img src={logoUrl} alt="" class="mb-avatar" />
      )}
      <div class="mb-message-content">
        <div
          class="mb-message-bubble"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          {isTyping ? (
            <div class="mb-typing-dots">
              <span />
              <span />
              <span />
            </div>
          ) : (
            message.content
          )}
        </div>
        {isUser && message.status && (
          <div class="mb-message-status">
            {message.status === 'delivered' ? 'Delivered' : 'Read'}
          </div>
        )}
      </div>
    </div>
  );
}
