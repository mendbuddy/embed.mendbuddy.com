// ============================================================================
// MendBuddy Chat SDK Entry Point
// ============================================================================

import { h, render } from 'preact';
import { Widget } from './widget';
import { API_BASE_URL } from './constants';
import type { MendBuddyConfig } from './types';

// Global instance
let widgetContainer: HTMLElement | null = null;

/**
 * Initialize the chat widget
 */
function init(config: MendBuddyConfig): void {
  if (widgetContainer) {
    console.warn('MendBuddy Chat: Widget already initialized');
    return;
  }

  if (!config.embedId) {
    console.error('MendBuddy Chat: embedId is required');
    return;
  }

  // Create container
  const container = document.createElement('div');
  container.id = 'mendbuddy-chat-container';
  container.style.cssText = 'position: fixed; z-index: 2147483647; pointer-events: none;';
  document.body.appendChild(container);

  // Create Shadow DOM for style isolation
  const shadow = container.attachShadow({ mode: 'open' });

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = getStyles();
  shadow.appendChild(styleEl);

  // Create root element for Preact
  const root = document.createElement('div');
  root.id = 'mendbuddy-chat-root';
  root.style.cssText = 'pointer-events: auto;';
  shadow.appendChild(root);

  // Render widget
  render(
    <Widget
      embedId={config.embedId}
      apiUrl={config.apiUrl || API_BASE_URL}
      autoOpen={config.autoOpen || false}
      onReady={config.onReady}
      onOpen={config.onOpen}
      onClose={config.onClose}
      onMessage={config.onMessage}
    />,
    root
  );

  widgetContainer = container;
}

/**
 * Destroy the widget
 */
function destroy(): void {
  if (widgetContainer) {
    widgetContainer.remove();
    widgetContainer = null;
  }
}

/**
 * Open the chat window programmatically
 */
function open(): void {
  window.dispatchEvent(new CustomEvent('mendbuddy:open'));
}

/**
 * Close the chat window programmatically
 */
function close(): void {
  window.dispatchEvent(new CustomEvent('mendbuddy:close'));
}

// Auto-initialize from script tag data attributes
function autoInit(): void {
  // Find the script tag (works with async/defer)
  const scripts = document.querySelectorAll('script[data-embed-id]');
  const script = scripts[scripts.length - 1] as HTMLScriptElement;

  if (!script) return;

  const embedId = script.getAttribute('data-embed-id');
  if (!embedId) {
    console.error('MendBuddy Chat: data-embed-id attribute required');
    return;
  }

  const apiUrl = script.getAttribute('data-api-url');
  const position = script.getAttribute('data-position') as 'bottom-right' | 'bottom-left' | null;
  const autoOpen = script.getAttribute('data-auto-open') === 'true';

  init({
    embedId,
    apiUrl: apiUrl || undefined,
    position: position || undefined,
    autoOpen,
  });
}

// Run auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  // DOM already loaded
  autoInit();
}

// Export API for programmatic use
const MendBuddyChat = { init, destroy, open, close };
(window as any).MendBuddyChat = MendBuddyChat;
export default MendBuddyChat;

// ============================================================================
// Inline Styles (Shadow DOM scoped)
// ============================================================================

