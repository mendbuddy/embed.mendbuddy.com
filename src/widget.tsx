// ============================================================================
// Main Widget Component
// ============================================================================

import { h, Fragment } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { ChatButton } from './components/ChatButton';
import { ChatWindow } from './components/ChatWindow';
import { useChat } from './hooks/useChat';
import { useConfig } from './hooks/useConfig';

interface WidgetProps {
  embedId: string;
  apiUrl: string;
  position: 'bottom-right' | 'bottom-left';
  autoOpen: boolean;
  onReady?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (message: { role: string; content: string }) => void;
}

export function Widget({
  embedId,
  apiUrl,
  position,
  autoOpen,
  onReady,
  onOpen,
  onClose,
  onMessage,
}: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { config, loading: configLoading, error: configError } = useConfig(apiUrl, embedId);
  const chat = useChat(apiUrl, embedId, config);

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

  if (configError || !config) {
    console.error('MendBuddy Chat: Failed to load config -', configError);
    return <Fragment />;
  }

  const positionClass = position === 'bottom-left' ? 'left' : 'right';

  return (
    <div
      class="mb-widget"
      style={{ '--primary-color': config.primary_color } as any}
    >
      <ChatButton
        onClick={handleToggle}
        isOpen={isOpen}
        position={positionClass}
        primaryColor={config.primary_color}
        icon={config.button_icon}
        customIconUrl={config.custom_icon_url}
      />
      <ChatWindow
        isOpen={isOpen}
        position={positionClass}
        config={config}
        chat={chat}
        onClose={handleClose}
      />
    </div>
  );
}
