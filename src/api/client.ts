// ============================================================================
// API Client
// ============================================================================

import type { EmbedConfigPublic, Message, ChatResponse, Source } from '../types';
import { getSessionToken, setSessionToken } from '../storage/session';

export class ApiClient {
  private baseUrl: string;
  private embedId: string;

  constructor(baseUrl: string, embedId: string) {
    this.baseUrl = baseUrl;
    this.embedId = embedId;
  }

  /**
   * Make an authenticated fetch request
   */
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/embed/${this.embedId}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = getSessionToken(this.embedId);
    if (token) {
      headers['X-Embed-Session'] = token;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const err = new Error(data.error || 'Request failed');
      (err as any).code = data.code;
      throw err;
    }

    return data.data;
  }

  /**
   * Get embed configuration
   */
  async getConfig(): Promise<EmbedConfigPublic> {
    return this.fetch<EmbedConfigPublic>('/config');
  }

  /**
   * Create a new session
   */
  async createSession(): Promise<{ session_token: string; config: EmbedConfigPublic }> {
    const result = await this.fetch<{ session_token: string; config: EmbedConfigPublic }>(
      '/session',
      { method: 'POST' }
    );
    setSessionToken(this.embedId, result.session_token);
    return result;
  }

  /**
   * Submit pre-chat form
   */
  async submitPreChat(fields: Record<string, string>): Promise<void> {
    await this.fetch('/pre-chat', {
      method: 'POST',
      body: JSON.stringify({ fields }),
    });
  }

  /**
   * Send a chat message (non-streaming)
   */
  async sendMessage(message: string): Promise<ChatResponse> {
    return this.fetch<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  /**
   * Stream a chat message via SSE
   * Returns an abort function
   */
  streamMessage(
    message: string,
    callbacks: {
      onStart?: (threadId: string, messageId: string) => void;
      onChunk?: (content: string) => void;
      onSources?: (sources: Source[]) => void;
      onDone?: (messageId: string) => void;
      onError?: (error: string) => void;
    }
  ): () => void {
    const url = `${this.baseUrl}/embed/${this.embedId}/stream`;
    const token = getSessionToken(this.embedId);

    const controller = new AbortController();

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(token ? { 'X-Embed-Session': token } : {}),
      },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          let errorMsg = 'Stream failed';
          try {
            const data = await response.json();
            errorMsg = data.error || errorMsg;
          } catch {
            // Response may not be JSON
          }
          throw new Error(errorMsg);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;

            // Parse SSE event
            const eventMatch = line.match(/^event:\s*(\w+)/m);
            const dataMatch = line.match(/^data:\s*(.+)$/m);

            if (!dataMatch) continue;

            const eventType = eventMatch ? eventMatch[1] : 'message';

            let data: unknown;
            try {
              data = JSON.parse(dataMatch[1]);
            } catch {
              continue;
            }

            switch (eventType) {
              case 'start':
                callbacks.onStart?.(
                  (data as { thread_id: string }).thread_id,
                  (data as { message_id: string }).message_id
                );
                break;
              case 'chunk':
                callbacks.onChunk?.((data as { content: string }).content);
                break;
              case 'sources':
                callbacks.onSources?.((data as { sources: Source[] }).sources);
                break;
              case 'done':
                callbacks.onDone?.((data as { message_id: string }).message_id);
                break;
              case 'error':
                callbacks.onError?.((data as { error: string }).error);
                break;
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          callbacks.onError?.(err.message);
        }
      });

    return () => controller.abort();
  }

  /**
   * Get chat history
   */
  async getHistory(limit = 50, offset = 0): Promise<{ messages: Message[]; has_more: boolean }> {
    return this.fetch(`/history?limit=${limit}&offset=${offset}`);
  }

  /**
   * Submit feedback
   */
  async submitFeedback(
    messageId: string,
    rating: 'positive' | 'negative',
    comment?: string
  ): Promise<void> {
    await this.fetch('/feedback', {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId, rating, comment }),
    });
  }
}
