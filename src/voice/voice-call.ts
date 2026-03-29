// ============================================================================
// VoiceCall — Core voice call class for embed widget
// Ported from GeminiLivePlayground with mobile browser mitigations.
// Uses Google GenAI SDK for direct WebSocket to Gemini Live API.
// ============================================================================

import { GoogleGenAI, Modality, Type } from '@google/genai';

interface VoiceCallConfig {
  apiKey: string;
  model: string;
  systemInstruction: string;
  voiceName: string;
  threadId: string;
  buddyName: string;
  companyName: string;
}

interface VoiceCallCallbacks {
  onStateChange: (state: string) => void;
  onTranscript: (role: 'user' | 'assistant', text: string, partial?: boolean) => void;
  onMicVolume: (level: number) => void;
  onPlaybackVolume: (level: number) => void;
  onError: (message: string) => void;
  onEnd: (reason: string) => void;
}

export class VoiceCall {
  private config: VoiceCallConfig | null = null;
  private callbacks: VoiceCallCallbacks;
  private apiUrl: string;
  private embedId: string;
  private sessionToken: string | null;
  private existingThreadId: string | null = null;

  private session: any = null;
  private captureContext: AudioContext | null = null;
  private playbackContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scheduledTime = 0;

  private startTime = 0;
  private turnCount = 0;
  private userTranscript = '';
  private modelTranscript = '';

  private visibilityTimer: ReturnType<typeof setTimeout> | null = null;
  private wakeLock: any = null;
  private ended = false;

  constructor(
    apiUrl: string,
    embedId: string,
    sessionToken: string | null,
    callbacks: VoiceCallCallbacks,
    existingThreadId?: string | null
  ) {
    this.apiUrl = apiUrl;
    this.embedId = embedId;
    this.sessionToken = sessionToken;
    this.callbacks = callbacks;
    this.existingThreadId = existingThreadId || null;
  }

  // ─── Init: Call backend to get Gemini config ─────────────────────────
  async init(): Promise<{ allowed: boolean; reason?: string }> {
    this.callbacks.onStateChange('loading');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.sessionToken) {
      headers['X-Embed-Session'] = this.sessionToken;
    }

