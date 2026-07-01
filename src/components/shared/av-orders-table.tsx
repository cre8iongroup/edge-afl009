'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Submission } from '@/lib/types';
import { useSubmissions } from '@/components/submissions-provider';
import { cn } from '@/lib/utils';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Briefcase,
  Presentation,
  Handshake,
  X,
  CheckCheck,
  Search,
} from 'lucide-react';
import {
  getAVStatus,
  AV_STATUS_SORT_ORDER,
  AV_STATUS_LABELS,
  type AVStatusVariant,
} from '@/lib/av-status';

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_TYPE_CONFIG: Record<Submission['sessionType'], { icon: React.ElementType; label: string }> = {
  workshop:       { icon: Briefcase,    label: 'Workshop' },
  reception:      { icon: Handshake,    label: 'Reception' },
  'info-session': { icon: Presentation, label: 'Info Session' },
};

type ProxyFilter = 'all' | 'yes' | 'no';

/** Maps AVStatusVariant to Tailwind classes for the badge. */
const VARIANT_CLASSES: Record<AVStatusVariant, string> = {
  success:     'border-green-500/50 text-green-600 bg-green-500/10',
  warning:     'border-amber-500/50 text-amber-600 bg-amber-500/10',
  destructive: 'border-red-500/50 text-red-600 bg-red-500/10',
  muted:       'border-border text-muted-foreground bg-muted/40',
  default:     '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function truncate(text: string, max = 50): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// ─── ThreeWay toggle (same pattern as sessions-table.tsx) ─────────────────────

function ThreeWay({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ProxyFilter;
  onChange: (v: ProxyFilter) => void;
}) {
  const opts: { value: ProxyFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'yes', label: 'Yes' },
    { value: 'no',  label: 'No' },
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
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
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

export default function AVOrdersTable() {
  const { submissions } = useSubmissions();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Read initial filter values from URL params ──────────────────────────────

  const validStatusLabels = new Set<string>(AV_STATUS_LABELS);
  const validSessionTypes = new Set(['workshop', 'reception', 'info-session']);
  const validProxyValues  = new Set<ProxyFilter>(['all', 'yes', 'no']);

  function parseArrayParam(param: string | null, validSet: Set<string>): string[] {
    if (!param) return [];
    return param.split(',').map(s => s.trim()).filter(s => validSet.has(s));
  }

  function parseProxyParam(param: string | null): ProxyFilter {
    if (param && validProxyValues.has(param as ProxyFilter)) return param as ProxyFilter;
    return 'all';
  }

  const [statusFilter, setStatusFilter] = useState<string[]>(() =>
    parseArrayParam(searchParams.get('status'), validStatusLabels),
  );
  const [typeFilter, setTypeFilter] = useState<string[]>(() =>
    parseArrayParam(searchParams.get('type'), validSessionTypes),
  );
  const [proxyFilter, setProxyFilter] = useState<ProxyFilter>(() =>
    parseProxyParam(searchParams.get('proxy')),
  );
  const [companyFilter, setCompanyFilter] = useState(() =>
    searchParams.get('company') ?? '',
  );

  // ── Sync filters to URL ─────────────────────────────────────────────────────

  const pushFiltersToUrl = useCallback(
    (nextStatus: string[], nextType: string[], nextProxy: ProxyFilter, nextCompany: string) => {
      const params = new URLSearchParams(searchParams.toString());

      // Status
      if (nextStatus.length > 0) {
        params.set('status', nextStatus.join(','));
      } else {
        params.delete('status');
      }

      // Type
      if (nextType.length > 0) {
        params.set('type', nextType.join(','));
      } else {
        params.delete('type');
      }

      // Proxy
      if (nextProxy !== 'all') {
        params.set('proxy', nextProxy);
      } else {
        params.delete('proxy');
      }

      // Company
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

  const hasActiveFilters =
    statusFilter.length > 0 ||
    typeFilter.length > 0 ||
    proxyFilter !== 'all' ||
    companyFilter !== '';

  const clearAllFilters = () => {
    setStatusFilter([]);
    setTypeFilter([]);
    setProxyFilter('all');
    setCompanyFilter('');
    pushFiltersToUrl([], [], 'all', '');
  };

  const toggleStatus = (v: string) => {
    const next = statusFilter.includes(v) ? statusFilter.filter(x => x !== v) : [...statusFilter, v];
    setStatusFilter(next);
    pushFiltersToUrl(next, typeFilter, proxyFilter, companyFilter);
  };

  const toggleType = (v: string) => {
    const next = typeFilter.includes(v) ? typeFilter.filter(x => x !== v) : [...typeFilter, v];
    setTypeFilter(next);
    pushFiltersToUrl(statusFilter, next, proxyFilter, companyFilter);
  };

  // ── Enrich with AV status and sort ──────────────────────────────────────────

  const enriched = useMemo(() =>
    submissions.map(sub => ({
      ...sub,
      _avStatus: getAVStatus(sub),
    })),
    [submissions],
  );

  const filtered = useMemo(() =>
    enriched.filter(sub => {
      if (companyFilter && !sub.companyName?.toLowerCase().includes(companyFilter.toLowerCase())) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(sub._avStatus.label)) return false;
      if (typeFilter.length > 0 && !typeFilter.includes(sub.sessionType)) return false;
      if (proxyFilter === 'yes' && !sub.isProxy) return false;
      if (proxyFilter === 'no' && sub.isProxy) return false;
      return true;
    }),
    [enriched, companyFilter, statusFilter, typeFilter, proxyFilter],
  );

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      const aOrder = AV_STATUS_SORT_ORDER[a._avStatus.label] ?? 99;
      const bOrder = AV_STATUS_SORT_ORDER[b._avStatus.label] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Secondary sort: company name alphabetical
      return (a.companyName ?? '').localeCompare(b.companyName ?? '');
    }),
    [filtered],
  );

  // ── Status count badges ─────────────────────────────────────────────────────

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sub of enriched) {
      counts[sub._avStatus.label] = (counts[sub._avStatus.label] || 0) + 1;
    }
    return counts;
  }, [enriched]);

  return (
    <TooltipProvider delayDuration={200}>
      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/30 px-4 py-3">

        {/* Company search */}
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
                pushFiltersToUrl(statusFilter, typeFilter, proxyFilter, val);
              }}
              placeholder="Company…"
              className="h-8 pl-8 pr-7 text-sm w-44 rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {companyFilter && (
              <button
                type="button"
                onClick={() => {
                  setCompanyFilter('');
                  pushFiltersToUrl(statusFilter, typeFilter, proxyFilter, '');
                }}
                className="absolute right-2 text-muted-foreground hover:text-foreground"
                aria-label="Clear company filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* AV Status multi-toggle */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">AV Status</span>
          <div className="flex flex-wrap gap-1">
            {AV_STATUS_LABELS.map(label => (
              <button
                key={label}
                type="button"
                onClick={() => toggleStatus(label)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border whitespace-nowrap',
                  statusFilter.includes(label)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground',
                )}
              >
                {label}
                <span className="ml-1 opacity-60">{statusCounts[label] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Session Type */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Type</span>
          <div className="flex gap-1">
            {(['workshop', 'reception', 'info-session'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
                  typeFilter.includes(t)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground',
                )}
              >
                {SESSION_TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* Proxy */}
        <ThreeWay label="Proxy" value={proxyFilter} onChange={(v) => {
          setProxyFilter(v);
          pushFiltersToUrl(statusFilter, typeFilter, v, companyFilter);
        }} />

        {/* Clear */}
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
          <span className="text-xs">
            (filtered from {enriched.length} total)
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Session Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Proxy</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead className="text-right">Order Total</TableHead>
                  <TableHead className="text-center">AV Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      {hasActiveFilters
                        ? 'No sessions match the active filters.'
                        : 'No sessions found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map(item => {
                    const TypeIcon = SESSION_TYPE_CONFIG[item.sessionType]?.icon || Briefcase;
                    const typeLabel = SESSION_TYPE_CONFIG[item.sessionType]?.label || 'Workshop';
                    const av = item.avSelection;
                    const status = item._avStatus;

                    return (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/submit/${item.sessionType}/${item.id}?from=av-orders`)}
                      >
                        {/* Company */}
                        <TableCell className="text-sm font-medium">
                          {item.companyName || '—'}
                        </TableCell>

                        {/* Session Title */}
                        <TableCell className="text-sm text-muted-foreground max-w-[280px]">
                          <span title={item.title}>{truncate(item.title)}</span>
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <TypeIcon className="h-4 w-4 text-muted-foreground" />
                            {typeLabel}
                          </div>
                        </TableCell>

                        {/* Proxy */}
                        <TableCell className="text-center">
                          {item.isProxy ? (
                            <CheckCheck className="h-4 w-4 text-muted-foreground mx-auto" />
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>

                        {/* Package */}
                        <TableCell className="text-sm">
                          {av?.packageName || <span className="text-muted-foreground">—</span>}
                        </TableCell>

                        {/* Order Total */}
                        <TableCell className="text-right text-sm tabular-nums">
                          {av && av.orderTotal > 0
                            ? formatDollars(av.orderTotal)
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>

                        {/* AV Status badge with tooltip */}
                        <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'whitespace-nowrap cursor-help',
                                    VARIANT_CLASSES[status.variant],
                                  )}
                                >
                                  {status.label}
                                </Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed">
                              {status.tooltip}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
