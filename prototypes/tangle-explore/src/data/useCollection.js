import { useEffect } from 'react';
import { useExploreStore } from '../store/useExploreStore';
import { normalizePreparedCollection } from './dataUtils';

const DATA_CANDIDATES = ['db_explore.json', 'db_dump.json'].map(
  (fileName) => `${import.meta.env.BASE_URL}${fileName}`
);

export function useCollection() {
  const setCollection = useExploreStore((state) => state.setCollection);
  const setCollectionError = useExploreStore((state) => state.setCollectionError);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      for (const url of DATA_CANDIDATES) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const payload = await response.json();
          const normalized = normalizePreparedCollection(payload);
          if (normalized && !cancelled) {
            setCollection(normalized);
            return;
          }
        } catch {
          // Try the next candidate.
        }
      }

      if (!cancelled) {
        setCollectionError('Could not load collection data. Run npm run prepare:data first.');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [setCollection, setCollectionError]);
}
