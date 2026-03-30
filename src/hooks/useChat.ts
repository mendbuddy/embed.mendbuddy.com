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
  const sseDisconnectRef = useRef<(() => void) | null>(null);
  const knownMessageIdsRef = useRef(new Set<string>());

  // Text smoothing: buffer incoming chunks and drip-feed characters at a steady rate
  const smoothBufferRef = useRef('');       // queued text not yet shown
  const smoothShownRef = useRef('');        // text already rendered
  const smoothTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const smoothMsgIdRef = useRef<string>(''); // which assistant message we're smoothing
  const smoothDoneRef = useRef(false);      // has the stream finished?

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
          // Track known IDs to deduplicate SSE events
          for (const m of result.messages) {
            knownMessageIdsRef.current.add(m.id);
          }
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

  // Connect SSE for real-time push once we have a threadId
  useEffect(() => {
    if (!threadId || !clientRef.current) return;

    // Disconnect previous connection if any
    sseDisconnectRef.current?.();

    const disconnect = clientRef.current.connectEvents({
      onMessage: (event) => {
        if (event.type !== 'embed.new_message') return;

        // Deduplicate — skip if we already have this message
        if (knownMessageIdsRef.current.has(event.messageId)) return;
        knownMessageIdsRef.current.add(event.messageId);

        const newMsg: Message = {
          id: event.messageId,
          role: event.role as 'assistant',
          content: event.content,
          created_at: event.created_at,
        };
        setMessages((prev) => {
          // Double-check dedup in state
          if (prev.some((m) => m.id === event.messageId)) return prev;
          return [...prev, newMsg];
        });
      },
    });

    sseDisconnectRef.current = disconnect;

    return () => {
      disconnect();
      sseDisconnectRef.current = null;
    };
  }, [threadId]);

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
      if (smoothTimerRef.current) {
        clearInterval(smoothTimerRef.current);
        smoothTimerRef.current = null;
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

      // Reset smoothing state
      smoothBufferRef.current = '';
      smoothShownRef.current = '';
      smoothDoneRef.current = false;
      if (smoothTimerRef.current) {
        clearInterval(smoothTimerRef.current);
        smoothTimerRef.current = null;
      }

      // Start the smooth drip-feed timer — releases ~3 chars every 20ms (~150 chars/sec)
      const startSmoothing = (msgId: string) => {
        smoothMsgIdRef.current = msgId;
        if (smoothTimerRef.current) return; // already running

        smoothTimerRef.current = setInterval(() => {
          const buf = smoothBufferRef.current;
          if (buf.length === 0) {
            // Nothing left to show — if stream is done, clean up
            if (smoothDoneRef.current) {
              clearInterval(smoothTimerRef.current!);
              smoothTimerRef.current = null;
              setIsStreaming(false);
              abortRef.current = null;
            }
            return;
          }

          // Release a few characters at a time for smooth feel
          const charsToShow = Math.max(1, Math.min(4, Math.ceil(buf.length / 8)));
          const next = buf.slice(0, charsToShow);
          smoothBufferRef.current = buf.slice(charsToShow);
          smoothShownRef.current += next;

          const shown = smoothShownRef.current;
          const mid = smoothMsgIdRef.current;
          setMessages((prev) =>
            prev.map((m) => (m.id === mid ? { ...m, content: shown } : m))
          );
        }, 20);
      };

      const abort = clientRef.current.streamMessage(content, {
        onStart: (tid, mid) => {
          setThreadId(tid);
          assistantId = mid;
          knownMessageIdsRef.current.add(mid);
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
          startSmoothing(mid);
        },
        onChunk: (chunk) => {
          assistantContent += chunk;
          // Queue chunk into the smooth buffer instead of rendering immediately
          smoothBufferRef.current += chunk;
        },
        onSources: (s) => {
          sources = s;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, sources } : m))
          );
        },
        onDone: () => {
          // Mark stream as done — the smooth timer will clean up once buffer is empty
          smoothDoneRef.current = true;
          // If buffer is already empty, clean up now
          if (smoothBufferRef.current.length === 0) {
            if (smoothTimerRef.current) {
              clearInterval(smoothTimerRef.current);
              smoothTimerRef.current = null;
            }
            setIsStreaming(false);
            abortRef.current = null;
          }
        },
        onError: (err) => {
          // On error, flush buffer immediately and stop
          if (smoothTimerRef.current) {
            clearInterval(smoothTimerRef.current);
            smoothTimerRef.current = null;
          }
          if (smoothBufferRef.current.length > 0) {
            smoothShownRef.current += smoothBufferRef.current;
            smoothBufferRef.current = '';
            const shown = smoothShownRef.current;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: shown } : m
              )
            );
          }
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

  /**
   * Reset session (for kiosk mode) — clears all state and storage
   */
  const resetSession = useCallback(() => {
    // Disconnect SSE
    sseDisconnectRef.current?.();
    sseDisconnectRef.current = null;

    // Abort any in-flight stream
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    if (smoothTimerRef.current) {
      clearInterval(smoothTimerRef.current);
      smoothTimerRef.current = null;
    }
    smoothBufferRef.current = '';
    smoothShownRef.current = '';
    smoothDoneRef.current = false;

    // Clear all state
    setMessages([]);
    setThreadId(null);
    setError(null);
    setIsLoading(false);
    setIsStreaming(false);
    setPreChatSubmittedState(false);
    knownMessageIdsRef.current.clear();
    sessionCreatedRef.current = false;

    // Clear storage
    clearSessionToken(embedId);
    setPreChatSubmitted(embedId, false);
  }, [embedId]);

  /**
   * Add a voice message to the chat (injected in real-time during voice call).
   * These appear behind the voice overlay and become visible when the call ends.
   */
  const addVoiceMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const msg: Message = {
      id: `voice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
  }, []);

  /**
   * Reload messages from server (used after voice call ends to show transcript in chat)
   */
  const reloadHistory = useCallback(async () => {
    if (!clientRef.current || !hasExistingSession(embedId)) return;
    try {
      const result = await clientRef.current.getHistory();
      if (result.messages.length > 0) {
        setMessages(result.messages);
        for (const m of result.messages) {
          knownMessageIdsRef.current.add(m.id);
        }
      }
    } catch (err) {
      console.debug('Failed to reload history:', err);
    }
  }, [embedId]);

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
    resetSession,
    reloadHistory,
    addVoiceMessage,
    setThreadId,
  };
}
