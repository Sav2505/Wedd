import { useCallback, useEffect, useState } from 'react';
import type { PersonCluster } from '../types/faceRecognition.types';
import { fetchPeopleClusters } from '../services/faceRecognition.service';

interface UseFaceRecognitionResult {
  people: PersonCluster[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFaceRecognition(weddingId: number | null): UseFaceRecognitionResult {
  const [people, setPeople] = useState<PersonCluster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!weddingId) {
      setPeople([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const clusters = await fetchPeopleClusters(weddingId);
      setPeople(clusters);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'שגיאה בטעינת אנשים מהגלריה');
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    let cancelled = false;

    if (!weddingId) {
      setPeople([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchPeopleClusters(weddingId)
      .then((clusters) => {
        if (!cancelled) {
          setPeople(clusters);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'שגיאה בטעינת אנשים מהגלריה');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [weddingId]);

  return {
    people,
    isLoading,
    error,
    refetch,
  };
}
