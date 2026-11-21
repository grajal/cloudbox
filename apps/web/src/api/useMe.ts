import { useEffect, useState } from 'react';
import type { MeResponse } from '@cloudbox/shared';
import { getMe } from './client';

type MeState =
  { status: 'loading' } | { status: 'ok'; me: MeResponse } | { status: 'error'; message: string };

/** Loads GET /me once when the component mounts. */
export function useMe(): MeState {
  const [state, setState] = useState<MeState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((me) => {
        if (!cancelled) setState({ status: 'ok', me });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

    // If the component unmounts before the request finishes, ignore the late result.
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
