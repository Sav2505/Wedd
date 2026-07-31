import { useState, useEffect, useCallback } from 'react';
import { getWeddingInfo } from '../services/info.service';
import { WeddingInfo } from '../types/domain';
import { useWeddingId } from './useWeddingId';

interface UseWeddingInfoResult {
  info: WeddingInfo | null;
  loading: boolean;
  error: string;
  refetch: () => void;
}

/**
 * The single place in the app that fetches wedding info.
 * Every screen/component that needs wedding info should use THIS hook
 * instead of calling getWeddingInfo() directly - so there's exactly one
 * spot responsible for wiring the correct, reactive weddingId in.
 *
 * Usage:
 *   const { info, loading, error, refetch } = useWeddingInfo();
 */
export function useWeddingInfo(): UseWeddingInfoResult {
  const weddingId = useWeddingId();
  const [info, setInfo] = useState<WeddingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refetchTick, setRefetchTick] = useState(0);

  useEffect(() => {
    if (weddingId == null) {
      setInfo(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    getWeddingInfo(weddingId)
      .then((d) => {
        if (!cancelled) setInfo(d);
      })
      .catch(() => {
        if (!cancelled) setError('שגיאה בטעינת הנתונים');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddingId, refetchTick]);

  const refetch = useCallback(() => setRefetchTick((t) => t + 1), []);

  return { info, loading, error, refetch };
}