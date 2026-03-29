// ============================================================================
// Widget Entry Point for iframe Context
// Loaded inside <iframe src="https://embed.mendbuddy.com/w/{embedId}">
// No Shadow DOM needed — the iframe provides style isolation.
// Communicates with parent page via postMessage.
// ============================================================================

import { h, render } from 'preact';
import { Widget } from './widget';
import { getStyles } from './styles';

const API_URL = 'https://api.mendbuddy.com';
const EMBED_ORIGIN = 'https://embed.mendbuddy.com';

// Parse embedId from URL: /w/{embedId}
const pathParts = window.location.pathname.split('/');
const embedId = pathParts[2] || '';

if (!embedId) {
  console.error('[mendbuddy] No embedId in URL path');
} else {
  // Inject styles directly into the document (no Shadow DOM)
  const style = document.createElement('style');
  style.textContent = getStyles();
  document.head.appendChild(style);

  // Render widget in iframe mode
  const root = document.getElementById('root');
  if (root) {
    render(
      <Widget
        embedId={embedId}
        apiUrl={API_URL}
        autoOpen={false}
        isIframe={true}
      />,
      root
    );
  }

  // Notify parent we're ready
  window.parent.postMessage({ type: 'mb:ready', embedId }, '*');
}
