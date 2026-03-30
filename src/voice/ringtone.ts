// ============================================================================
// Ringtone — UK-style phone ring generated via Web Audio API
// Pattern: 400Hz+450Hz dual tone, 0.4s on / 0.2s off / 0.4s on / 2s off
// ============================================================================

export function startRingtone(audioContext: AudioContext): () => void {
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(audioContext.destination);

  // Dual-tone: 400Hz + 450Hz (UK ring pattern)
  const osc1 = audioContext.createOscillator();
  osc1.frequency.value = 400;
  osc1.type = 'sine';
  osc1.connect(gainNode);
  osc1.start();

  const osc2 = audioContext.createOscillator();
  osc2.frequency.value = 450;
  osc2.type = 'sine';
  osc2.connect(gainNode);
  osc2.start();

  // Schedule ring pattern: 0.4s on, 0.2s off, 0.4s on, 2s off (3s cycle)
  const VOLUME = 0.15;
  const CYCLE = 3.0;
  let stopped = false;

  function scheduleRings(startTime: number) {
    if (stopped) return;

    // Schedule 4 cycles ahead to stay smooth
    for (let c = 0; c < 4; c++) {
      const t = startTime + c * CYCLE;
      // First burst: 0.4s
      gainNode.gain.setValueAtTime(VOLUME, t);
      gainNode.gain.setValueAtTime(0, t + 0.4);
      // Gap: 0.2s
      // Second burst: 0.4s
      gainNode.gain.setValueAtTime(VOLUME, t + 0.6);
      gainNode.gain.setValueAtTime(0, t + 1.0);
      // Silence: 2s until next cycle
    }

    // Re-schedule before the 4 cycles finish
    setTimeout(() => scheduleRings(startTime + 4 * CYCLE), (4 * CYCLE - 1) * 1000);
  }

  scheduleRings(audioContext.currentTime);

  return () => {
    stopped = true;
    gainNode.gain.cancelScheduledValues(0);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    osc1.stop();
    osc2.stop();
  };
}
