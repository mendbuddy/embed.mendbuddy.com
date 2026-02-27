// ============================================================================
// Message List Component - Displays all chat messages
// ============================================================================

import { h } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import type { Message as MessageType } from '../types';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages: MessageType[];
  isStreaming: boolean;
  welcomeMessage: string;
  primaryColor: string;
}

export function MessageList({
  messages,
  isStreaming,
  welcomeMessage,
  primaryColor,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  return (
    <div class="mb-messages" ref={containerRef}>
      {messages.length === 0 && (
        <div class="mb-welcome">
          <p>{welcomeMessage}</p>
        </div>
      )}
      {messages.map((message) => (
        <Message key={message.id} message={message} primaryColor={primaryColor} />
      ))}
      {isStreaming && messages[messages.length - 1]?.content === '' && (
        <TypingIndicator />
      )}
    </div>
  );
}
