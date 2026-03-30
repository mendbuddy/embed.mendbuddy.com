// ============================================================================
// VoiceCall — Plain WebSocket client for embed voice calls
// Connects to the server-side DO proxy (no direct Gemini connection).
// No API key, no system instruction, no @google/genai SDK needed.
// ============================================================================

interface VoiceCallConfig {
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

  private ws: WebSocket | null = null;
  private captureContext: AudioContext | null = null;
  private playbackContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scheduledTime = 0;

  private startTime = 0;
  private visibilityTimer: ReturnType<typeof setTimeout> | null = null;
  private wakeLock: any = null;
  private ended = false;
  private isSpeaking = false; // Suppress mic while AI audio is playing (prevents echo on mobile)

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

  // ─── Init + Connect via WebSocket ────────────────────────────────────
  async init(): Promise<{ allowed: boolean; reason?: string }> {
    this.callbacks.onStateChange('loading');

    // Build WebSocket URL — the server does all the setup (session, prompt, Gemini connection)
    const wsProtocol = this.apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsBase = this.apiUrl.replace(/^https?/, wsProtocol);
    let wsUrl = `${wsBase}/embed/${this.embedId}/voice/ws`;

    if (this.existingThreadId) {
      wsUrl += `?threadId=${encodeURIComponent(this.existingThreadId)}`;
    }

    // Check if voice is available before upgrading (can't send JSON error over WS upgrade)
    // Do a preflight check via the init endpoint
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.sessionToken) headers['X-Embed-Session'] = this.sessionToken;

