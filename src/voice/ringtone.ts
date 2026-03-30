// ============================================================================
// Ringtone — Country-specific phone ring tones via Web Audio API
// Based on ITU-T E.180 recommendations and national telephony standards.
// ============================================================================

interface RingPattern {
  frequencies: number[];      // Hz (1 or 2 tones)
  cadence: number[];          // alternating on/off durations in ms, e.g. [400, 200, 400, 2000]
}

// Country ring tone patterns keyed by ISO 3166-1 alpha-2 code.
// Cadence arrays alternate: [on, off, on, off, ...] forming one cycle.
const RING_PATTERNS: Record<string, RingPattern> = {
  // ── British Commonwealth double-ring ─────────────────────────────
  GB: { frequencies: [400, 450], cadence: [400, 200, 400, 2000] },
  IE: { frequencies: [425],      cadence: [400, 200, 400, 2000] },
  AU: { frequencies: [425, 400], cadence: [400, 200, 400, 2000] },
  NZ: { frequencies: [400, 450], cadence: [400, 200, 400, 2000] },
  ZA: { frequencies: [400, 450], cadence: [400, 200, 400, 2000] },
  SG: { frequencies: [425],      cadence: [400, 200, 400, 2000] },
  MY: { frequencies: [425],      cadence: [400, 200, 400, 2000] },
  IN: { frequencies: [400, 425], cadence: [400, 200, 400, 2000] },
  HK: { frequencies: [440, 480], cadence: [400, 200, 400, 3000] },
  KE: { frequencies: [425],      cadence: [670, 330, 670, 3330] },
  LK: { frequencies: [425],      cadence: [400, 200, 400, 2000] },
  AE: { frequencies: [425],      cadence: [400, 200, 400, 2000] },
  ZW: { frequencies: [400, 450], cadence: [400, 200, 400, 2000] },

  // ── North American (NANP) ────────────────────────────────────────
  US: { frequencies: [440, 480], cadence: [2000, 4000] },
  CA: { frequencies: [440, 480], cadence: [2000, 4000] },
  JM: { frequencies: [440, 480], cadence: [2000, 4000] },
  TT: { frequencies: [440, 480], cadence: [2000, 4000] },

  // ── European / ITU standard (425 Hz, various cadences) ──────────
  DE: { frequencies: [425], cadence: [1000, 4000] },
  FR: { frequencies: [440], cadence: [1500, 3500] },
  IT: { frequencies: [425], cadence: [1000, 4000] },
  ES: { frequencies: [425], cadence: [1500, 3000] },
  PT: { frequencies: [425], cadence: [1000, 5000] },
  NL: { frequencies: [425], cadence: [1000, 4000] },
  BE: { frequencies: [425], cadence: [1000, 3000] },
  CH: { frequencies: [425], cadence: [1000, 4000] },
  AT: { frequencies: [425], cadence: [1000, 5000] },
  SE: { frequencies: [425], cadence: [1000, 5000] },
  NO: { frequencies: [425], cadence: [1000, 4000] },
  DK: { frequencies: [425], cadence: [1000, 4000] },
  FI: { frequencies: [425], cadence: [1000, 4000] },
  PL: { frequencies: [425], cadence: [1000, 4000] },
  CZ: { frequencies: [425], cadence: [1000, 4000] },
  SK: { frequencies: [425], cadence: [1000, 4000] },
  HU: { frequencies: [425], cadence: [1250, 3750] },
  RO: { frequencies: [425], cadence: [1850, 4150] },
  BG: { frequencies: [425], cadence: [1000, 4000] },
  HR: { frequencies: [425], cadence: [1000, 4000] },
  RS: { frequencies: [425], cadence: [1000, 4000] },
  SI: { frequencies: [425], cadence: [1000, 4000] },
  GR: { frequencies: [425], cadence: [1000, 4000] },
  CY: { frequencies: [425], cadence: [1500, 3000] },
  IS: { frequencies: [425], cadence: [1000, 4000] },
  EE: { frequencies: [425], cadence: [1000, 4000] },
  LV: { frequencies: [425], cadence: [1000, 4000] },
  LT: { frequencies: [425], cadence: [1000, 4000] },
  LU: { frequencies: [425], cadence: [1000, 4000] },

  // ── Russian / Eastern European ───────────────────────────────────
  RU: { frequencies: [425], cadence: [800, 3200] },
  UA: { frequencies: [425], cadence: [800, 3200] },

  // ── Asian ────────────────────────────────────────────────────────
  JP: { frequencies: [384, 416], cadence: [1000, 2000] },
  KR: { frequencies: [440, 480], cadence: [1000, 2000] },
  CN: { frequencies: [450],      cadence: [1000, 4000] },
  TW: { frequencies: [440, 480], cadence: [1000, 2000] },
  TH: { frequencies: [425],      cadence: [1000, 4000] },
  VN: { frequencies: [425],      cadence: [1000, 4000] },
  ID: { frequencies: [425],      cadence: [1000, 4000] },
  PH: { frequencies: [425, 480], cadence: [1000, 4000] },
  PK: { frequencies: [400],      cadence: [1000, 2000] },
  BD: { frequencies: [425],      cadence: [1000, 4000] },

  // ── Middle East / North Africa ───────────────────────────────────
  TR: { frequencies: [450], cadence: [2000, 4000] },
  EG: { frequencies: [425], cadence: [2000, 1000] },
  SA: { frequencies: [425], cadence: [1200, 4600] },
  IL: { frequencies: [400], cadence: [1000, 3000] },
  IQ: { frequencies: [425], cadence: [1500, 3500] },
  IR: { frequencies: [425], cadence: [1000, 4000] },
  JO: { frequencies: [425], cadence: [1000, 4000] },
  KW: { frequencies: [425], cadence: [1000, 4000] },
  LB: { frequencies: [425], cadence: [1000, 4000] },
  QA: { frequencies: [425], cadence: [1000, 4000] },
  MA: { frequencies: [425], cadence: [1500, 3500] },
  TN: { frequencies: [425], cadence: [1500, 3500] },

  // ── Americas ─────────────────────────────────────────────────────
  MX: { frequencies: [425], cadence: [1000, 4000] },
  BR: { frequencies: [425], cadence: [1000, 4000] },
  AR: { frequencies: [425], cadence: [1000, 4500] },
  CL: { frequencies: [425], cadence: [1000, 3000] },
  CO: { frequencies: [425], cadence: [1000, 4000] },
  PE: { frequencies: [425], cadence: [1000, 4000] },
  VE: { frequencies: [425], cadence: [1000, 4000] },
  EC: { frequencies: [425], cadence: [1000, 4000] },
  PA: { frequencies: [425], cadence: [1200, 4650] },
  CU: { frequencies: [425], cadence: [1000, 4000] },
  UY: { frequencies: [425], cadence: [1000, 4000] },

  // ── Africa ───────────────────────────────────────────────────────
  NG: { frequencies: [425], cadence: [1000, 4000] },
  GH: { frequencies: [425], cadence: [1000, 4000] },
};

