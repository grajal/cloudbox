import { useAuth } from './auth/AuthProvider';
import { useMe } from './api/useMe';

const button =
  'rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';

// Calls the protected GET /me endpoint to prove the token reaches the API and is accepted.
function ApiCheck() {
  const result = useMe();

  if (result.status === 'loading')
    return <p className="text-sm text-slate-500">Calling the API…</p>;

  if (result.status === 'error') {
    return (
      <p role="alert" className="text-sm text-red-600">
        API error: {result.message}
      </p>
    );
  }

  return (
    <p className="text-sm text-slate-600">
      API says your user ID is <code className="rounded bg-slate-200 px-1">{result.me.userId}</code>
    </p>
  );
}

export default function App() {
  const { state, signIn, signOut } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-slate-900">
      <img src="/cloud.svg" alt="" className="h-16 w-16" />
      <h1 className="text-4xl font-bold tracking-tight">CloudBox</h1>

      {state.status === 'loading' && <p className="text-slate-500">Loading…</p>}

      {state.status === 'signedOut' && (
        <>
          <p className="max-w-md text-center text-slate-600">
            Your personal files, stored on AWS. Sign in to continue.
          </p>
          {state.error && (
            <p role="alert" className="text-sm text-red-600">
              {state.error}
            </p>
          )}
          <button type="button" className={button} onClick={() => void signIn()}>
            Sign in
          </button>
        </>
      )}

      {state.status === 'signedIn' && (
        <>
          <p className="text-slate-600">
            Signed in as <strong>{state.email}</strong>
          </p>
          <ApiCheck />
          <button type="button" className={button} onClick={() => void signOut()}>
            Sign out
          </button>
        </>
      )}
    </main>
  );
}
