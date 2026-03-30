// ============================================================================
// VoiceCall — Plain WebSocket client for embed voice calls
// Connects to the server-side DO proxy (no direct Gemini connection).
// No API key, no system instruction, no @google/genai SDK needed.
// ============================================================================

import { startRingtone } from './ringtone';

interface VoiceCallConfig {
  threadId: string;
  buddyName: string;
  companyName: string;
  ringEnabled: boolean;
  ringDuration: number;
  ringCountry: string;
}

interface VoiceCallCallbacks {
  onStateChange: (state: string) => void;
  onTranscript: (role: 'user' | 'assistant', text: string, partial?: boolean) => void;
  onMicVolume: (level: number) => void;
  onPlaybackVolume: (level: number) => void;
  onError: (message: string) => void;
  onEnd: (reason: string) => void;
}

type InternalState =
  | 'loading' | 'ringing' | 'connecting' | 'ready'
  | 'speaking' | 'listening' | 'ended' | 'error';

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

  private visibilityTimer: ReturnType<typeof setTimeout> | null = null;
  private wakeLock: any = null;
  private ended = false;
  private isSpeaking = false;

  // State machine
  private state: InternalState = 'loading';
  private audioQueue: string[] = [];         // Buffered audio during ringing/transitions
  private micReady = false;                  // Server sent 'ready', mic can be wired
  private micWired = false;                  // AudioWorklet is connected

  // Ringing
  private ringStartTime = 0;
  private ringContext: AudioContext | null = null; // Separate context for ringtone
  private stopRingtone: (() => void) | null = null;
  private ringTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingTurnComplete = false;            // turn_complete arrived during ringing

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

  // ─── Single point of state control ──────────────────────────────────
  private setState(next: InternalState): void {
    if (this.state === next) return;
    this.state = next;
    this.callbacks.onStateChange(next);
  }

  // ─── Init ───────────────────────────────────────────────────────────
  async init(): Promise<{ allowed: boolean; reason?: string }> {
    this.setState('loading');

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
        ringEnabled: preData.ringEnabled ?? true,
        ringDuration: preData.ringDuration ?? 3,
        ringCountry: preData.ringCountry || '',
      };
    } catch {
      return { allowed: false, reason: 'network_error' };
    }

    return { allowed: true, threadId: this.config.threadId } as any;
  }

  // ─── Connect ────────────────────────────────────────────────────────
  async connect(): Promise<void> {
    if (!this.config) throw new Error('Call init() first');

    this.ended = false;
    this.audioQueue = [];
    this.micReady = false;
    this.micWired = false;

    this.requestWakeLock();
    this.setupVisibilityHandler();

    // Request mic permission NOW during user gesture
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });

    // Create playback context during user gesture
    this.playbackContext = new AudioContext();
    this.scheduledTime = this.playbackContext.currentTime;

    // Start ringing or go straight to connecting
    if (this.config.ringEnabled) {
      this.setState('ringing');
      this.ringStartTime = Date.now();
      this.ringContext = new AudioContext();
      this.stopRingtone = startRingtone(this.ringContext, this.config.ringCountry);

      this.ringTimer = setTimeout(() => {
        if (this.state === 'ringing') {
          this.transitionFromRinging();
        }
      }, this.config.ringDuration * 1000);
    } else {
      this.setState('connecting');
    }

    // Open WebSocket
    const wsProtocol = this.apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsBase = this.apiUrl.replace(/^https?/, wsProtocol);
    let wsUrl = `${wsBase}/embed/${this.embedId}/voice/ws`;
    const wsParams = new URLSearchParams();
    if (this.sessionToken) wsParams.set('session', this.sessionToken);
    const threadId = this.config.threadId || this.existingThreadId;
    if (threadId) wsParams.set('threadId', threadId);
    const paramStr = wsParams.toString();
    if (paramStr) wsUrl += `?${paramStr}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      try { this.handleServerMessage(JSON.parse(event.data)); } catch {}
    };

    this.ws.onerror = () => {
      this.callbacks.onError('Connection error');
      this.disconnect('error');
    };

    this.ws.onclose = () => {
      if (!this.ended) this.disconnect('connection_lost');
    };

    await new Promise<void>((resolve, reject) => {
      if (!this.ws) return reject(new Error('No WebSocket'));
      this.ws.onopen = () => resolve();
      setTimeout(() => reject(new Error('WebSocket timeout')), 10000);
    });
  }

  // ─── Ringing → Connecting → Connected → Speaking ────────────────────
  private transitionFromRinging(): void {
    // Stop ringtone and close its AudioContext
    this.stopRingtone?.();
    this.stopRingtone = null;
    try { this.ringContext?.close(); } catch {}
    this.ringContext = null;
    if (this.ringTimer) { clearTimeout(this.ringTimer); this.ringTimer = null; }

    this.setState('connecting');

    setTimeout(() => {
      if (this.ended) return;
      this.setState('ready'); // "Connected"

      setTimeout(() => {
        if (this.ended) return;
        this.playBufferedAudio();
      }, 500);
    }, 300);
  }

  // ─── Play queued audio and wire mic ─────────────────────────────────
  private playBufferedAudio(): void {
    this.isSpeaking = true;
    this.setState('speaking');

    // Play everything queued
    for (const b64 of this.audioQueue) {
      this.playAudio(b64);
    }
    this.audioQueue = [];

    // Wire mic if ready
    if (this.micReady && !this.micWired) {
      this.wireMic();
    }

    // If turn_complete arrived during ringing, transition to listening after audio plays
    if (this.pendingTurnComplete) {
      this.pendingTurnComplete = false;
      if (this.playbackContext && this.scheduledTime > this.playbackContext.currentTime) {
        const remaining = (this.scheduledTime - this.playbackContext.currentTime) * 1000;
        setTimeout(() => {
          this.isSpeaking = false;
          if (!this.ended) this.setState('listening');
        }, remaining);
      } else {
        this.isSpeaking = false;
        this.setState('listening');
      }
    }
  }

  // ─── Handle server messages ─────────────────────────────────────────
  private handleServerMessage(msg: any): void {
    if (this.ended) return;

    switch (msg.type) {
      case 'ready':
        this.micReady = true;
        // Only wire mic + change state if past the greeting phase
        if (this.state === 'listening' || this.state === 'speaking') {
          if (!this.micWired) this.wireMic();
        } else if (this.state === 'connecting') {
          // Non-ringing path: connecting → ready → listening
          this.setState('ready');
          this.wireMic();
        }
        break;

      case 'audio':
        // During ringing or transition: buffer
        if (this.state === 'ringing' || this.state === 'connecting' || this.state === 'ready') {
          this.audioQueue.push(msg.data);

          // If ringing and ring time elapsed, start transition
          if (this.state === 'ringing' && this.config) {
            const elapsed = Date.now() - this.ringStartTime;
            if (elapsed >= this.config.ringDuration * 1000) {
              this.transitionFromRinging();
            }
          }
          break;
        }
        // Normal play
        this.isSpeaking = true;
        this.setState('speaking');
        this.playAudio(msg.data);
        break;

      case 'transcript':
        this.callbacks.onTranscript(
          msg.speaker === 'user' ? 'user' : 'assistant',
          msg.text,
          msg.partial !== false
        );
        // No state change from transcripts — only audio and turn_complete drive state
        break;

      case 'interrupted':
        // Ignore during ringing/transition — greeting hasn't played yet
        if (this.state === 'ringing' || this.state === 'connecting' || this.state === 'ready') break;
        this.isSpeaking = false;
        this.stopPlayback();
        this.setState('listening');
        break;

      case 'turn_complete':
        // During ringing/transition: store it, replay after greeting audio plays
        if (this.state === 'ringing' || this.state === 'connecting' || this.state === 'ready') {
          this.pendingTurnComplete = true;
          break;
        }
        if (this.playbackContext && this.scheduledTime > this.playbackContext.currentTime) {
          const remaining = (this.scheduledTime - this.playbackContext.currentTime) * 1000;
          setTimeout(() => {
            this.isSpeaking = false;
            if (!this.ended) this.setState('listening');
          }, remaining);
        } else {
          this.isSpeaking = false;
          this.setState('listening');
        }
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

  // ─── Wire mic capture ───────────────────────────────────────────────
  private wireMic(): void {
    if (this.micWired) return;
    this.micWired = true;

    this.startMicCapture().catch((err) => {
      console.error('[VoiceCall] Mic capture failed:', err);
      this.callbacks.onError('Microphone access failed');
      this.disconnect('error');
    });
  }

  private async startMicCapture(): Promise<void> {
    if (!this.mediaStream) {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    }

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
        this.ws.send(JSON.stringify({ type: 'audio', data: b64 }));
      }
    };

    source.connect(this.workletNode);
    this.workletNode.connect(this.captureContext.destination);

    // Don't change state here — caller decides
  }

  // ─── Audio playback ─────────────────────────────────────────────────
  private stopPlayback(): void {
    if (this.playbackContext) {
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

  // ─── Mute/unmute ────────────────────────────────────────────────────
  mute(): void {
    this.mediaStream?.getAudioTracks().forEach((t) => (t.enabled = false));
  }

  unmute(): void {
    this.mediaStream?.getAudioTracks().forEach((t) => (t.enabled = true));
  }

  // ─── Disconnect ─────────────────────────────────────────────────────
  async disconnect(reason = 'user_ended'): Promise<void> {
    if (this.ended) return;
    this.ended = true;

    this.stopRingtone?.();
    this.stopRingtone = null;
    try { this.ringContext?.close(); } catch {}
    this.ringContext = null;
    if (this.ringTimer) { clearTimeout(this.ringTimer); this.ringTimer = null; }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.workletNode) { this.workletNode.disconnect(); this.workletNode = null; }
    if (this.captureContext) { try { this.captureContext.close(); } catch {} this.captureContext = null; }
    if (this.playbackContext) { try { this.playbackContext.close(); } catch {} this.playbackContext = null; }

    try { this.ws?.close(1000, reason); } catch {}
    this.ws = null;

    this.releaseWakeLock();
    this.removeVisibilityHandler();

    this.setState(reason === 'error' ? 'error' : 'ended');
    this.callbacks.onEnd(reason);
  }

  // ─── Mobile Mitigations ─────────────────────────────────────────────
  private visibilityHandler = () => {
    if (document.hidden) {
      this.visibilityTimer = setTimeout(() => this.disconnect('background_timeout'), 15000);
    } else if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
      this.visibilityTimer = null;
    }
  };

  private setupVisibilityHandler(): void {
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private removeVisibilityHandler(): void {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (this.visibilityTimer) { clearTimeout(this.visibilityTimer); this.visibilityTimer = null; }
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
