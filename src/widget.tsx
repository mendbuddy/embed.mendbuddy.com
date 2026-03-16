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
} from './storage/session';
import { STORAGE_KEY_PREFIX } from './constants';

interface WidgetProps {
  embedId: string;
  apiUrl: string;
  autoOpen: boolean;
  onReady?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (message: { role: string; content: string }) => void;
}

export function Widget({
  embedId,
  apiUrl,
  autoOpen,
  onReady,
  onOpen,
  onClose,
  onMessage,
}: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCountState] = useState<number>(() => getUnreadCount(embedId));
  const { config, loading: configLoading, error: configError, errorCode: configErrorCode } = useConfig(apiUrl, embedId);
  const chat = useChat(apiUrl, embedId, config);

  const prevMessagesLenRef = useRef(0);
  const initialLoadDoneRef = useRef(false);

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
  // Simple 1-second polling interval — no stale closures, no complex deps
  const kioskSecondsLeftRef = useRef(0);
  const kioskMsgCountRef = useRef(0);

  useEffect(() => {
    const timeout = config?.kiosk_idle_timeout_seconds;
    if (!timeout || !isOpen) return;

    // Reset countdown
    kioskSecondsLeftRef.current = timeout;
    kioskMsgCountRef.current = chat.messages.length;

    const interval = setInterval(() => {
      // New messages arrived → reset countdown
      if (chat.messages.length !== kioskMsgCountRef.current) {
        kioskMsgCountRef.current = chat.messages.length;
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
      onOpen?.();
    } else {
      onClose?.();
    }
  }, [isOpen, onOpen, onClose]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

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
      class="mb-widget"
      style={{ '--primary-color': config.primary_color } as any}
    >
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
      <ChatWindow
        isOpen={isOpen}
        config={config}
        chat={chat}
        onClose={handleClose}
      />
    </div>
  );
}
