// ============================================================================
// mendbuddy Embed Loader (Thin)
// ~5KB vanilla JS — no Preact, no Shadow DOM.
// Renders the floating chat button in the parent page.
// Opens a cross-origin iframe to embed.mendbuddy.com for the full widget.
// Communicates with the iframe via postMessage.
// ============================================================================

const API_URL = 'https://api.mendbuddy.com';
const EMBED_ORIGIN = 'https://embed.mendbuddy.com';
const STORAGE_PREFIX = 'mendbuddy_unread_';

interface LoaderConfig {
  embedId: string;
  apiUrl?: string;
  position?: string;
  autoOpen?: boolean;
  onReady?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (message: { role: string; content: string }) => void;
}

interface EmbedButtonConfig {
  primary_color: string;
  button_color: string;
  chat_icon: string;
  widget_position: string;
  bubble_size: string;
  badge_enabled: boolean;
  badge_color: string;
  badge_animation: string;
  window_width: string;
  window_height: string;
  is_online: boolean;
  voice_enabled: boolean;
}

let state: {
  embedId: string;
  apiUrl: string;
  config: EmbedButtonConfig | null;
  container: HTMLDivElement | null;
  button: HTMLButtonElement | null;
  badge: HTMLSpanElement | null;
  iframe: HTMLIFrameElement | null;
  isOpen: boolean;
  unreadCount: number;
  ready: boolean;
  callbacks: Partial<LoaderConfig>;
} = {
  embedId: '',
  apiUrl: API_URL,
  config: null,
  container: null,
  button: null,
  badge: null,
  iframe: null,
  isOpen: false,
  unreadCount: 0,
  ready: false,
  callbacks: {},
};

// ─── Config Fetch ────────────────────────────────────────────────────

async function fetchConfig(apiUrl: string, embedId: string): Promise<EmbedButtonConfig | null> {
  try {
    const res = await fetch(`${apiUrl}/embed/${embedId}/config`);
    if (!res.ok) return null;
    const data = await res.json() as any;
    return data.data || data;
  } catch {
    return null;
  }
}

// ─── Button Rendering (plain DOM) ────────────────────────────────────

