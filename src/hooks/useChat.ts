// ============================================================================
// useChat Hook - Chat state management
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import type { EmbedConfigPublic, Message, UseChatReturn, Source } from '../types';
import { ApiClient } from '../api/client';
import {
  getSessionToken,
  hasExistingSession,
  clearSessionToken,
  getPreChatSubmitted,
  setPreChatSubmitted,
} from '../storage/session';

export function useChat(
  apiUrl: string,
  embedId: string,
  config: EmbedConfigPublic | null
): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [preChatSubmitted, setPreChatSubmittedState] = useState(false);

  const clientRef = useRef<ApiClient | null>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const sessionCreatedRef = useRef(false);
  const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize client
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new ApiClient(apiUrl, embedId);
    }
  }, [apiUrl, embedId]);

  // Check for existing pre-chat submission
  useEffect(() => {
    setPreChatSubmittedState(getPreChatSubmitted(embedId));
  }, [embedId]);

  // Load history if session exists
  useEffect(() => {
    if (!config || !hasExistingSession(embedId)) return;

    async function loadHistory() {
      try {
        const result = await clientRef.current!.getHistory();
        if (result.messages.length > 0) {
          setMessages(result.messages);
        }
      } catch (err: any) {
        // Session expired — clear stale token so ensureSession creates a new one
        if (err.code === 'SESSION_INVALID' || err.code === 'SESSION_REQUIRED') {
          clearSessionToken(embedId);
          sessionCreatedRef.current = false;
        }
        console.debug('Failed to load history:', err);
      }
    }

    loadHistory();
  }, [config, embedId]);

  /**
   * Ensure session exists before making requests
   */
  const ensureSession = useCallback(async (): Promise<boolean> => {
    if (!clientRef.current) return false;

    // Check if we already have a session token
    if (getSessionToken(embedId)) {
      return true;
    }

    // Create new session (token missing or was cleared due to expiry)
    try {
      await clientRef.current.createSession();
      sessionCreatedRef.current = true;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      return false;
    }
  }, [embedId]);

  /**
   * Submit pre-chat form
   */
  const submitPreChat = useCallback(
    async (fields: Record<string, string>): Promise<void> => {
      if (!clientRef.current || !config) return;

      setIsLoading(true);
      setError(null);

      try {
        // Ensure session exists
        const hasSession = await ensureSession();
        if (!hasSession) return;

        await clientRef.current.submitPreChat(fields);
        setPreChatSubmitted(embedId, true);
        setPreChatSubmittedState(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit pre-chat form');
      } finally {
        setIsLoading(false);
      }
    },
    [config, embedId, ensureSession]
  );

  /**
   * Send a message
   */
  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      if (!clientRef.current || !config) return;
      if (isLoading || isStreaming) return;

      // Abort any existing stream
      if (abortRef.current) {
        abortRef.current();
        abortRef.current = null;
      }

      setError(null);

      // Ensure session exists
      const hasSession = await ensureSession();
      if (!hasSession) return;

      // Add user message immediately with "delivered" status
      const userMsgId = `temp_${Date.now()}`;
      const userMessage: Message = {
        id: userMsgId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
        status: 'delivered',
      };
      setMessages((prev) => [...prev, userMessage]);

      // After 2s, upgrade to "read"
      if (readTimerRef.current) clearTimeout(readTimerRef.current);
      readTimerRef.current = setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsgId ? { ...m, status: 'read' as const } : m))
        );
      }, 2000);

      // Start streaming
      setIsStreaming(true);

      // Create placeholder for assistant message
      let assistantContent = '';
      let assistantId = '';
      let sources: Source[] = [];

      const abort = clientRef.current.streamMessage(content, {
        onStart: (tid, mid) => {
          setThreadId(tid);
          assistantId = mid;
          // Clear read timer and remove status — typing dots take over
          if (readTimerRef.current) {
            clearTimeout(readTimerRef.current);
            readTimerRef.current = null;
          }
          setMessages((prev) => [
            ...prev.map((m) => (m.id === userMsgId ? { ...m, status: undefined } : m)),
            {
              id: mid,
              role: 'assistant',
              content: '',
              created_at: new Date().toISOString(),
            },
          ]);
        },
        onChunk: (chunk) => {
          assistantContent += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: assistantContent } : m
            )
          );
        },
        onSources: (s) => {
          sources = s;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, sources } : m))
          );
        },
        onDone: () => {
          setIsStreaming(false);
          abortRef.current = null;
        },
        onError: (err) => {
          setError(err);
          setIsStreaming(false);
          abortRef.current = null;
          // Remove empty assistant message on error
          if (!assistantContent) {
            setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          }
        },
      });

      abortRef.current = abort;
    },
    [config, isLoading, isStreaming, ensureSession]
  );

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    threadId,
    preChatSubmitted,
    sendMessage,
    submitPreChat,
    clearError,
  };
}
