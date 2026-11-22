import { useAuth } from './auth/AuthProvider';
import { FileBrowser } from './browser/FileBrowser';
import { buttonPrimary, buttonSecondary } from './ui';

export default function App() {
  const { state, signIn, signOut } = useAuth();

  if (state.status === 'signedIn') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <img src="/cloud.svg" alt="" className="h-8 w-8" />
            <h1 className="flex-1 text-xl font-bold tracking-tight">CloudBox</h1>
            <span className="hidden text-sm text-slate-600 sm:inline">{state.email}</span>
            <button type="button" className={buttonSecondary} onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-6">
          <FileBrowser />
        </main>
      </div>
    );
  }

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
          <button type="button" className={buttonPrimary} onClick={() => void signIn()}>
            Sign in
          </button>
        </>
      )}
    </main>
  );
}