function createButton(config: EmbedButtonConfig): void {
  // Container
  const container = document.createElement('div');
  container.id = 'mendbuddy-chat-container';
  const pos = config.widget_position || 'bottom-right';
  const size = config.bubble_size || '60px';
  Object.assign(container.style, {
    position: 'fixed',
    zIndex: '2147483647',
    ...(pos.includes('right') ? { right: '20px' } : { left: '20px' }),
    ...(pos.includes('top') ? { top: '20px' } : { bottom: '20px' }),
  });

  // Button
  const btn = document.createElement('button');
  const color = config.button_color || config.primary_color || '#0066FF';
  Object.assign(btn.style, {
    width: size,
    height: size,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: color,
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    outline: 'none',
    padding: '0',
  });
  btn.setAttribute('aria-label', 'Open chat');
  btn.innerHTML = getChatIcon(config.chat_icon || 'chat-circle-dots');
  btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.08)'; });
  btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });
  btn.addEventListener('click', () => {
    if (state.isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  });

  // Badge
  const badge = document.createElement('span');
  Object.assign(badge.style, {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: config.badge_color || '#ef4444',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    minWidth: '20px',
    height: '20px',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
    lineHeight: '20px',
    textAlign: 'center',
  });

  container.style.position = 'fixed';
  container.appendChild(btn);
  container.appendChild(badge);
  document.body.appendChild(container);

  state.container = container;
  state.button = btn;
  state.badge = badge;

  // Restore persisted unread count
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${state.embedId}`);
    if (stored) {
      const count = parseInt(stored, 10);
      if (count > 0) updateBadge(count);
    }
  } catch {}
}

function getChatIcon(icon: string): string {
  // Simple chat bubble SVG
  return `<svg viewBox="0 0 256 256" width="60%" height="60%" fill="currentColor">
    <path d="M216,48H40A16,16,0,0,0,24,64V224a15.85,15.85,0,0,0,9.24,14.5A16.13,16.13,0,0,0,40,240a15.89,15.89,0,0,0,10.25-3.78.69.69,0,0,0,.13-.11L82.5,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM216,192H82.5a16,16,0,0,0-10.3,3.75l-.12.11L40,224V64H216Z"/>
  </svg>`;
}

function updateBadge(count: number): void {
  state.unreadCount = count;
  if (!state.badge) return;
  if (count > 0) {
    state.badge.textContent = count > 99 ? '99+' : String(count);
    state.badge.style.display = 'flex';
  } else {
    state.badge.style.display = 'none';
  }
  // Persist
  try {
    if (count > 0) {
      localStorage.setItem(`${STORAGE_PREFIX}${state.embedId}`, String(count));
    } else {
      localStorage.removeItem(`${STORAGE_PREFIX}${state.embedId}`);
    }
  } catch {}
}

// ─── iframe Management ───────────────────────────────────────────────

function createIframe(): void {
  if (state.iframe) return;

  const iframe = document.createElement('iframe');
  iframe.src = `${EMBED_ORIGIN}/w/${state.embedId}`;
  iframe.allow = 'microphone; screen-wake-lock';
  iframe.setAttribute('aria-label', 'Chat widget');

  const isMobile = window.innerWidth <= 480;
  const config = state.config;
  const pos = config?.widget_position || 'bottom-right';

  if (isMobile) {
    Object.assign(iframe.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100dvh',
      maxHeight: '100dvh',
      border: 'none',
      borderRadius: '0',
      zIndex: '2147483647',
      display: 'none',
    });
  } else {
    Object.assign(iframe.style, {
      position: 'fixed',
      width: config?.window_width || '380px',
      height: config?.window_height || '600px',
      maxHeight: 'calc(100vh - 110px)',
      border: 'none',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      zIndex: '2147483646',
      display: 'none',
      ...(pos.includes('right') ? { right: '20px' } : { left: '20px' }),
      ...(pos.includes('top') ? { top: '90px' } : { bottom: '90px' }),
    });
  }

  document.body.appendChild(iframe);
  state.iframe = iframe;
}

function openWidget(): void {
  if (state.isOpen) return;
  state.isOpen = true;

  if (!state.iframe) {
    createIframe();
  }
  if (state.iframe) {
    state.iframe.style.display = 'block';
  }

  // Clear unread
  updateBadge(0);

  // Tell iframe we're open
  if (state.ready && state.iframe?.contentWindow) {
    state.iframe.contentWindow.postMessage({ type: 'mb:open' }, EMBED_ORIGIN);
  }

  // Hide button on mobile (close is inside iframe)
  if (window.innerWidth <= 480 && state.container) {
    state.container.style.display = 'none';
  }

  state.callbacks.onOpen?.();
}

function closeWidget(): void {
  if (!state.isOpen) return;
  state.isOpen = false;

  if (state.iframe) {
    state.iframe.style.display = 'none';
  }

  // Show button again
  if (state.container) {
    state.container.style.display = 'block';
  }

  // Tell iframe we're closed
  if (state.ready && state.iframe?.contentWindow) {
    state.iframe.contentWindow.postMessage({ type: 'mb:close' }, EMBED_ORIGIN);
  }

  state.callbacks.onClose?.();
}

// ─── postMessage Bridge ──────────────────────────────────────────────

function setupPostMessageListener(): void {
  window.addEventListener('message', (e) => {
    // Only accept messages from our embed origin
    if (e.origin !== EMBED_ORIGIN) return;
    if (!e.data?.type?.startsWith('mb:')) return;

    switch (e.data.type) {
      case 'mb:ready':
        state.ready = true;
        state.callbacks.onReady?.();
        // If auto-open was requested before iframe was ready
        if (state.isOpen && state.iframe?.contentWindow) {
          state.iframe.contentWindow.postMessage({ type: 'mb:open' }, EMBED_ORIGIN);
        }
        break;

      case 'mb:badge':
        if (typeof e.data.count === 'number' && !state.isOpen) {
          updateBadge(e.data.count);
        }
        break;

      case 'mb:close':
        closeWidget();
        break;

      case 'mb:resize':
        // Future: handle dynamic resize requests from iframe
        break;
    }
  });
}

// ─── Custom Events (backward compat) ────────────────────────────────

function setupCustomEvents(): void {
  window.addEventListener('mendbuddy:open', () => openWidget());
  window.addEventListener('mendbuddy:close', () => closeWidget());
}

// ─── Public API ──────────────────────────────────────────────────────

async function init(config: LoaderConfig): Promise<void> {
  state.embedId = config.embedId;
  state.apiUrl = config.apiUrl || API_URL;
  state.callbacks = config;

  // Fetch config for button styling
  const embedConfig = await fetchConfig(state.apiUrl, state.embedId);
  if (!embedConfig) {
    console.error('[mendbuddy] Failed to load config');
    return;
  }
  state.config = embedConfig;

  // Don't show button if not online
  if (!embedConfig.is_online) return;

  // Render button
  createButton(embedConfig);

  // Create iframe (hidden, preloaded for fast open)
  createIframe();

  // Setup communication
  setupPostMessageListener();
  setupCustomEvents();

  // Auto-open if requested
  if (config.autoOpen) {
    openWidget();
  }
}

function destroy(): void {
  if (state.iframe) {
    state.iframe.contentWindow?.postMessage({ type: 'mb:destroy' }, EMBED_ORIGIN);
    state.iframe.remove();
    state.iframe = null;
  }
  if (state.container) {
    state.container.remove();
    state.container = null;
  }
  state.button = null;
  state.badge = null;
  state.isOpen = false;
  state.ready = false;
  state.config = null;
}

// ─── Auto-init from script tag ───────────────────────────────────────

function autoInit(): void {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[data-embed-id]');
  if (scripts.length === 0) return;
  const script = scripts[scripts.length - 1];

  const embedId = script.getAttribute('data-embed-id');
  if (!embedId) return;

  const apiUrl = script.getAttribute('data-api-url') || API_URL;
  const autoOpen = script.getAttribute('data-auto-open') === 'true';

  init({ embedId, apiUrl, autoOpen });
}

// Run auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  autoInit();
}

// Export public API
export { init, destroy, openWidget as open, closeWidget as close };
