// ============================================================================
// Typing Indicator Component - Shows "..." animation in a message bubble
// ============================================================================

import { h } from 'preact';

interface TypingIndicatorProps {
  assistantBgColor: string;
  logoUrl?: string | null;
}

export function TypingIndicator({ assistantBgColor, logoUrl }: TypingIndicatorProps) {
  return (
    <div class="mb-message assistant typing">
      {logoUrl && (
        <img src={logoUrl} alt="" class="mb-avatar" />
      )}
      <div
        class="mb-message-bubble"
        style={{ backgroundColor: assistantBgColor }}
      >
        <div class="mb-typing-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
