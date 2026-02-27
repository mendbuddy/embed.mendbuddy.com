// ============================================================================
// Message Component - Single chat message
// ============================================================================

import { h } from 'preact';
import type { Message as MessageType, Source } from '../types';

interface MessageProps {
  message: MessageType;
  primaryColor: string;
}

export function Message({ message, primaryColor }: MessageProps) {
  const isUser = message.role === 'user';

  return (
    <div class={`mb-message ${isUser ? 'user' : 'assistant'}`}>
      <div
        class="mb-message-bubble"
        style={isUser ? { backgroundColor: primaryColor } : undefined}
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
