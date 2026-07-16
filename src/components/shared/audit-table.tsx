'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Presenter, Submission } from '@/lib/types';
import { useSubmissions } from '@/components/submissions-provider';
import { getAVStatus, type AVStatusResult } from '@/lib/av-status';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Download,
  Search,
  X,
} from 'lucide-react';

// ─── Column config ────────────────────────────────────────────────────────────

type ColumnId =
  | 'sessionId'
  | 'title'
  | 'company'
  | 'presenterName'
  | 'headshot'
  | 'bio'
  | 'avStatus'
  | 'payment';

const COLUMN_DEFS: { id: ColumnId; label: string; defaultVisible: boolean }[] = [
  { id: 'sessionId', label: 'Session ID', defaultVisible: true },
  { id: 'title', label: 'Session Title', defaultVisible: true },
  { id: 'company', label: 'Company', defaultVisible: true },
  { id: 'presenterName', label: 'Presenter', defaultVisible: true },
  { id: 'headshot', label: 'Headshot', defaultVisible: true },
  { id: 'bio', label: 'Bio', defaultVisible: true },
  { id: 'avStatus', label: 'AV Status', defaultVisible: true },
  { id: 'payment', label: 'Payment / Order', defaultVisible: false },
];

const LS_COLS_KEY = 'edge:audit:columnVisibility:v1';

const AV_VARIANT_CLASSES: Record<string, string> = {
  muted: 'border-muted-foreground/40 text-muted-foreground bg-muted/40',
  destructive: 'border-red-500/50 text-red-600 bg-red-500/10',
  warning: 'border-amber-500/50 text-amber-600 bg-amber-500/10',
  success: 'border-green-500/50 text-green-600 bg-green-500/10',
  default: 'border-border text-foreground',
};

// ─── Row model ────────────────────────────────────────────────────────────────

type AuditRow = {
  key: string;
  sessionId: string;
  title: string;
  company: string;
  presenterName: string;
  noPresenter: boolean;
  headshotUrl: string;
  hasHeadshot: boolean;
  bio: string;
  hasBio: boolean;
  avStatus: AVStatusResult;
  avComplete: boolean;
  paymentLabel: string;
  presenterIncomplete: boolean;
  outstanding: boolean;
};

function isAvComplete(label: string): boolean {
  return label === 'Paid' || label === 'No Charge';
}

function paymentLabel(sub: Submission): string {
  const method = sub.paymentMethod ?? null;
  const status = sub.paymentStatus ?? null;
  if (status === 'complete') {
    if (method === 'free' || sub.avSelection?.orderTotal === 0) return 'Complete (no charge)';
    if (method === 'stripe') return 'Complete (Stripe)';
    if (method === 'manual') return 'Complete (manual)';
    return 'Complete';
  }
  if (status === 'awaiting_manual') return 'Awaiting manual invoice';
  if (status === 'pending') return 'Pending';
  if (sub.avSelected && sub.paymentComplete === true) return 'Marked complete';
  if (sub.avSelected) return 'Not paid';
  return '—';
}

function flattenSubmissions(submissions: Submission[]): AuditRow[] {
  const rows: AuditRow[] = [];

  for (const sub of submissions) {
    const avStatus = getAVStatus(sub);
    const avComplete = isAvComplete(avStatus.label);
    const pay = paymentLabel(sub);
    const company = sub.companyName?.trim() || '';
    const title = sub.title?.trim() || '';
    const presenters = Array.isArray(sub.presenters) ? sub.presenters : [];

    if (presenters.length === 0) {
      rows.push({
        key: `${sub.id}__none`,
        sessionId: sub.id,
        title,
        company,
        presenterName: 'No presenter added',
        noPresenter: true,
        headshotUrl: '',
        hasHeadshot: false,
        bio: '',
        hasBio: false,
        avStatus,
        avComplete,
        paymentLabel: pay,
        presenterIncomplete: true,
        outstanding: true,
      });
      continue;
    }

    presenters.forEach((p: Presenter, idx: number) => {
      const bio = (p.bio ?? '').trim();
      const headshotUrl = (p.headshotUrl ?? '').trim();
      const hasHeadshot = headshotUrl.length > 0;
      const hasBio = bio.length > 0;
      const presenterIncomplete = !p.name?.trim() || !hasHeadshot || !hasBio;
      rows.push({
        key: `${sub.id}__${p.id || idx}`,
        sessionId: sub.id,
        title,
        company,
        presenterName: p.name?.trim() || '—',
        noPresenter: false,
        headshotUrl,
        hasHeadshot,
        bio,
        hasBio,
        avStatus,
        avComplete,
        paymentLabel: pay,
        presenterIncomplete,
        outstanding: presenterIncomplete || !avComplete,
      });
    });
  }

  return rows;
}

