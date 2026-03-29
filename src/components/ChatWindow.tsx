// ============================================================================
// Chat Window Component - Main chat window container
// ============================================================================

import { h } from 'preact';
import type { EmbedConfigPublic, UseChatReturn, VoiceCallState } from '../types';
import { Header } from './Header';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { PreChatForm } from './PreChatForm';
import { PoweredBy } from './PoweredBy';
import { VoiceCallOverlay } from './VoiceCallOverlay';

interface ChatWindowProps {
  isOpen: boolean;
  config: EmbedConfigPublic;
  chat: UseChatReturn;
  onClose: () => void;
  voiceState?: VoiceCallState;
  voiceMicVolume?: number;
  voicePlaybackVolume?: number;
  voiceMuted?: boolean;
  voiceTranscript?: Array<{ role: 'user' | 'assistant'; text: string }>;
  isMobile?: boolean;
  onVoiceCallStart?: () => void;
  onVoiceConfirm?: () => void;
  onVoiceCancel?: () => void;
  onVoiceMuteToggle?: () => void;
  onVoiceHangUp?: () => void;
}

const WINDOW_POSITIONS: Record<string, Record<string, string>> = {
  'bottom-right': { bottom: '90px', right: '20px' },
  'bottom-left': { bottom: '90px', left: '20px' },
  'top-right': { top: '90px', right: '20px' },
  'top-left': { top: '90px', left: '20px' },
};

export function ChatWindow({
  isOpen,
  config,
  chat,
  onClose,
  voiceState = 'idle',
  voiceMicVolume = 0,
  voicePlaybackVolume = 0,
  voiceMuted = false,
  voiceTranscript = [],
  isMobile = false,
  onVoiceCallStart,
  onVoiceConfirm,
  onVoiceCancel,
  onVoiceMuteToggle,
  onVoiceHangUp,
}: ChatWindowProps) {
  const needsPreChat =
    config.pre_chat_enabled &&
    config.pre_chat_fields.length > 0 &&
    !chat.preChatSubmitted;

  const showOffline = !config.is_online;

  const posStyle = WINDOW_POSITIONS[config.widget_position] || WINDOW_POSITIONS['bottom-right'];

  const windowStyle = {
    width: config.window_width || '380px',
    height: config.window_height || '600px',
    maxHeight: 'calc(100vh - 110px)',
    fontSize: config.text_size || '14px',
    ...posStyle,
  };

  return (
    <div class={`mb-window ${isOpen ? 'open' : ''}`} style={windowStyle}>
      <Header
        assistantName={config.assistant_name}
        brandImageUrl={config.brand_image_url}
        logoUrl={config.logo_url}
        isOnline={config.is_online}
        primaryColor={config.primary_color}
        showResetButton={config.show_reset_button ?? false}
        onReset={chat.resetSession}
        onClose={onClose}
        voiceEnabled={config.voice_enabled && voiceState === 'idle'}
        voiceButtonColor={config.voice_button_color}
        voiceButtonIcon={config.voice_button_icon}
        onVoiceCall={onVoiceCallStart}
      />

      {voiceState !== 'idle' && onVoiceConfirm && onVoiceCancel && onVoiceMuteToggle && onVoiceHangUp ? (
        <VoiceCallOverlay
          state={voiceState}
          assistantName={config.assistant_name || 'AI Assistant'}
          primaryColor={config.primary_color}
          micVolume={voiceMicVolume}
          playbackVolume={voicePlaybackVolume}
          isMuted={voiceMuted}
          transcript={voiceTranscript}
          onConfirm={onVoiceConfirm}
          onCancel={onVoiceCancel}
          onMuteToggle={onVoiceMuteToggle}
          onHangUp={onVoiceHangUp}
          isMobile={isMobile}
        />
      ) : showOffline ? (
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
            userBgColor={config.user_bg_color || config.primary_color}
            assistantBgColor={config.assistant_bg_color || '#ffffff'}
            logoUrl={config.logo_url}
            defaultMessages={config.default_messages || []}
            onSuggestedSelect={chat.sendMessage}
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
