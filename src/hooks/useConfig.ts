// ============================================================================
// useConfig Hook - Loads embed configuration
// ============================================================================

import { useState, useEffect, useRef } from 'preact/hooks';
import type { EmbedConfigPublic } from '../types';
import { ApiClient } from '../api/client';

interface UseConfigReturn {
  config: EmbedConfigPublic | null;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
}

export function useConfig(apiUrl: string, embedId: string): UseConfigReturn {
  const [config, setConfig] = useState<EmbedConfigPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const clientRef = useRef<ApiClient | null>(null);

  useEffect(() => {
    // Create client if needed
    if (!clientRef.current) {
      clientRef.current = new ApiClient(apiUrl, embedId);
    }

    let mounted = true;

    async function loadConfig() {
      try {
        setLoading(true);
        setError(null);
        const configData = await clientRef.current!.getConfig();
        if (mounted) {
          setConfig(configData);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load config');
          setErrorCode((err as any)?.code || null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadConfig();

    return () => {
      mounted = false;
    };
  }, [apiUrl, embedId]);

  return { config, loading, error, errorCode };
}
