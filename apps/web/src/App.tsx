export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-slate-900">
      <img src="/cloud.svg" alt="" className="h-16 w-16" />
      <h1 className="text-4xl font-bold tracking-tight">CloudBox</h1>
      <p className="max-w-md text-center text-slate-600">
        Your personal files, stored on AWS. Sign-in, uploads and folders are coming feature by
        feature.
      </p>
    </main>
  );
}
