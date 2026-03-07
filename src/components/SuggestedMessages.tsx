// ============================================================================
// Suggested Messages Component - Quick-reply chips
// ============================================================================

import { h } from 'preact';

interface SuggestedMessagesProps {
  messages: string[];
  onSelect: (message: string) => void;
  primaryColor: string;
}

export function SuggestedMessages({ messages, onSelect, primaryColor }: SuggestedMessagesProps) {
  if (!messages || messages.length === 0) return null;

  return (
    <div class="mb-suggested">
      {messages.map((msg) => (
        <button
          class="mb-suggested-chip"
          onClick={() => onSelect(msg)}
          style={{ borderColor: primaryColor, color: primaryColor, '--chip-hover-bg': primaryColor } as any}
        >
          {msg}
        </button>
      ))}
    </div>
  );
}
