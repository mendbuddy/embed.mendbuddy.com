// ============================================================================
// MendBuddy Chat SDK Constants
// ============================================================================

// API base URL - production by default
export const API_BASE_URL = 'https://api.mendbuddy.com';

// Session storage key prefix
export const STORAGE_KEY_PREFIX = 'mendbuddy_session_';

// Session expiry in seconds (24 hours)
export const SESSION_EXPIRY = 24 * 60 * 60;

// Default config values
export const DEFAULT_POSITION = 'bottom-right';
export const DEFAULT_PRIMARY_COLOR = '#0066FF';
export const DEFAULT_WELCOME_MESSAGE = 'Hi! How can I help you today?';
export const DEFAULT_PLACEHOLDER = 'Type a message...';

// SSE event types
export const SSE_EVENTS = {
  START: 'start',
  CHUNK: 'chunk',
  SOURCES: 'sources',
  USAGE: 'usage',
  DONE: 'done',
  ERROR: 'error',
  HEARTBEAT: 'heartbeat',
} as const;

// Mobile breakpoint
export const MOBILE_BREAKPOINT = 480;