// ITU-T E.180 standard fallback
const DEFAULT_PATTERN: RingPattern = { frequencies: [425], cadence: [1000, 4000] };

export function getAvailableCountries(): string[] {
  return Object.keys(RING_PATTERNS);
}

export function startRingtone(audioContext: AudioContext, countryCode?: string): () => void {
  const pattern = (countryCode && RING_PATTERNS[countryCode.toUpperCase()]) || DEFAULT_PATTERN;
  const { frequencies, cadence } = pattern;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(audioContext.destination);

  const VOLUME = 0.15;
  let stopped = false;

  // Create oscillators
  const oscillators = frequencies.map((freq) => {
    const osc = audioContext.createOscillator();
    osc.frequency.value = freq;
    osc.type = 'sine';
    // Scale volume by number of oscillators to avoid clipping
    const oscGain = audioContext.createGain();
    oscGain.gain.value = 1 / frequencies.length;
    osc.connect(oscGain);
    oscGain.connect(gainNode);
    osc.start();
    return osc;
  });

  // Calculate total cycle duration from cadence
  const cycleDuration = cadence.reduce((sum, ms) => sum + ms, 0) / 1000;

  function scheduleRings(startTime: number) {
    if (stopped) return;

    for (let c = 0; c < 4; c++) {
      const cycleStart = startTime + c * cycleDuration;
      let offset = 0;

      for (let i = 0; i < cadence.length; i++) {
        const durationSec = cadence[i] / 1000;
        if (i % 2 === 0) {
          // On phase
          gainNode.gain.setValueAtTime(VOLUME, cycleStart + offset);
        } else {
          // Off phase
          gainNode.gain.setValueAtTime(0, cycleStart + offset);
        }
        offset += durationSec;
      }
      // Ensure off at end of cycle
      gainNode.gain.setValueAtTime(0, cycleStart + offset);
    }

    setTimeout(() => scheduleRings(startTime + 4 * cycleDuration), (4 * cycleDuration - 1) * 1000);
  }

  scheduleRings(audioContext.currentTime);

  return () => {
    stopped = true;
    gainNode.gain.cancelScheduledValues(0);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    oscillators.forEach((osc) => osc.stop());
  };
}
