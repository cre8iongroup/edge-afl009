'use client';

import ErrorFallback from '@/components/error-fallback';
import './globals.css';

/**
 * Last-resort boundary for errors in the root layout tree — including
 * FirebaseErrorListener's intentional rethrow of Firestore permission errors.
 * Replaces the entire root layout, so this file must define html/body and CSS.
 *
 * Note: In development, Next often shows its overlay instead of this UI.
 * Production (and production builds) is where partners will see it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <ErrorFallback
          error={error}
          reset={() => {
            // Prefer boundary reset; hard reload if the tree is still poisoned.
            try {
              reset();
            } catch {
              window.location.reload();
            }
          }}
          source="global-error"
        />
      </body>
    </html>
  );
}
