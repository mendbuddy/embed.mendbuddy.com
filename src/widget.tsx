// ============================================================================
// Main Widget Component
// ============================================================================

import { h, Fragment } from 'preact';
import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { ChatButton } from './components/ChatButton';
import { ChatWindow } from './components/ChatWindow';
import { useChat } from './hooks/useChat';
import { useConfig } from './hooks/useConfig';
import {
  getUnreadCount,
  setUnreadCount,
  getLastSeenTimestamp,
  setLastSeenTimestamp,
  getSessionToken,
} from './storage/session';
import { STORAGE_KEY_PREFIX } from './constants';
import { loadVoiceBundle, getVoiceModule } from './voice/loader';
import type { VoiceCallState } from './types';

interface WidgetProps {
  embedId: string;
  apiUrl: string;
  autoOpen: boolean;
  isIframe?: boolean;
  onReady?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (message: { role: string; content: string }) => void;
}

export function Widget({
  embedId,
  apiUrl,
  autoOpen,
  isIframe = false,
  onReady,
  onOpen,
  onClose,
  onMessage,
}: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false); // starts closed — parent sends mb:open
  const [unreadCount, setUnreadCountState] = useState<number>(() => getUnreadCount(embedId));
  const { config, loading: configLoading, error: configError, errorCode: configErrorCode } = useConfig(apiUrl, embedId);
  const chat = useChat(apiUrl, embedId, config);

  const prevMessagesLenRef = useRef(0);
  const initialLoadDoneRef = useRef(false);

  // iframe mode: listen for postMessage from parent
  useEffect(() => {
    if (!isIframe) return;
    const handler = (e: MessageEvent) => {
      if (!e.data?.type?.startsWith('mb:')) return;
      switch (e.data.type) {
        case 'mb:open':
          setIsOpen(true);
          break;
        case 'mb:close':
          setIsOpen(false);
          break;
        case 'mb:destroy':
          // Cleanup could go here if needed
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isIframe]);

  // iframe mode: notify parent of unread count changes
  useEffect(() => {
    if (isIframe) {
      window.parent.postMessage({ type: 'mb:badge', count: unreadCount }, '*');
    }
  }, [isIframe, unreadCount]);

  // Reset unread when widget opens
  useEffect(() => {
    if (isOpen) {
      setUnreadCountState(0);
      setUnreadCount(embedId, 0);
      setLastSeenTimestamp(embedId, new Date().toISOString());
    }
  }, [isOpen, embedId]);

  // Track new assistant messages while closed
  useEffect(() => {
    const currentLen = chat.messages.length;
    const prevLen = prevMessagesLenRef.current;

    if (currentLen > prevLen) {
      if (!initialLoadDoneRef.current) {
        // First batch = history load — count unseen messages
        initialLoadDoneRef.current = true;
        const lastSeen = getLastSeenTimestamp(embedId);
        if (lastSeen && !isOpen) {
          let unseen = 0;
          for (const msg of chat.messages) {
            if (msg.role === 'assistant' && msg.created_at > lastSeen) {
              unseen++;
            }
          }
          if (unseen > 0) {
            setUnreadCountState(unseen);
            setUnreadCount(embedId, unseen);
          }
        }
      } else if (!isOpen) {
        // Incremental new messages while closed
        const newMessages = chat.messages.slice(prevLen);
        let newAssistant = 0;
        for (const msg of newMessages) {
          if (msg.role === 'assistant') {
            newAssistant++;
          }
        }
        if (newAssistant > 0) {
          const updated = unreadCount + newAssistant;
          setUnreadCountState(updated);
          setUnreadCount(embedId, updated);
        }
      }
    }

    prevMessagesLenRef.current = currentLen;
  }, [chat.messages.length, embedId, isOpen, unreadCount]);

  // Cross-tab sync via StorageEvent
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === `${STORAGE_KEY_PREFIX}${embedId}_unread`) {
        setUnreadCountState(parseInt(e.newValue || '0', 10));
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [embedId]);

  // Handle auto-open
  useEffect(() => {
    if (!configLoading && config && autoOpen) {
      const delay = config.auto_open_delay_ms || 0;
      const timer = setTimeout(() => {
        setIsOpen(true);
        onOpen?.();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [configLoading, config, autoOpen, onOpen]);

  // Handle ready callback
  useEffect(() => {
    if (!configLoading && config && onReady) {
      onReady();
    }
  }, [configLoading, config, onReady]);

  // Handle external open/close events
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      onOpen?.();
    };
    const handleClose = () => {
      setIsOpen(false);
      onClose?.();
    };

    window.addEventListener('mendbuddy:open', handleOpen);
    window.addEventListener('mendbuddy:close', handleClose);

    return () => {
      window.removeEventListener('mendbuddy:open', handleOpen);
      window.removeEventListener('mendbuddy:close', handleClose);
    };
  }, [onOpen, onClose]);

  // Handle message callback
  useEffect(() => {
    if (onMessage && chat.messages.length > 0) {
      const lastMessage = chat.messages[chat.messages.length - 1];
      onMessage({ role: lastMessage.role, content: lastMessage.content });
    }
  }, [chat.messages.length, onMessage]);

  // Kiosk mode: auto-close & reset after idle timeout
  // Uses a ref for message count to avoid stale closures in the interval callback
  const kioskSecondsLeftRef = useRef(0);
  const kioskMsgCountRef = useRef(0);
  const chatMsgLenRef = useRef(0);

  // Keep the ref in sync with the latest message count on every render
  chatMsgLenRef.current = chat.messages.length;

  useEffect(() => {
    const timeout = config?.kiosk_idle_timeout_seconds;
    if (!timeout || !isOpen) return;

    // Reset countdown
    kioskSecondsLeftRef.current = timeout;
    kioskMsgCountRef.current = chatMsgLenRef.current;

    const interval = setInterval(() => {
      // New messages arrived → reset countdown
      if (chatMsgLenRef.current !== kioskMsgCountRef.current) {
        kioskMsgCountRef.current = chatMsgLenRef.current;
        kioskSecondsLeftRef.current = timeout;
        return;
      }

      kioskSecondsLeftRef.current -= 1;

      if (kioskSecondsLeftRef.current <= 0) {
        clearInterval(interval);
        setIsOpen(false);
        if (config.kiosk_reset_session) {
          chat.resetSession();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, config?.kiosk_idle_timeout_seconds]);

  const handleToggle = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState) {
      // Focus the text input during the user gesture (tap) so iOS opens the keyboard.
      // The input is already in the DOM (window uses opacity, not display:none).
      const input = document.querySelector('.mb-input') as HTMLInputElement;
      input?.focus();
      onOpen?.();
    } else {
      onClose?.();
    }
  }, [isOpen, onOpen, onClose]);

  const handleClose = useCallback(() => {
    if (isIframe) {
      // Tell parent to hide the iframe
      window.parent.postMessage({ type: 'mb:close' }, '*');
    } else {
      setIsOpen(false);
      onClose?.();
    }
  }, [isIframe, onClose]);

  // ─── Voice Call State ──────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState<VoiceCallState>('idle');
  const [voiceMicVolume, setVoiceMicVolume] = useState(0);
  const [voicePlaybackVolume, setVoicePlaybackVolume] = useState(0);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const voiceCallRef = useRef<any>(null);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleVoiceCallStart = useCallback(() => {
    setVoiceState('confirming');
  }, []);

  const [voiceDismissing, setVoiceDismissing] = useState(false);

  const handleVoiceCancel = useCallback(() => {
    // If call ended/errored, animate out then reset
    if (voiceState === 'ended' || voiceState === 'error' || voiceState === 'exhausted') {
      setVoiceDismissing(true);
      setTimeout(() => {
        setVoiceDismissing(false);
        setVoiceState('idle');
        setVoiceTranscript([]);
        setVoiceMicVolume(0);
        setVoicePlaybackVolume(0);
        setVoiceMuted(false);
        voiceCallRef.current = null;
      }, 300); // matches mb-overlay-out animation
      return;
    }
    // Otherwise reset immediately (confirming dialog cancel)
    setVoiceState('idle');
    setVoiceTranscript([]);
    setVoiceMicVolume(0);
    setVoicePlaybackVolume(0);
    setVoiceMuted(false);
    voiceCallRef.current = null;
  }, []);

  const handleVoiceConfirm = useCallback(async () => {
    setVoiceState('loading');
    try {
      // Determine script URL from the embed script tag
      const scriptEl = document.querySelector('script[data-embed-id]') as HTMLScriptElement;
      const baseUrl = scriptEl?.src || `${apiUrl.replace('/api', '')}/v1/chat.js`;
      await loadVoiceBundle(baseUrl);

      const VoiceModule = getVoiceModule();
      if (!VoiceModule?.VoiceCall) {
        throw new Error('Voice module not available');
      }

      // Pass existing session token if we have one (voice/init will create one if not)
      const existingSessionToken = getSessionToken(embedId);

      // Pass existing threadId so voice continues the text conversation
      const existingThreadId = chat.threadId;

      const call = new VoiceModule.VoiceCall(apiUrl, embedId, existingSessionToken, {
        onStateChange: (state: VoiceCallState) => setVoiceState(state),
        onTranscript: (role: 'user' | 'assistant', text: string, partial?: boolean) => {
          setVoiceTranscript((prev) => {
            if (partial) {
              const lastIdx = prev.length - 1;
              if (lastIdx >= 0 && prev[lastIdx].role === role) {
                const updated = [...prev];
                updated[lastIdx] = { role, text };
                return updated;
              }
              return [...prev, { role, text }];
            }
            // Final transcript — add to voice overlay display
            const lastIdx = prev.length - 1;
            if (lastIdx >= 0 && prev[lastIdx].role === role) {
              const updated = [...prev];
              updated[lastIdx] = { role, text };
              return updated;
            }
            return [...prev, { role, text }];
          });

          // Final transcripts get injected into chat messages behind the overlay
          if (!partial && text.trim()) {
            chat.addVoiceMessage(role, text.trim());
          }
        },
        onMicVolume: (level: number) => setVoiceMicVolume(level),
        onPlaybackVolume: (level: number) => setVoicePlaybackVolume(level),
        onError: (message: string) => {
          console.error('[MendBuddy Voice]', message);
          setVoiceState('error');
        },
        onEnd: () => {},
      }, existingThreadId);

      voiceCallRef.current = call;

      const initResult = await call.init();
      if (!initResult.allowed) {
        setVoiceState(initResult.reason === 'minutes_exhausted' ? 'exhausted' : 'error');
        return;
      }

      // Sync voice thread to chat so text + voice share one conversation
      if (initResult.threadId) {
        chat.setThreadId(initResult.threadId);
      }

      await call.connect();
    } catch (err) {
      console.error('[MendBuddy Voice] Error:', err);
      setVoiceState('error');
    }
  }, [apiUrl, embedId, chat.threadId, chat.addVoiceMessage, chat.setThreadId]);

  const handleVoiceMuteToggle = useCallback(() => {
    if (!voiceCallRef.current) return;
    if (voiceMuted) {
      voiceCallRef.current.unmute();
      setVoiceMuted(false);
    } else {
      voiceCallRef.current.mute();
      setVoiceMuted(true);
    }
  }, [voiceMuted]);

  const handleVoiceHangUp = useCallback(() => {
    voiceCallRef.current?.disconnect('user_ended');
  }, []);

  // Don't render if loading or config failed
  if (configLoading) {
    return <Fragment />;
  }

  if (configErrorCode === 'DOMAIN_NOT_ALLOWED') {
    console.warn('MendBuddy Chat: This chat widget is not configured for this website.');
    return <Fragment />;
  }

  if (configError || !config) {
    console.error('MendBuddy Chat: Failed to load config -', configError);
    return <Fragment />;
  }

  return (
    <div
      class={`mb-widget ${isIframe ? 'mb-widget-iframe' : ''}`}
      style={{ '--primary-color': config.primary_color } as any}
    >
      {!isIframe && (
        <ChatButton
          onClick={handleToggle}
          isOpen={isOpen}
          buttonColor={config.button_color || config.primary_color}
          chatIcon={config.chat_icon || 'chat-circle-dots'}
          widgetPosition={config.widget_position || 'bottom-right'}
          bubbleSize={config.bubble_size || '60px'}
          unreadCount={config.badge_enabled === false ? 0 : unreadCount}
          badgeColor={config.badge_color || '#ef4444'}
          badgeAnimation={config.badge_animation || 'bounce'}
        />
      )}
      <ChatWindow
        isOpen={isIframe || isOpen}
        isIframe={isIframe}
        config={config}
        chat={chat}
        onClose={handleClose}
        voiceState={voiceState}
        voiceMicVolume={voiceMicVolume}
        voicePlaybackVolume={voicePlaybackVolume}
        voiceMuted={voiceMuted}
        voiceTranscript={voiceTranscript}
        voiceDismissing={voiceDismissing}
        isMobile={isMobile}
        onVoiceCallStart={handleVoiceCallStart}
        onVoiceConfirm={handleVoiceConfirm}
        onVoiceCancel={handleVoiceCancel}
        onVoiceMuteToggle={handleVoiceMuteToggle}
        onVoiceHangUp={handleVoiceHangUp}
      />
    </div>
  );
}