function loadColumnVisibility(): Record<ColumnId, boolean> {
  const defaults = Object.fromEntries(
    COLUMN_DEFS.map(c => [c.id, c.defaultVisible]),
  ) as Record<ColumnId, boolean>;

  try {
    const raw = localStorage.getItem(LS_COLS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<ColumnId, boolean>>;
    const merged = { ...defaults };
    for (const def of COLUMN_DEFS) {
      if (typeof parsed[def.id] === 'boolean') merged[def.id] = parsed[def.id]!;
    }
    return merged;
  } catch {
    return defaults;
  }
}

type SortDir = 'asc' | 'desc';

function compareRows(a: AuditRow, b: AuditRow, key: ColumnId, dir: SortDir): number {
  const mul = dir === 'asc' ? 1 : -1;
  const str = (v: string) => v.toLowerCase();

  let cmp = 0;
  switch (key) {
    case 'sessionId':
      cmp = str(a.sessionId).localeCompare(str(b.sessionId));
      break;
    case 'title':
      cmp = str(a.title).localeCompare(str(b.title));
      break;
    case 'company':
      cmp = str(a.company).localeCompare(str(b.company));
      break;
    case 'presenterName':
      cmp = str(a.presenterName).localeCompare(str(b.presenterName));
      break;
    case 'headshot':
      cmp = Number(a.hasHeadshot) - Number(b.hasHeadshot);
      break;
    case 'bio':
      cmp = str(a.bio).localeCompare(str(b.bio));
      break;
    case 'avStatus':
      cmp = str(a.avStatus.label).localeCompare(str(b.avStatus.label));
      break;
    case 'payment':
      cmp = str(a.paymentLabel).localeCompare(str(b.paymentLabel));
      break;
    default:
      cmp = 0;
  }
  return cmp * mul;
}

async function downloadHeadshotJpeg(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? filename : `${filename}.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

// ─── Main table ───────────────────────────────────────────────────────────────

export default function AuditTable() {
  const { submissions, loading } = useSubmissions();

  const [companyFilter, setCompanyFilter] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [outstandingOnly, setOutstandingOnly] = useState(true);
  const [sortKey, setSortKey] = useState<ColumnId>('company');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [colVisibility, setColVisibility] = useState<Record<ColumnId, boolean>>(
    () => Object.fromEntries(COLUMN_DEFS.map(c => [c.id, c.defaultVisible])) as Record<ColumnId, boolean>,
  );
  const [colsHydrated, setColsHydrated] = useState(false);

  useEffect(() => {
    setColVisibility(loadColumnVisibility());
    setColsHydrated(true);
  }, []);

  useEffect(() => {
    if (!colsHydrated) return;
    try {
      localStorage.setItem(LS_COLS_KEY, JSON.stringify(colVisibility));
    } catch {
      // ignore quota / private mode
    }
  }, [colVisibility, colsHydrated]);

  const rows = useMemo(() => flattenSubmissions(submissions), [submissions]);

  const filtered = useMemo(() => {
    const companyNeedle = companyFilter.trim().toLowerCase();
    const titleNeedle = titleFilter.trim().toLowerCase();

    return rows.filter(row => {
      if (outstandingOnly && !row.outstanding) return false;
      if (companyNeedle && !row.company.toLowerCase().includes(companyNeedle)) return false;
      if (titleNeedle && !row.title.toLowerCase().includes(titleNeedle)) return false;
      return true;
    });
  }, [rows, companyFilter, titleFilter, outstandingOnly]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => compareRows(a, b, sortKey, sortDir)),
    [filtered, sortKey, sortDir],
  );

  const visibleCols = useMemo(
    () => COLUMN_DEFS.filter(c => colVisibility[c.id]),
    [colVisibility],
  );

  const toggleSort = (id: ColumnId) => {
    if (sortKey === id) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(id);
      setSortDir('asc');
    }
  };

  const toggleColumn = (id: ColumnId) => {
    setColVisibility(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const clearFilters = () => {
    setCompanyFilter('');
    setTitleFilter('');
    setOutstandingOnly(false);
  };

  const hasActiveFilters =
    companyFilter.trim() !== '' || titleFilter.trim() !== '' || outstandingOnly;

  const handleDownload = useCallback(async (row: AuditRow) => {
    if (!row.headshotUrl) return;
    const safeName = (row.presenterName || 'headshot').replace(/[^\w.-]+/g, '_');
    try {
      await downloadHeadshotJpeg(row.headshotUrl, `${safeName}.jpg`);
    } catch (err) {
      console.error('Headshot download failed', err);
      // Fallback: open in new tab if fetch/CORS fails
      window.open(row.headshotUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading sessions…</p>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-3">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/30 px-4 py-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Company
            </span>
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={companyFilter}
                onChange={e => setCompanyFilter(e.target.value)}
                placeholder="Company…"
                className="h-8 pl-8 w-44"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Session title
            </span>
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={titleFilter}
                onChange={e => setTitleFilter(e.target.value)}
                placeholder="Title…"
                className="h-8 pl-8 w-52"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Completeness
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setOutstandingOnly(true)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border whitespace-nowrap',
                  outstandingOnly
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground',
                )}
              >
                Outstanding only
              </button>
              <button
                type="button"
                onClick={() => setOutstandingOnly(false)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border whitespace-nowrap',
                  !outstandingOnly
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground',
                )}
              >
                Show all
              </button>
            </div>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
                <Columns3 className="h-3.5 w-3.5" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Toggle columns</p>
              {COLUMN_DEFS.map(col => (
                <label
                  key={col.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={colVisibility[col.id]}
                    onCheckedChange={() => toggleColumn(col.id)}
                  />
                  {col.label}
                </label>
              ))}
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-8 ml-auto flex items-center gap-1.5 px-3 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-transparent hover:border-border"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
          <span>
            {sorted.length} row{sorted.length !== 1 ? 's' : ''}
          </span>
          {hasActiveFilters && (
            <span className="text-xs">(filtered from {rows.length} total)</span>
          )}
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleCols.map(col => (
                      <TableHead key={col.id}>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={() => toggleSort(col.id)}
                        >
                          {col.label}
                          {sortKey === col.id ? (
                            sortDir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                          )}
                        </button>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={Math.max(visibleCols.length, 1)}
                        className="py-12 text-center text-sm text-muted-foreground"
                      >
                        {hasActiveFilters
                          ? 'No rows match the active filters.'
                          : 'No sessions found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sorted.map(row => (
                      <TableRow key={row.key}>
                        {visibleCols.map(col => (
                          <TableCell key={col.id} className="align-top text-sm">
                            {renderCell(col.id, row, handleDownload)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function renderCell(
  id: ColumnId,
  row: AuditRow,
  onDownload: (row: AuditRow) => void,
) {
  switch (id) {
    case 'sessionId':
      return (
        <span className="font-mono text-xs text-muted-foreground break-all">{row.sessionId}</span>
      );
    case 'title':
      return <span className="font-medium max-w-[240px] block">{row.title || '—'}</span>;
    case 'company':
      return <span className="text-muted-foreground">{row.company || '—'}</span>;
    case 'presenterName':
      return (
        <span className={cn(row.noPresenter && 'italic text-muted-foreground')}>
          {row.presenterName}
        </span>
      );
    case 'headshot':
      return <HeadshotCell row={row} onDownload={onDownload} />;
    case 'bio':
      if (row.noPresenter) {
        return <span className="text-muted-foreground italic">—</span>;
      }
      return row.hasBio ? (
        <p className="max-w-md whitespace-pre-wrap text-muted-foreground leading-relaxed">
          {row.bio}
        </p>
      ) : (
        <Badge
          variant="outline"
          className="border-red-500/50 text-red-600 bg-red-500/10 whitespace-nowrap"
        >
          Missing
        </Badge>
      );
    case 'avStatus':
      return (
        <Badge
          variant="outline"
          className={cn(
            'whitespace-nowrap',
            AV_VARIANT_CLASSES[row.avStatus.variant] ?? AV_VARIANT_CLASSES.default,
          )}
        >
          {row.avStatus.label}
        </Badge>
      );
    case 'payment':
      return <span className="text-muted-foreground whitespace-nowrap">{row.paymentLabel}</span>;
    default:
      return null;
  }
}

function HeadshotCell({
  row,
  onDownload,
}: {
  row: AuditRow;
  onDownload: (row: AuditRow) => void;
}) {
  if (row.noPresenter) {
    return <span className="text-muted-foreground italic">—</span>;
  }

  if (!row.hasHeadshot) {
    return (
      <Badge
        variant="outline"
        className="border-red-500/50 text-red-600 bg-red-500/10 whitespace-nowrap"
      >
        N
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 group"
          onClick={() => onDownload(row)}
          title="Click to download JPEG"
        >
          <Badge
            variant="outline"
            className="border-green-500/50 text-green-600 bg-green-500/10 whitespace-nowrap cursor-pointer group-hover:bg-green-500/20"
          >
            Y
          </Badge>
          <Download className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="p-1.5 max-w-none bg-popover border shadow-lg"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={row.headshotUrl}
          alt={row.presenterName}
          className="h-40 w-40 rounded-md object-cover"
        />
      </TooltipContent>
    </Tooltip>
  );
}
