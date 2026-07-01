'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Submission } from '@/lib/types';
import { useSubmissions } from '@/components/submissions-provider';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { cn } from '@/lib/utils';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Briefcase,
  Presentation,
  Handshake,
  X,
  Search,
} from 'lucide-react';
import {
  getScenicItems,
  SCENIC_STATUS_OPTIONS,
  SCENIC_STATUS_SORT_ORDER,
  type ScenicItems,
} from '@/lib/scenic-items';
import { useToast } from '@/hooks/use-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_TYPE_CONFIG: Record<Submission['sessionType'], { icon: React.ElementType; label: string }> = {
  workshop:       { icon: Briefcase,    label: 'Workshop' },
  reception:      { icon: Handshake,    label: 'Reception' },
  'info-session': { icon: Presentation, label: 'Info Session' },
};

const STATUS_CLASSES: Record<string, string> = {
  'To Do':                 'border-amber-500/50 text-amber-600 bg-amber-500/10',
  'Needs Partner Logo':    'border-red-500/50 text-red-600 bg-red-500/10',
  'In Progress':           'border-blue-500/50 text-blue-600 bg-blue-500/10',
  'Ready for Convention':  'border-green-500/50 text-green-600 bg-green-500/10',
};

// Scenic status filter options — the four statuses plus 'Unset'
const SCENIC_FILTER_LABELS = [...SCENIC_STATUS_OPTIONS, 'Unset'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(text: string, max = 50): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScenicTable() {
  const { submissions } = useSubmissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();

  // ── Read initial filter values from URL params ──────────────────────────────

  const validFilterLabels = new Set<string>(SCENIC_FILTER_LABELS);
  const validSessionTypes = new Set(['workshop', 'reception', 'info-session']);

  function parseArrayParam(param: string | null, validSet: Set<string>): string[] {
    if (!param) return [];
    return param.split(',').map(s => s.trim()).filter(s => validSet.has(s));
  }

  const [scenicStatusFilter, setScenicStatusFilter] = useState<string[]>(() =>
    parseArrayParam(searchParams.get('scenicStatus'), validFilterLabels),
  );
  const [typeFilter, setTypeFilter] = useState<string[]>(() =>
    parseArrayParam(searchParams.get('type'), validSessionTypes),
  );
  const [companyFilter, setCompanyFilter] = useState(() =>
    searchParams.get('company') ?? '',
  );

  // ── Sync filters to URL ─────────────────────────────────────────────────────

  const pushFiltersToUrl = useCallback(
    (nextScenicStatus: string[], nextType: string[], nextCompany: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextScenicStatus.length > 0) {
        params.set('scenicStatus', nextScenicStatus.join(','));
      } else {
        params.delete('scenicStatus');
      }

      if (nextType.length > 0) {
        params.set('type', nextType.join(','));
      } else {
        params.delete('type');
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

  const hasActiveFilters =
    scenicStatusFilter.length > 0 ||
    typeFilter.length > 0 ||
    companyFilter !== '';

  const clearAllFilters = () => {
    setScenicStatusFilter([]);
    setTypeFilter([]);
    setCompanyFilter('');
    pushFiltersToUrl([], [], '');
  };

  const toggleScenicStatus = (v: string) => {
    const next = scenicStatusFilter.includes(v) ? scenicStatusFilter.filter(x => x !== v) : [...scenicStatusFilter, v];
    setScenicStatusFilter(next);
    pushFiltersToUrl(next, typeFilter, companyFilter);
  };

  const toggleType = (v: string) => {
    const next = typeFilter.includes(v) ? typeFilter.filter(x => x !== v) : [...typeFilter, v];
    setTypeFilter(next);
    pushFiltersToUrl(scenicStatusFilter, next, companyFilter);
  };

  // ── Scenic status write to Firestore ────────────────────────────────────────

  const handleScenicStatusChange = async (submissionId: string, value: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'submissions', submissionId);
    try {
      if (value === '__unset__') {
        await updateDoc(docRef, { scenicStatus: deleteField() });
        toast({ title: 'Scenic status cleared' });
      } else {
        await updateDoc(docRef, { scenicStatus: value });
        toast({ title: `Scenic status set to ${value}` });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not update scenic status.' });
    }
  };

  // ── Enrich: filter to AV-ordered sessions, compute scenic items ─────────────

  const enriched = useMemo(() =>
    submissions
      .filter(sub => sub.avSelected === true)
      .map(sub => ({
        ...sub,
        _scenic: getScenicItems(sub),
        _statusLabel: sub.scenicStatus || 'Unset',
      })),
    [submissions],
  );

  const filtered = useMemo(() =>
    enriched.filter(sub => {
      if (companyFilter && !sub.companyName?.toLowerCase().includes(companyFilter.toLowerCase())) return false;
      if (scenicStatusFilter.length > 0) {
        const label = sub.scenicStatus || 'Unset';
        if (!scenicStatusFilter.includes(label)) return false;
      }
      if (typeFilter.length > 0 && !typeFilter.includes(sub.sessionType)) return false;
      return true;
    }),
    [enriched, companyFilter, scenicStatusFilter, typeFilter],
  );

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      // Unset / no scenic items get priority 0 (surface first)
      const aHasItems = a._scenic.included.length > 0 || a._scenic.addOns.length > 0;
      const bHasItems = b._scenic.included.length > 0 || b._scenic.addOns.length > 0;

      const aOrder = !a.scenicStatus ? 0
        : !aHasItems ? 0
        : SCENIC_STATUS_SORT_ORDER[a.scenicStatus] ?? 99;
      const bOrder = !b.scenicStatus ? 0
        : !bHasItems ? 0
        : SCENIC_STATUS_SORT_ORDER[b.scenicStatus] ?? 99;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.companyName ?? '').localeCompare(b.companyName ?? '');
    }),
    [filtered],
  );

  // ── Status counts ───────────────────────────────────────────────────────────

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sub of enriched) {
      const label = sub.scenicStatus || 'Unset';
      counts[label] = (counts[label] || 0) + 1;
    }
    return counts;
  }, [enriched]);

  return (
    <>
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
                pushFiltersToUrl(scenicStatusFilter, typeFilter, val);
              }}
              placeholder="Company…"
              className="h-8 pl-8 pr-7 text-sm w-44 rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {companyFilter && (
              <button
                type="button"
                onClick={() => {
                  setCompanyFilter('');
                  pushFiltersToUrl(scenicStatusFilter, typeFilter, '');
                }}
                className="absolute right-2 text-muted-foreground hover:text-foreground"
                aria-label="Clear company filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scenic Status multi-toggle */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Scenic Status</span>
          <div className="flex flex-wrap gap-1">
            {SCENIC_FILTER_LABELS.map(label => (
              <button
                key={label}
                type="button"
                onClick={() => toggleScenicStatus(label)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border whitespace-nowrap',
                  scenicStatusFilter.includes(label)
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
                  <TableHead className="min-w-[260px]">Scenic Items</TableHead>
                  <TableHead className="min-w-[180px]">Scenic Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      {hasActiveFilters
                        ? 'No sessions match the active filters.'
                        : 'No sessions with AV orders found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map(item => {
                    const TypeIcon = SESSION_TYPE_CONFIG[item.sessionType]?.icon || Briefcase;
                    const typeLabel = SESSION_TYPE_CONFIG[item.sessionType]?.label || 'Workshop';
                    const scenic = item._scenic;
                    const hasItems = scenic.included.length > 0 || scenic.addOns.length > 0;

                    return (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/submit/${item.sessionType}/${item.id}?from=scenic`)}
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

                        {/* Scenic Items */}
                        <TableCell>
                          {!hasItems ? (
                            <span className="text-sm text-amber-600 font-medium">
                              No Scenic Items — Follow Up
                            </span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              {scenic.included.map(item => (
                                <span key={item} className="text-xs">
                                  {item} <span className="text-muted-foreground">(Included)</span>
                                </span>
                              ))}
                              {scenic.addOns.map(item => (
                                <span key={item} className="text-xs">
                                  {item}
                                </span>
                              ))}
                            </div>
                          )}
                        </TableCell>

                        {/* Scenic Status */}
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Select
                            value={item.scenicStatus || '__unset__'}
                            onValueChange={(v) => handleScenicStatusChange(item.id, v)}
                          >
                            <SelectTrigger className={cn(
                              'h-8 text-xs font-medium w-[170px] border',
                              item.scenicStatus
                                ? STATUS_CLASSES[item.scenicStatus] ?? ''
                                : 'border-border text-muted-foreground',
                            )}>
                              <SelectValue placeholder="To Do" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unset__">
                                <span className="text-muted-foreground">To Do</span>
                              </SelectItem>
                              {SCENIC_STATUS_OPTIONS.map(label => (
                                <SelectItem key={label} value={label}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
    </>
  );
}
