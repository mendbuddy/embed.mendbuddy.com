// ============================================================================
// Message Input Component - Text input and send button
// ============================================================================

import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  placeholder: string;
  primaryColor: string;
  autoFocus?: boolean;
}

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

export function MessageInput({
  onSend,
  disabled,
  placeholder,
  primaryColor,
  autoFocus,
}: MessageInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when autoFocus becomes true (e.g. chat window opens)
  useEffect(() => {
    if (autoFocus) {
      // Small delay to ensure the chat window animation has started and input is visible
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form class="mb-input-container" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        class="mb-input"
        value={value}
        onInput={(e) => setValue((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        style={{ '--focus-color': primaryColor } as any}
      />
      <button
        type="submit"
        class="mb-send"
        disabled={disabled || !value.trim()}
        style={{ backgroundColor: primaryColor }}
        aria-label="Send message"
      >
        <SendIcon />
      </button>
    </form>
  );
}
