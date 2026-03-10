// ============================================================================
// Message List Component - Displays all chat messages
// ============================================================================

import { h } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import type { Message as MessageType } from '../types';
import { Message } from './Message';
import { SuggestedMessages } from './SuggestedMessages';

interface MessageListProps {
  messages: MessageType[];
  isStreaming: boolean;
  welcomeMessage: string;
  primaryColor: string;
  userBgColor: string;
  assistantBgColor: string;
  logoUrl?: string | null;
  defaultMessages: string[];
  onSuggestedSelect: (message: string) => void;
}

export function MessageList({
  messages,
  isStreaming,
  welcomeMessage,
  primaryColor,
  userBgColor,
  assistantBgColor,
  logoUrl,
  defaultMessages,
  onSuggestedSelect,
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
        <>
          <div class="mb-welcome">
            <p>{welcomeMessage}</p>
          </div>
          <SuggestedMessages
            messages={defaultMessages}
            onSelect={onSuggestedSelect}
            primaryColor={primaryColor}
          />
        </>
      )}
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          userBgColor={userBgColor}
          assistantBgColor={assistantBgColor}
          logoUrl={logoUrl}
        />
      ))}
    </div>
  );
}
