'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, limit, CollectionReference } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type ClientErrorDoc = {
  id: string;
  source?: string;
  message?: string;
  name?: string;
  digest?: string | null;
  stack?: string | null;
  authState?: string;
  href?: string | null;
  userAgent?: string | null;
  timestamp?: string;
  uid?: string | null;
  email?: string | null;
};

const PAGE_SIZE = 50;

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ClientErrorsPanel() {
  const firestore = useFirestore();
  const [errors, setErrors] = useState<ClientErrorDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [filter, setFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore) return;
    const col = collection(firestore, 'client_errors') as CollectionReference;
    const q = query(col, orderBy('timestamp', 'desc'), limit(PAGE_SIZE));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setErrors(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ClientErrorDoc, 'id'>),
          })),
        );
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load client_errors:', err);
        setLoading(false);
      },
    );
    return unsub;
  }, [firestore]);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    let list = errors;
    if (needle) {
      list = list.filter((e) => {
        const hay = [
          e.message,
          e.email,
          e.uid,
          e.href,
          e.authState,
          e.source,
          e.digest,
          e.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      });
    }
    if (!sortNewestFirst) {
      list = [...list].reverse();
    }
    return list;
  }, [errors, filter, sortNewestFirst]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Errors</CardTitle>
        <CardDescription>
          Recent crash reports from error boundaries (client_errors). Newest {PAGE_SIZE} by
          timestamp. Write-only from clients; superadmin read only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter message, email, href…"
            className="sm:max-w-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSortNewestFirst((v) => !v)}
          >
            {sortNewestFirst ? 'Newest first' : 'Oldest first'}
          </Button>
          <span className="text-xs text-muted-foreground sm:ml-auto">
            {visible.length} shown
            {filter.trim() ? ` (of ${errors.length} loaded)` : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading errors…</span>
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {errors.length === 0 ? 'No client errors recorded yet.' : 'No errors match this filter.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {visible.map((err) => {
              const open = expandedId === err.id;
              return (
                <li key={err.id} className="rounded-lg border">
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/40"
                    onClick={() => setExpandedId(open ? null : err.id)}
                    aria-expanded={open}
                  >
                    <span className="mt-0.5 text-muted-foreground shrink-0">
                      {open ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatTimestamp(err.timestamp)}
                        </span>
                        {err.source && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {err.source}
                          </span>
                        )}
                        {err.email && (
                          <span className="text-xs text-muted-foreground truncate">{err.email}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium break-words line-clamp-2">
                        {err.message || '(no message)'}
                      </p>
                    </div>
                  </button>
                  {open && (
                    <div className="border-t bg-muted/20 px-3 py-3 space-y-2 text-xs">
                      <Row label="Auth" value={err.authState} />
                      <Row label="UID" value={err.uid} />
                      <Row label="Email" value={err.email} />
                      <Row label="Href" value={err.href} />
                      <Row label="Digest" value={err.digest} />
                      <Row label="Name" value={err.name} />
                      <Row label="UA" value={err.userAgent} />
                      {err.stack && (
                        <div>
                          <p className="font-medium text-muted-foreground mb-1">Stack</p>
                          <pre
                            className={cn(
                              'max-h-48 overflow-auto rounded-md border bg-background p-2',
                              'whitespace-pre-wrap break-words font-mono text-[11px]',
                            )}
                          >
                            {err.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="break-all font-mono text-foreground/90">{value}</span>
    </div>
  );
}
