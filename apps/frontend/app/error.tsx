'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <h2 className="text-2xl font-bold tracking-tight">This page did not load</h2>
      <p className="mt-3 max-w-md text-muted">
        Something failed while rendering. The API may still be starting.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted">Reference: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-7 rounded-full bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-strong"
      >
        Try again
      </button>
    </div>
  );
}
