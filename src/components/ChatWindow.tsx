// ============================================================================
// Chat Window Component - Main chat window container
// ============================================================================

import { h } from 'preact';
import type { EmbedConfigPublic, UseChatReturn } from '../types';
import { Header } from './Header';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { PreChatForm } from './PreChatForm';
import { PoweredBy } from './PoweredBy';

interface ChatWindowProps {
  isOpen: boolean;
  position: 'left' | 'right';
  config: EmbedConfigPublic;
  chat: UseChatReturn;
  onClose: () => void;
}

export function ChatWindow({
  isOpen,
  position,
  config,
  chat,
  onClose,
}: ChatWindowProps) {
  const needsPreChat =
    config.pre_chat_enabled &&
    config.pre_chat_fields.length > 0 &&
    !chat.preChatSubmitted;

  const showOffline = config.business_hours_enabled && !config.is_online;

  return (
    <div class={`mb-window ${position} ${isOpen ? 'open' : ''}`}>
      <Header
        logoUrl={config.logo_url}
        isOnline={config.is_online}
        primaryColor={config.primary_color}
        onClose={onClose}
      />

      {showOffline ? (
        <div class="mb-offline">
          <div class="mb-offline-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="#9ca3af">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div class="mb-offline-message">{config.offline_message}</div>
        </div>
      ) : needsPreChat ? (
        <PreChatForm
          fields={config.pre_chat_fields}
          onSubmit={chat.submitPreChat}
          isLoading={chat.isLoading}
          primaryColor={config.primary_color}
        />
      ) : (
        <>
          <MessageList
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            welcomeMessage={config.welcome_message}
            primaryColor={config.primary_color}
          />
          <MessageInput
            onSend={chat.sendMessage}
            disabled={chat.isLoading || chat.isStreaming}
            placeholder={config.placeholder_text}
            primaryColor={config.primary_color}
          />
        </>
      )}

      {chat.error && (
        <div class="mb-error">
          <span>{chat.error}</span>
          <button onClick={chat.clearError} aria-label="Dismiss error">
            &times;
          </button>
        </div>
      )}

      {config.show_powered_by && <PoweredBy />}
    </div>
  );
}
