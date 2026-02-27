// ============================================================================
// Typing Indicator Component - Shows "..." animation
// ============================================================================

import { h } from 'preact';

export function TypingIndicator() {
  return (
    <div class="mb-message typing">
      <div class="mb-typing-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
