// ============================================================================
// Dynamic Voice Bundle Loader
// Loads voice.js on demand when user starts a voice call.
// Keeps chat.js small — voice.js contains @google/genai SDK (~60-80KB).
// ============================================================================

let loadPromise: Promise<void> | null = null;
let loaded = false;

/**
 * Dynamically load the voice.js bundle.
 * Returns a promise that resolves when the script is loaded.
 * Subsequent calls return immediately if already loaded.
 */
export function loadVoiceBundle(baseUrl: string): Promise<void> {
  if (loaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    // Determine voice.js URL relative to chat.js
    const voiceUrl = baseUrl.replace(/\/chat\.js$/, '/voice.js');

    const script = document.createElement('script');
    script.src = voiceUrl;
    script.async = true;
    script.onload = () => {
      loaded = true;
      resolve();
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load voice module'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Get the voice module after it's been loaded.
 * Returns null if not yet loaded.
 */
export function getVoiceModule(): any {
  return (window as any).__MendBuddyVoice || null;
}