    const res = await fetch(`${this.apiUrl}/embed/${this.embedId}/voice/init`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        threadId: this.existingThreadId || undefined,
      }),
    });

    const data = await res.json() as any;

    if (!data.allowed) {
      return { allowed: false, reason: data.reason || 'unavailable' };
    }

    // Store session token if server created one for us
    if (data.sessionToken && !this.sessionToken) {
      this.sessionToken = data.sessionToken;
      // Persist to localStorage so subsequent requests use it
      try {
        const key = `mendbuddy_session_${this.embedId}`;
        localStorage.setItem(key, data.sessionToken);
      } catch { /* ignore */ }
    }

    this.config = {
      apiKey: data.apiKey,
      model: data.model,
      systemInstruction: data.systemInstruction,
      voiceName: data.voiceName,
      threadId: data.threadId,
      buddyName: data.buddyName,
      companyName: data.companyName,
    };

    return { allowed: true };
  }

  // ─── Connect: Establish Gemini Live session + mic capture ────────────
  async connect(): Promise<void> {
    if (!this.config) throw new Error('Call init() first');

    this.callbacks.onStateChange('connecting');
    this.startTime = Date.now();
    this.ended = false;

    // Request wake lock (Android Chrome — prevents screen dimming)
    this.requestWakeLock();

    // Listen for visibility changes (mobile backgrounding)
    this.setupVisibilityHandler();

    // Create audio contexts
    this.playbackContext = new AudioContext();
    this.scheduledTime = this.playbackContext.currentTime;

    // Connect to Gemini
    const client = new GoogleGenAI({ apiKey: this.config.apiKey });

    this.session = await client.live.connect({
      model: this.config.model,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: this.config.voiceName } },
        },
        systemInstruction: { parts: [{ text: this.config.systemInstruction }] },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      tools: [{
        functionDeclarations: [{
          name: 'search_knowledge_base',
          description: 'Search the business knowledge base for pricing, services, repair information, buyback values, device availability, or any specific business information.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              query: {
                type: Type.STRING,
                description: 'A search query rewritten from the customer question',
              },
            },
            required: ['query'],
          },
        }],
      }],
    });

    // Handle messages
    this.session.on('message', (msg: any) => this.handleMessage(msg));
    this.session.on('error', (err: any) => {
      console.error('[VoiceCall] session error:', err);
      this.callbacks.onError('Connection error');
      this.disconnect('error');
    });

    this.callbacks.onStateChange('ready');

    // Start mic capture
    await this.startMicCapture();
  }

  // ─── Mic capture with AudioWorklet ───────────────────────────────────
  private async startMicCapture(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });

    this.captureContext = new AudioContext({ sampleRate: 16000 });

    // Register inline worklet
    const workletCode = `
      class CaptureProcessor extends AudioWorkletProcessor {
        constructor() { super(); this._buf = []; this._vol = 0; this._tick = 0; }
        process(inputs) {
          const ch = inputs[0]?.[0];
          if (!ch) return true;
          let sum = 0;
          for (let i = 0; i < ch.length; i++) {
            this._buf.push(Math.max(-1, Math.min(1, ch[i])) * 32767 | 0);
            sum += ch[i] * ch[i];
          }
          this._tick++;
          if (this._tick % 10 === 0) {
            this._vol = Math.sqrt(sum / ch.length);
            this.port.postMessage({ type: 'volume', level: this._vol });
          }
          if (this._buf.length >= 2048) {
            const pcm = new Int16Array(this._buf.splice(0, 2048));
            this.port.postMessage({ type: 'audio', pcm }, [pcm.buffer]);
          }
          return true;
        }
      }
      registerProcessor('capture-processor', CaptureProcessor);
    `;
    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await this.captureContext.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    const source = this.captureContext.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(this.captureContext, 'capture-processor');

    this.workletNode.port.onmessage = (e) => {
      if (e.data.type === 'volume') {
        this.callbacks.onMicVolume(Math.min(1, e.data.level * 5));
      } else if (e.data.type === 'audio' && this.session && !this.ended) {
        // Convert Int16 PCM to base64
        const bytes = new Uint8Array(e.data.pcm.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        this.session.sendRealtimeInput({
          data: b64,
          mimeType: 'audio/pcm;rate=16000',
        });
      }
    };

    source.connect(this.workletNode);
    this.workletNode.connect(this.captureContext.destination);

    this.callbacks.onStateChange('listening');
  }

  // ─── Handle Gemini messages ──────────────────────────────────────────
  private async handleMessage(msg: any): Promise<void> {
    if (this.ended) return;

    // Audio data → playback
    if (msg.data?.modelTurn?.parts) {
      for (const part of msg.data.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.callbacks.onStateChange('speaking');
          this.playAudio(part.inlineData.data);
        }
      }
    }

    // Transcription events
    if (msg.data?.inputTranscription?.text) {
      this.userTranscript = msg.data.inputTranscription.text;
      this.callbacks.onTranscript('user', this.userTranscript, true);
    }
    if (msg.data?.outputTranscription?.text) {
      this.modelTranscript += msg.data.outputTranscription.text;
      this.callbacks.onTranscript('assistant', this.modelTranscript, true);
    }

    // Tool call (RAG)
    if (msg.data?.toolCall) {
      for (const fc of msg.data.toolCall.functionCalls || []) {
        if (fc.name === 'search_knowledge_base') {
          const query = fc.args?.query || '';
          try {
            const res = await fetch(`${this.apiUrl}/embed/${this.embedId}/voice/rag`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Embed-Session': this.sessionToken,
              },
              body: JSON.stringify({ query }),
            });
            const ragData = await res.json() as any;
            this.session.sendToolResponse({
              functionResponses: [{
                id: fc.id,
                name: fc.name,
                response: { context: ragData.context || 'No results found.' },
              }],
            });
          } catch (err) {
            this.session.sendToolResponse({
              functionResponses: [{
                id: fc.id,
                name: fc.name,
                response: { context: 'Knowledge base lookup failed.' },
              }],
            });
          }
        }
      }
    }

    // Turn complete
    if (msg.data?.turnComplete) {
      this.turnCount++;
      this.callbacks.onStateChange('listening');

      // Save turn to backend
      if (this.userTranscript || this.modelTranscript) {
        this.saveTurn(this.userTranscript, this.modelTranscript);
        // Finalize transcripts
        if (this.userTranscript) {
          this.callbacks.onTranscript('user', this.userTranscript, false);
        }
        if (this.modelTranscript) {
          this.callbacks.onTranscript('assistant', this.modelTranscript, false);
        }
      }
      this.userTranscript = '';
      this.modelTranscript = '';
    }

    // Setup complete
    if (msg.data?.setupComplete) {
      this.callbacks.onStateChange('ready');
    }
  }

  // ─── Audio playback (24kHz PCM → browser sample rate) ────────────────
  private playAudio(base64Data: string): void {
    if (!this.playbackContext) return;

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pcm16 = new Int16Array(bytes.buffer);

    // Convert to float32
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;

    // Resample 24kHz → browser sample rate
    const inputRate = 24000;
    const outputRate = this.playbackContext.sampleRate;
    const ratio = outputRate / inputRate;
    const outputLen = Math.round(float32.length * ratio);
    const resampled = new Float32Array(outputLen);

    for (let i = 0; i < outputLen; i++) {
      const srcIdx = i / ratio;
      const idx = Math.floor(srcIdx);
      const frac = srcIdx - idx;
      const a = float32[idx] || 0;
      const b = float32[Math.min(idx + 1, float32.length - 1)] || 0;
      resampled[i] = a + frac * (b - a);
    }

    // Calculate volume for UI
    let sum = 0;
    for (let i = 0; i < resampled.length; i++) sum += resampled[i] * resampled[i];
    this.callbacks.onPlaybackVolume(Math.min(1, Math.sqrt(sum / resampled.length) * 5));

    // Schedule playback
    const buffer = this.playbackContext.createBuffer(1, resampled.length, outputRate);
    buffer.copyToChannel(resampled, 0);
    const source = this.playbackContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackContext.destination);

    const now = this.playbackContext.currentTime;
    const startAt = Math.max(now, this.scheduledTime);
    source.start(startAt);
    this.scheduledTime = startAt + buffer.duration;
  }

  // ─── Save turn to backend ────────────────────────────────────────────
  private async saveTurn(userText: string, modelText: string): Promise<void> {
    if (!this.config) return;
    try {
      await fetch(`${this.apiUrl}/embed/${this.embedId}/voice/turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Embed-Session': this.sessionToken,
        },
        body: JSON.stringify({
          threadId: this.config.threadId,
          userTranscript: userText,
          modelTranscript: modelText,
        }),
      });
    } catch (err) {
      console.error('[VoiceCall] Failed to save turn:', err);
    }
  }

  // ─── Mute/unmute ─────────────────────────────────────────────────────
  mute(): void {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((t) => (t.enabled = false));
    }
  }

  unmute(): void {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((t) => (t.enabled = true));
    }
  }

  // ─── Disconnect ──────────────────────────────────────────────────────
  async disconnect(reason = 'user_ended'): Promise<void> {
    if (this.ended) return;
    this.ended = true;

    const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);

    // Close Gemini session
    try { this.session?.close(); } catch {}

    // Stop mic
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.captureContext) {
      try { this.captureContext.close(); } catch {}
      this.captureContext = null;
    }
    if (this.playbackContext) {
      try { this.playbackContext.close(); } catch {}
      this.playbackContext = null;
    }

    // Release wake lock
    this.releaseWakeLock();

    // Remove visibility handler
    this.removeVisibilityHandler();

    // Log call end to backend
    if (this.config) {
      try {
        await fetch(`${this.apiUrl}/embed/${this.embedId}/voice/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Embed-Session': this.sessionToken,
          },
          body: JSON.stringify({
            threadId: this.config.threadId,
            sessionId: `embed_${this.embedId}_${Date.now()}`,
            durationSeconds,
            totalTurns: this.turnCount,
            endReason: reason,
          }),
        });
      } catch (err) {
        console.error('[VoiceCall] Failed to log call end:', err);
      }
    }

    this.callbacks.onStateChange(reason === 'error' ? 'error' : 'ended');
    this.callbacks.onEnd(reason);
  }

  // ─── Mobile Mitigations ──────────────────────────────────────────────

  private visibilityHandler = () => {
    if (document.hidden) {
      // Page went to background — start 15s grace timer
      this.visibilityTimer = setTimeout(() => {
        this.disconnect('background_timeout');
      }, 15000);
    } else {
      // Page came back — cancel timer
      if (this.visibilityTimer) {
        clearTimeout(this.visibilityTimer);
        this.visibilityTimer = null;
      }
    }
  };

  private setupVisibilityHandler(): void {
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private removeVisibilityHandler(): void {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
      this.visibilityTimer = null;
    }
  }

  private async requestWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // Wake Lock not supported or denied — ignore
    }
  }

  private releaseWakeLock(): void {
    try {
      this.wakeLock?.release();
    } catch {}
    this.wakeLock = null;
  }
}
