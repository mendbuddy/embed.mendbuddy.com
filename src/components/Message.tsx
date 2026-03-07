// ============================================================================
// Message Component - Single chat message
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

  return (
    <div class={`mb-message ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && logoUrl && (
        <img src={logoUrl} alt="" class="mb-avatar" />
      )}
      <div
        class="mb-message-bubble"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {message.content}
      </div>
      {!isUser && message.sources && message.sources.length > 0 && (
        <div class="mb-sources">
          <div class="mb-sources-label">Sources:</div>
          {message.sources.map((source, index) => (
            <div key={index} class="mb-source">
              {source.document_name}
              {source.pages.length > 0 && ` (p. ${source.pages.join(', ')})`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