      const preCheck = await fetch(`${this.apiUrl}/embed/${this.embedId}/voice/init`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ threadId: this.existingThreadId || undefined }),
      });
      const preData = await preCheck.json() as any;

      if (!preData.allowed) {
        return { allowed: false, reason: preData.reason || 'unavailable' };
      }

      // Store session token if server created one
      if (preData.sessionToken && !this.sessionToken) {
        this.sessionToken = preData.sessionToken;
        try {
          localStorage.setItem(`mendbuddy_session_${this.embedId}`, preData.sessionToken);
        } catch {}
      }

      this.config = {
        threadId: preData.threadId,
        buddyName: preData.buddyName,
        companyName: preData.companyName,
      };
    } catch (err) {
      return { allowed: false, reason: 'network_error' };
    }

    return { allowed: true };
  }

  async connect(): Promise<void> {
    if (!this.config) throw new Error('Call init() first');

    this.callbacks.onStateChange('connecting');
    this.startTime = Date.now();
    this.ended = false;

    this.requestWakeLock();
    this.setupVisibilityHandler();

    // Create playback context
    this.playbackContext = new AudioContext();
    this.scheduledTime = this.playbackContext.currentTime;

    // Connect WebSocket to our DO proxy (NOT to Gemini directly)
    const wsProtocol = this.apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsBase = this.apiUrl.replace(/^https?/, wsProtocol);
    let wsUrl = `${wsBase}/embed/${this.embedId}/voice/ws`;
    if (this.existingThreadId) {
      wsUrl += `?threadId=${encodeURIComponent(this.existingThreadId)}`;
    }

    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data);
        this.handleServerMessage(msg);
      } catch {}
    };

    this.ws.onerror = () => {
      this.callbacks.onError('Connection error');
      this.disconnect('error');
    };

    this.ws.onclose = () => {
      if (!this.ended) {
        this.disconnect('connection_lost');
      }
    };

    // Wait for WebSocket to open
    await new Promise<void>((resolve, reject) => {
      if (!this.ws) return reject(new Error('No WebSocket'));
      this.ws.onopen = () => resolve();
      setTimeout(() => reject(new Error('WebSocket timeout')), 10000);
    });
  }

  // ─── Handle messages from DO proxy ──────────────────────────────────
  private handleServerMessage(msg: any): void {
    if (this.ended) return;

    switch (msg.type) {
      case 'ready':
        this.callbacks.onStateChange('ready');
        this.startMicCapture().catch((err) => {
          console.error('[VoiceCall] Mic capture failed:', err);
          this.callbacks.onError('Microphone access failed');
          this.disconnect('error');
        });
        break;

      case 'audio':
        this.isSpeaking = true;
        this.callbacks.onStateChange('speaking');
        this.playAudio(msg.data);
        break;

      case 'transcript':
        this.callbacks.onTranscript(
          msg.speaker === 'user' ? 'user' : 'assistant',
          msg.text,
          msg.partial !== false
        );
        // Only switch to listening if AI isn't currently speaking
        if (msg.speaker === 'user' && !this.isSpeaking) {
          this.callbacks.onStateChange('listening');
        }
        break;

      case 'interrupted':
        this.isSpeaking = false;
        this.stopPlayback();
        this.callbacks.onStateChange('listening');
        break;

      case 'turn_complete':
        this.isSpeaking = false;
        this.callbacks.onStateChange('listening');
        break;

      case 'error':
        this.callbacks.onError(msg.message || 'An error occurred');
        this.disconnect('error');
        break;

      case 'ended':
        this.disconnect(msg.reason || 'server_ended');
        break;
    }
  }

  // ─── Mic capture with AudioWorklet ───────────────────────────────────
  private async startMicCapture(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });

    this.captureContext = new AudioContext({ sampleRate: 16000 });

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
      } else if (e.data.type === 'audio' && this.ws && this.ws.readyState === WebSocket.OPEN && !this.ended) {
        const bytes = new Uint8Array(e.data.pcm.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        // Send audio to DO proxy (DO forwards to Gemini)
        this.ws.send(JSON.stringify({ type: 'audio', data: b64 }));
      }
    };

    source.connect(this.workletNode);
    this.workletNode.connect(this.captureContext.destination);

    this.callbacks.onStateChange('listening');
  }

  // ─── Audio playback (24kHz PCM → browser sample rate) ────────────────
  // Stop all scheduled audio playback (used on interruption)
  private stopPlayback(): void {
    if (this.playbackContext) {
      // Reset scheduled time to now — any already-scheduled sources will finish
      // but nothing new will be queued ahead
      this.scheduledTime = this.playbackContext.currentTime;
      this.callbacks.onPlaybackVolume(0);
    }
  }

  private playAudio(base64Data: string): void {
    if (!this.playbackContext) return;

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pcm16 = new Int16Array(bytes.buffer);

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

    // Volume for UI
    let sum = 0;
    for (let i = 0; i < resampled.length; i++) sum += resampled[i] * resampled[i];
    this.callbacks.onPlaybackVolume(Math.min(1, Math.sqrt(sum / resampled.length) * 5));

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

  // ─── Mute/unmute ─────────────────────────────────────────────────────
  mute(): void {
    this.mediaStream?.getAudioTracks().forEach((t) => (t.enabled = false));
  }

  unmute(): void {
    this.mediaStream?.getAudioTracks().forEach((t) => (t.enabled = true));
  }

  // ─── Disconnect ──────────────────────────────────────────────────────
  async disconnect(reason = 'user_ended'): Promise<void> {
    if (this.ended) return;
    this.ended = true;

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

    // Close WebSocket (DO handles cleanup, usage logging, call end)
    try { this.ws?.close(1000, reason); } catch {}
    this.ws = null;

    this.releaseWakeLock();
    this.removeVisibilityHandler();

    this.callbacks.onStateChange(reason === 'error' ? 'error' : 'ended');
    this.callbacks.onEnd(reason);
  }

  // ─── Mobile Mitigations ──────────────────────────────────────────────

  private visibilityHandler = () => {
    if (document.hidden) {
      this.visibilityTimer = setTimeout(() => {
        this.disconnect('background_timeout');
      }, 15000);
    } else {
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
    } catch {}
  }

  private releaseWakeLock(): void {
    try { this.wakeLock?.release(); } catch {}
    this.wakeLock = null;
  }
}
