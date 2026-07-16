'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AlpfaLogo from '@/components/alpfa-logo';
import Cre8ionLogo from '@/components/cre8ion-logo';
import { logClientError, type ClientErrorLogSource } from '@/lib/client-error-log';

const SUPPORT_EMAIL = 'edge@cre8iongroup.com';

type ErrorFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
  source: ClientErrorLogSource;
};

export default function ErrorFallback({ error, reset, source }: ErrorFallbackProps) {
  useEffect(() => {
    logClientError(source, error);
  }, [error, source]);

  const supportHref = (() => {
    const subject = encodeURIComponent('ALPFA 2026 Portal — application error');
    const body = encodeURIComponent(
      [
        'I hit an application error on the ALPFA 2026 Convention Portal.',
        '',
        `Time: ${new Date().toISOString()}`,
        `Page: ${typeof window !== 'undefined' ? window.location.href : '(unknown)'}`,
        `Error: ${error.message}`,
        error.digest ? `Digest: ${error.digest}` : null,
        '',
        'Please help me regain access to my sessions.',
      ]
        .filter(Boolean)
        .join('\n'),
    );
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  })();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute top-8 flex items-center gap-4">
        <AlpfaLogo className="h-12 w-auto" />
        <span className="text-2xl font-thin text-muted-foreground">x</span>
        <Cre8ionLogo className="h-8 w-auto" />
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: '28rem' }}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '-64px',
            zIndex: 0,
            pointerEvents: 'none',
            borderRadius: '2rem',
            opacity: 0.9,
            filter: 'blur(48px)',
            background:
              'radial-gradient(ellipse at 15% 15%, #009FE3 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, #EC008C 0%, transparent 55%)',
          }}
        />
        <div
          style={{
            padding: '1px',
            borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, #009FE3, #EC008C)',
            boxShadow: '0 0 20px rgba(0, 159, 227, 0.3), 0 0 40px rgba(236, 0, 140, 0.2)',
          }}
        >
          <Card
            className="relative z-10 w-full max-w-md bg-card/80 backdrop-blur-sm shadow-2xl"
            style={{ borderRadius: '0.7rem', border: 'none' }}
          >
            <CardHeader className="text-center space-y-2">
              <CardTitle className="font-headline text-2xl">Something went wrong</CardTitle>
              <CardDescription>
                The ALPFA 2026 Convention Portal hit an unexpected error. You can try again, or
                contact our team if it keeps happening.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-left">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Error detail
                </p>
                <p className="mt-1 break-words text-xs text-foreground/90 font-mono">
                  {error.message || 'Unknown client-side exception'}
                </p>
                {error.digest && (
                  <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                    Digest: {error.digest}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={reset}
                >
                  Try again
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    window.location.href = '/';
                  }}
                >
                  Back to sign in
                </Button>
                <a
                  href={supportHref}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Contact support ({SUPPORT_EMAIL})
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        ALPFA 2026 Convention, powered by{' '}
        <strong className="font-semibold text-foreground">cre8ion Edge</strong>.
      </footer>
    </div>
  );
}
