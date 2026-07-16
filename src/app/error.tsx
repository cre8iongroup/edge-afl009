'use client';

import ErrorFallback from '@/components/error-fallback';

/**
 * Catches uncaught errors in route segments under the root layout
 * (pages, nested layouts). Does NOT catch errors thrown inside root layout
 * itself — see global-error.tsx for FirebaseErrorListener / provider throws.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} source="error" />;
}
