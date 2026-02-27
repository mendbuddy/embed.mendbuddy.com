// ============================================================================
// Session Storage
// ============================================================================

import { STORAGE_KEY_PREFIX } from '../constants';

/**
 * Get session token from localStorage
 */
export function getSessionToken(embedId: string): string | null {
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${embedId}`);
  } catch {
    // localStorage not available (private browsing, etc.)
    return null;
  }
}

/**
 * Set session token in localStorage
 */
export function setSessionToken(embedId: string, token: string): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${embedId}`, token);
  } catch {
    // localStorage not available
  }
}

/**
 * Clear session token from localStorage
 */
export function clearSessionToken(embedId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${embedId}`);
  } catch {
    // localStorage not available
  }
}

/**
 * Check if a session exists
 */
export function hasExistingSession(embedId: string): boolean {
  return getSessionToken(embedId) !== null;
}

/**
 * Get pre-chat submitted flag
 */
export function getPreChatSubmitted(embedId: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${embedId}_prechat`) === 'true';
  } catch {
    return false;
  }
}

/**
 * Set pre-chat submitted flag
 */
export function setPreChatSubmitted(embedId: string, submitted: boolean): void {
  try {
    if (submitted) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${embedId}_prechat`, 'true');
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${embedId}_prechat`);
    }
  } catch {
    // localStorage not available
  }
}
