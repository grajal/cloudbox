import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { fetchAuthSession, signInWithRedirect, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; error?: string }
  | { status: 'signedIn'; email: string };

type AuthContextValue = {
  state: AuthState;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Reads the stored tokens. If there is a valid ID token, the user is signed in.
// Amplify refreshes expired tokens with the refresh token automatically.
async function loadAuthState(): Promise<AuthState> {
  try {
    const { tokens } = await fetchAuthSession();
    const email = tokens?.idToken?.payload.email;
    return typeof email === 'string' ? { status: 'signedIn', email } : { status: 'signedOut' };
  } catch {
    return { status: 'signedOut' };
  }
}

// After the redirect back from Managed Login the URL is /callback?code=...; tidy it up.
function leaveCallbackUrl() {
  if (window.location.pathname === '/callback') window.history.replaceState({}, '', '/');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    void loadAuthState().then(setState);

    // Amplify announces auth events: the code exchange finishing, a failure, sign-out.
    return Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signInWithRedirect':
          leaveCallbackUrl();
          void loadAuthState().then(setState);
          break;
        case 'signInWithRedirect_failure':
          leaveCallbackUrl();
          setState({ status: 'signedOut', error: 'Sign-in failed. Please try again.' });
          break;
        case 'signedOut':
          setState({ status: 'signedOut' });
          break;
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      signIn: () => signInWithRedirect(), // sends the browser to the Cognito login page
      signOut: () => signOut(), // clears local tokens, then logs out of Cognito (redirectSignOut)
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
