import { useCallback, useEffect, useState } from 'react';
import type { Item } from '@cloudbox/shared';
import { errorText } from '../api/client';
import { listChildren } from '../api/items';

type ChildrenState =
  { status: 'loading' } | { status: 'ok'; items: Item[] } | { status: 'error'; message: string };

/** Loads a folder's contents, and lets the caller ask for a fresh copy with `reload()`. */
export function useChildren(folderId: string) {
  const [state, setState] = useState<ChildrenState>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;

    listChildren(folderId)
      .then((items) => {
        if (!cancelled) setState({ status: 'ok', items });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: errorText(error) });
      });

    // A newer request (or leaving the folder) makes this result obsolete.
    return () => {
      cancelled = true;
    };
  }, [folderId, version]);

  return { state, reload };
}
