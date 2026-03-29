export function getStyles(): string {
  return `
    /* Reset and base */
    *, *::before, *::after {
      box-sizing: border-box;
    }

    :host {
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }

    .mb-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: #333;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
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
      animation: mb-bubble-in 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.15) both;
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

    @keyframes mb-bubble-in {
      0% { opacity: 0; transform: translateY(12px); }
      100% { opacity: 1; transform: translateY(0); }
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
      touch-action: manipulation;
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
      touch-action: manipulation;
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
      font-size: 16px;
      font-weight: 500;
      color: white;
      cursor: pointer;
      margin-top: 8px;
      transition: opacity 0.2s ease;
      touch-action: manipulation;
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
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
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
      animation: mb-badge-shake 2.5s ease-in-out infinite;
    }

    @keyframes mb-badge-shake {
      0%, 50%, 100% { transform: translateX(0) rotate(0deg); }
      55% { transform: translateX(-3px) rotate(-5deg); }
      60% { transform: translateX(3px) rotate(5deg); }
      65% { transform: translateX(-3px) rotate(-5deg); }
      70% { transform: translateX(3px) rotate(5deg); }
      75% { transform: translateX(-2px) rotate(-3deg); }
      80% { transform: translateX(0) rotate(0deg); }
    }

    .mb-badge-wiggle {
      animation: mb-badge-wiggle 2s ease-in-out infinite;
    }

    @keyframes mb-badge-wiggle {
      0%, 40%, 100% { transform: rotate(0deg); }
      45% { transform: rotate(-12deg); }
      50% { transform: rotate(10deg); }
      55% { transform: rotate(-10deg); }
      60% { transform: rotate(8deg); }
      65% { transform: rotate(-5deg); }
      70% { transform: rotate(0deg); }
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

    /* ========== Voice Call ========== */
    .mb-header-voice {
      padding: 8px;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .mb-header-voice:hover {
      background-color: #f0f0f0;
      transform: scale(1.1);
    }
    .mb-voice-overlay {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      gap: 16px;
      overflow-y: auto;
    }
    .mb-voice-active {
      justify-content: flex-start;
      padding-top: 32px;
    }
    .mb-voice-confirm {
      text-align: center;
      color: #374151;
    }
    .mb-voice-confirm h3 {
      margin: 16px 0 8px;
      font-size: 18px;
      font-weight: 600;
    }
    .mb-voice-confirm p {
      margin: 0 0 8px;
      font-size: 14px;
      color: #6b7280;
    }
    .mb-voice-mobile-warning {
      font-size: 12px !important;
      color: #d97706 !important;
      font-style: italic;
    }
    .mb-voice-confirm-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 20px;
    }
    .mb-voice-btn-cancel {
      padding: 10px 24px;
      border: 1px solid #d1d5db;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      color: #374151;
    }
    .mb-voice-btn-cancel:hover {
      background: #f3f4f6;
    }
    .mb-voice-btn-call {
      padding: 10px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      color: white;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .mb-voice-btn-call:hover {
      opacity: 0.9;
    }
    .mb-voice-ring-container {
      position: relative;
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mb-voice-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 3px solid;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
    }
    .mb-voice-ring-pulse {
      animation: mb-pulse 1.5s ease-in-out infinite;
    }
    @keyframes mb-pulse {
      0%, 100% { opacity: 0.5; transform: scale(0.95); }
      50% { opacity: 1; transform: scale(1.05); }
    }
    .mb-voice-ring-icon {
      position: relative;
      z-index: 1;
    }
    .mb-voice-dots {
      display: flex;
      gap: 6px;
    }
    .mb-voice-dots span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: mb-dot-bounce 1.4s ease-in-out infinite;
    }
    .mb-voice-dots span:nth-child(2) { animation-delay: 0.2s; }
    .mb-voice-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes mb-dot-bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }
    .mb-voice-info {
      text-align: center;
    }
    .mb-voice-name {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
    }
    .mb-voice-status {
      font-size: 13px;
      color: #6b7280;
      margin-top: 4px;
    }
    .mb-voice-timer {
      font-size: 24px;
      font-weight: 300;
      color: #374151;
      margin-top: 4px;
      font-variant-numeric: tabular-nums;
    }
    .mb-voice-transcript {
      width: 100%;
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
      font-size: 13px;
      color: #4b5563;
      max-height: 200px;
    }
    .mb-voice-turn {
      padding: 4px 0;
    }
    .mb-voice-turn-label {
      font-weight: 600;
      color: #111827;
    }
    .mb-voice-turn-user {
      color: #6b7280;
    }
    .mb-voice-controls {
      display: flex;
      gap: 16px;
      align-items: center;
      padding: 16px 0 8px;
    }
    .mb-voice-mute {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 1px solid #d1d5db;
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #374151;
      transition: all 0.2s;
    }
    .mb-voice-mute:hover {
      background: #f3f4f6;
    }
    .mb-voice-muted {
      background: #fef2f2;
      border-color: #fca5a5;
      color: #dc2626;
    }
    .mb-voice-hangup {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background: #dc2626;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      transition: all 0.2s;
    }
    .mb-voice-hangup:hover {
      background: #b91c1c;
    }

    /* ========== iframe Mode ========== */
    .mb-widget-iframe {
      width: 100%;
      height: 100%;
    }
    .mb-window-iframe {
      position: relative !important;
      width: 100% !important;
      height: 100% !important;
      max-height: 100% !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      transform: none !important;
      opacity: 1 !important;
      pointer-events: auto !important;
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

    }
  `;
}
