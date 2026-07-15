'use client';

import { useState, useMemo, useCallback, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Submission } from '@/lib/types';
import { useSubmissions } from '@/components/submissions-provider';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, Search, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'opted_out' | 'opted_in';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(text: string, max = 50): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatLocalTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function pocLabel(sub: Submission): string {
  const name = sub.pocName || sub.presenterPocName || '';
  if (name.trim()) return name.trim();
  const email = sub.pocEmail || sub.presenterPocEmail || '';
  return email.trim() || '—';
}

function latestConsentTimestamp(log: Submission['aiNotesConsentLog']): string | null {
  if (!log?.length) return null;
  return log[log.length - 1]?.timestamp ?? null;
}

function actionLabel(action: 'opted_out' | 'opted_in'): string {
  return action === 'opted_out' ? 'Opted Out' : 'Opted In';
}

// ─── ThreeWay filter ──────────────────────────────────────────────────────────

function ThreeWay({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
}) {
  const opts: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'opted_out', label: 'Opted Out' },
    { value: 'opted_in', label: 'Opted In' },
  ];
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {opts.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border whitespace-nowrap',
              value === o.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AiNotesStatusTable() {
  const { submissions } = useSubmissions();
  const router = useRouter();
  const searchParams = useSearchParams();

  const validStatus = new Set<StatusFilter>(['all', 'opted_out', 'opted_in']);

  function parseStatusParam(param: string | null): StatusFilter {
    if (param && validStatus.has(param as StatusFilter)) return param as StatusFilter;
    return 'all';
  }

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    parseStatusParam(searchParams.get('status')),
  );
  const [companyFilter, setCompanyFilter] = useState(() =>
    searchParams.get('company') ?? '',
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const pushFiltersToUrl = useCallback(
    (nextStatus: StatusFilter, nextCompany: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextStatus !== 'all') {
        params.set('status', nextStatus);
      } else {
        params.delete('status');
      }

      if (nextCompany.trim()) {
        params.set('company', nextCompany.trim());
      } else {
        params.delete('company');
      }

      const qs = params.toString();
      router.push(`${window.location.pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [searchParams, router],
  );

  const hasActiveFilters = statusFilter !== 'all' || companyFilter !== '';

  const clearAllFilters = () => {
    setStatusFilter('all');
    setCompanyFilter('');
    pushFiltersToUrl('all', '');
  };

  const filtered = useMemo(() =>
    submissions.filter(sub => {
      if (companyFilter && !sub.companyName?.toLowerCase().includes(companyFilter.toLowerCase())) {
        return false;
      }
      const optedOut = sub.aiNotesOptOut === true;
      if (statusFilter === 'opted_out' && !optedOut) return false;
      if (statusFilter === 'opted_in' && optedOut) return false;
      return true;
    }),
    [submissions, companyFilter, statusFilter],
  );

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      // Opted out first, then company name
      const aOut = a.aiNotesOptOut === true ? 0 : 1;
      const bOut = b.aiNotesOptOut === true ? 0 : 1;
      if (aOut !== bOut) return aOut - bOut;
      return (a.companyName ?? '').localeCompare(b.companyName ?? '');
    }),
    [filtered],
  );

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/30 px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Company</span>
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={companyFilter}
              onChange={e => {
                const val = e.target.value;
                setCompanyFilter(val);
                pushFiltersToUrl(statusFilter, val);
              }}
              placeholder="Company…"
              className="h-8 pl-8 pr-7 text-sm w-44 rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {companyFilter && (
              <button
                type="button"
                onClick={() => {
                  setCompanyFilter('');
                  pushFiltersToUrl(statusFilter, '');
                }}
                className="absolute right-2 text-muted-foreground hover:text-foreground"
                aria-label="Clear company filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <ThreeWay
          label="AI Notes"
          value={statusFilter}
          onChange={v => {
            setStatusFilter(v);
            pushFiltersToUrl(v, companyFilter);
          }}
        />

        {hasActiveFilters && (
          <div className="flex flex-col justify-end ml-auto">
            <button
              type="button"
              onClick={clearAllFilters}
              className="h-8 flex items-center gap-1.5 px-3 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-transparent hover:border-border"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* ── Summary strip ── */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 pb-1">
        <span>{sorted.length} session{sorted.length !== 1 ? 's' : ''}</span>
        {hasActiveFilters && (
          <span className="text-xs">(filtered from {submissions.length} total)</span>
        )}
      </div>

      {/* ── Table ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Session Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>POC</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Last Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      {hasActiveFilters
                        ? 'No sessions match the active filters.'
                        : 'No sessions found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map(item => {
                    const optedOut = item.aiNotesOptOut === true;
                    const lastAt = latestConsentTimestamp(item.aiNotesConsentLog);
                    const expanded = expandedIds.has(item.id);
                    const log = item.aiNotesConsentLog ?? [];

                    return (
                      <Fragment key={item.id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() =>
                            router.push(
                              `/submit/${item.sessionType}/${item.id}?from=ai-notes-status`,
                            )
                          }
                        >
                          <TableCell
                            className="w-10"
                            onClick={e => {
                              e.stopPropagation();
                              toggleExpand(item.id);
                            }}
                          >
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                              aria-label={expanded ? 'Collapse history' : 'Expand history'}
                              aria-expanded={expanded}
                            >
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 transition-transform',
                                  expanded && 'rotate-180',
                                )}
                              />
                            </button>
                          </TableCell>
                          <TableCell className="text-sm font-medium max-w-[280px]">
                            <span title={item.title}>{truncate(item.title || '—')}</span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.companyName || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {pocLabel(item)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                'whitespace-nowrap',
                                optedOut
                                  ? 'border-red-500/50 text-red-600 bg-red-500/10'
                                  : 'border-green-500/50 text-green-600 bg-green-500/10',
                              )}
                            >
                              {optedOut ? 'Opted Out' : 'Opted In'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {lastAt ? formatLocalTimestamp(lastAt) : '—'}
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={6} className="py-3 px-6">
                              {log.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No consent history yet.
                                </p>
                              ) : (
                                <ul className="space-y-1.5 text-sm">
                                  {[...log].reverse().map((entry, idx) => (
                                    <li
                                      key={`${entry.timestamp}-${entry.action}-${idx}`}
                                      className="flex flex-wrap items-center gap-x-3 gap-y-1"
                                    >
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'whitespace-nowrap',
                                          entry.action === 'opted_out'
                                            ? 'border-red-500/50 text-red-600 bg-red-500/10'
                                            : 'border-green-500/50 text-green-600 bg-green-500/10',
                                        )}
                                      >
                                        {actionLabel(entry.action)}
                                      </Badge>
                                      <span className="text-muted-foreground">
                                        {formatLocalTimestamp(entry.timestamp)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