function getStyles(): string {
  return `
    /* Reset and base */
    *, *::before, *::after {
      box-sizing: border-box;
    }

    .mb-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      --primary-color: #0066FF;
    }

    /* ========== Chat Button ========== */
    .mb-button {
      position: fixed;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      z-index: 9998;
      color: white;
    }

    .mb-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .mb-button:active {
      transform: scale(0.98);
    }

    .mb-button svg {
      width: 28px;
      height: 28px;
      fill: currentColor;
    }

    /* ========== Chat Window ========== */
    .mb-window {
      position: fixed;
      border-radius: 16px;
      background: white;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
    }

    .mb-window.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    /* ========== Header ========== */
    .mb-header {
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #eee;
      background: white;
    }

    .mb-header-logo {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      object-fit: cover;
    }

    .mb-header-info {
      flex: 1;
    }

    .mb-header-title {
      font-weight: 600;
      color: #333;
    }

    .mb-header-status {
      font-size: 12px;
      color: #22c55e;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .mb-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .mb-header-close {
      padding: 8px;
      border: none;
      background: none;
      cursor: pointer;
      color: #666;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s ease;
    }

    .mb-header-close:hover {
      background-color: #f0f0f0;
    }

    /* ========== Messages ========== */
    .mb-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #fafafa;
    }

    .mb-welcome {
      text-align: center;
      color: #666;
      padding: 24px;
    }

    .mb-welcome p {
      margin: 0;
    }

    /* ========== Single Message ========== */
    .mb-message {
      display: flex;
      max-width: 85%;
      gap: 8px;
      align-items: flex-end;
    }

    .mb-message.user {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .mb-message.assistant {
      align-self: flex-start;
    }

    .mb-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .mb-message-content {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .mb-message.user .mb-message-content {
      align-items: flex-end;
    }

    .mb-message-bubble {
      padding: 12px 16px;
      border-radius: 16px;
      word-wrap: break-word;
      white-space: pre-wrap;
    }

    .mb-message.user .mb-message-bubble {
      border-bottom-right-radius: 4px;
    }

    .mb-message-status {
      font-size: 11px;
      color: #999;
      margin-top: 2px;
      padding-right: 4px;
    }

    .mb-message.assistant .mb-message-bubble {
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .mb-sources {
      margin-top: 8px;
      padding: 8px;
      background: #f0f0f0;
      border-radius: 8px;
      font-size: 12px;
      color: #666;
    }

    .mb-sources-label {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .mb-source {
      margin-top: 2px;
    }

    /* ========== Suggested Messages ========== */
    .mb-suggested {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 16px;
    }

    .mb-suggested-chip {
      padding: 6px 12px;
      border: 1px solid;
      border-radius: 16px;
      background: transparent;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      transition: background 0.2s, color 0.2s;
    }

    .mb-suggested-chip:hover {
      background: var(--chip-hover-bg, var(--primary-color));
      color: white !important;
    }

    /* ========== Typing Indicator ========== */
    .mb-typing-dots {
      display: flex;
      gap: 4px;
      align-items: center;
      height: 20px;
    }

    .mb-typing-dots span {
      width: 8px;
      height: 8px;
      background: #999;
      border-radius: 50%;
      animation: mb-typing 0.4s infinite alternate ease-in-out;
    }

    .mb-typing-dots span:nth-child(1) { animation-delay: 0s; }
    .mb-typing-dots span:nth-child(2) { animation-delay: 0.15s; }
    .mb-typing-dots span:nth-child(3) { animation-delay: 0.3s; }

    @keyframes mb-typing {
      0% { transform: translateY(0); }
      100% { transform: translateY(-5px); }
    }

    /* ========== Message Input ========== */
    .mb-input-container {
      padding: 16px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
      background: white;
      flex-shrink: 0;
    }

    .mb-input {
      flex: 1;
      min-width: 0;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 24px;
      font-size: 16px;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      font-family: inherit;
    }

    .mb-input:focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 20%, transparent);
    }

    .mb-input:disabled {
      background: #f5f5f5;
    }

    .mb-send {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s ease, transform 0.2s ease;
      color: white;
    }

    .mb-send:hover:not(:disabled) {
      transform: scale(1.05);
    }

    .mb-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .mb-send svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }

    /* ========== Pre-chat Form ========== */
    .mb-prechat {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
      flex: 1;
    }

    .mb-prechat-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .mb-prechat-subtitle {
      font-size: 14px;
      color: #666;
      margin-top: -8px;
    }

    .mb-prechat-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .mb-prechat-label {
      font-size: 13px;
      font-weight: 500;
      color: #333;
    }

    .mb-required {
      color: #ef4444;
      margin-left: 2px;
    }

    .mb-prechat-input {
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 16px;
      font-family: inherit;
      transition: border-color 0.2s ease;
    }

    .mb-prechat-input:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .mb-prechat-error {
      font-size: 12px;
      color: #ef4444;
    }

    .mb-prechat-submit {
      padding: 14px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      cursor: pointer;
      margin-top: 8px;
      transition: opacity 0.2s ease;
    }

    .mb-prechat-submit:hover:not(:disabled) {
      opacity: 0.9;
    }

    .mb-prechat-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ========== Offline Message ========== */
    .mb-offline {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      color: #666;
    }

    .mb-offline-icon {
      margin-bottom: 16px;
    }

    .mb-offline-message {
      font-size: 16px;
    }

    /* ========== Error Message ========== */
    .mb-error {
      padding: 8px 16px;
      background: #fef2f2;
      color: #dc2626;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .mb-error button {
      background: none;
      border: none;
      color: #dc2626;
      cursor: pointer;
      font-size: 18px;
      padding: 0;
      line-height: 1;
    }

    /* ========== Unread Badge ========== */
    .mb-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 10px;
      color: white;
      font-size: 12px;
      font-weight: 600;
      line-height: 20px;
      text-align: center;
      pointer-events: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .mb-badge-pop {
      animation: mb-badge-pop 0.3s ease;
    }

    @keyframes mb-badge-pop {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    .mb-badge-pulse {
      animation: mb-badge-pulse 2s ease-in-out infinite;
    }

    @keyframes mb-badge-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.15); opacity: 0.85; }
    }

    .mb-badge-bounce {
      animation: mb-badge-bounce 2s ease-in-out infinite;
    }

    @keyframes mb-badge-bounce {
      0%, 100% { transform: translateY(0); }
      20% { transform: translateY(-5px); }
      40% { transform: translateY(0); }
      60% { transform: translateY(-3px); }
      80% { transform: translateY(0); }
    }

    .mb-badge-shake {
      animation: mb-badge-shake 3s ease-in-out infinite;
    }

    @keyframes mb-badge-shake {
      0%, 85%, 100% { transform: translateX(0); }
      88% { transform: translateX(-3px) rotate(-5deg); }
      91% { transform: translateX(3px) rotate(5deg); }
      94% { transform: translateX(-2px) rotate(-3deg); }
      97% { transform: translateX(2px) rotate(3deg); }
    }

    .mb-badge-wiggle {
      animation: mb-badge-wiggle 2.5s ease-in-out infinite;
    }

    @keyframes mb-badge-wiggle {
      0%, 75%, 100% { transform: rotate(0deg); }
      80% { transform: rotate(-12deg); }
      85% { transform: rotate(10deg); }
      90% { transform: rotate(-8deg); }
      95% { transform: rotate(5deg); }
    }

    /* ========== Powered By ========== */
    .mb-powered {
      padding: 8px 12px;
      text-align: center;
      font-size: 11px;
      color: #999;
      background: white;
      border-top: 1px solid #eee;
      line-height: 1.4;
    }

    .mb-powered a {
      color: #666;
      text-decoration: none;
    }

    .mb-powered a:hover {
      text-decoration: underline;
    }

    /* ========== Mobile Responsive ========== */
    @media (max-width: 480px) {
      .mb-window {
        bottom: 0 !important;
        top: 0 !important;
        right: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100dvh !important;
        height: 100% !important;
        max-height: 100dvh !important;
        max-height: 100% !important;
        border-radius: 0;
      }

      @supports (height: 100dvh) {
        .mb-window {
          height: 100dvh !important;
          max-height: 100dvh !important;
        }
      }

      .mb-button {
        width: 56px;
        height: 56px;
      }

    }
  `;
}
