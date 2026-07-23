'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Submission } from '@/lib/types';
import { useSubmissions } from '@/components/submissions-provider';
import { useUserProfiles } from '@/hooks/use-user-profiles';
import { useToast } from '@/hooks/use-toast';
import { createXeroInvoice } from '@/lib/xero-actions';
import { cn } from '@/lib/utils';
import { submissionFormConfig } from '@/lib/data';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Briefcase,
  Presentation,
  Handshake,
  Loader2,
  X,
  CheckCheck,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionsTableProps {
  role: 'admin' | 'client';
}

type ColumnId =
  | 'submitter'
  | 'company'
  | 'title'
  | 'type'
  | 'audience'
  | 'status'
  | 'room'
  | 'speaker'
  | 'av'
  | 'paid'
  | 'pillar'
  | 'format'
  | 'cpe';

type SortDir = 'asc' | 'desc';

type EnrichedSubmission = Submission & {
  _user: { name: string; email: string; avatar: string };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Submission['status'], { dot: string; label: string; className: string }> = {
  phase_1: { dot: 'bg-blue-500',   label: 'Awaiting Approval',          className: 'text-blue-500 border-blue-500/50' },
  phase_2: { dot: 'bg-yellow-500', label: 'Needs Information',           className: 'text-yellow-500 border-yellow-500/50' },
  phase_3: { dot: 'bg-indigo-500', label: 'Awaiting Room Assignment',    className: 'text-indigo-500 border-indigo-500/50' },
  phase_4: { dot: 'bg-green-500',  label: 'Session Confirmed',           className: 'text-green-500 border-green-500/50' },
};

const STATUS_ORDER: Record<Submission['status'], number> = {
  phase_1: 1,
  phase_2: 2,
  phase_3: 3,
  phase_4: 4,
};

const SESSION_TYPE_CONFIG: Record<Submission['sessionType'], { icon: React.ElementType; label: string }> = {
  workshop:      { icon: Briefcase,    label: 'Workshop' },
  reception:     { icon: Handshake,    label: 'Reception' },
  'info-session': { icon: Presentation, label: 'Info Session' },
};

type AVFilter = 'all' | 'yes' | 'no';
type ProxyFilter = 'all' | 'yes' | 'no';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves the speaker name from a submission.
 * Prefers the first presenter in the phase-2 array, falls back to legacy field.
 */
function resolveSpeaker(sub: Submission): string {
  if (sub.presenters && sub.presenters.length > 0) return sub.presenters[0].name;
  if (sub.presenterName) return sub.presenterName;
  return '—';
}

function resolveSubmitterName(sub: EnrichedSubmission): string {
  return (sub._user.name && sub._user.name !== 'New Member')
    ? sub._user.name
    : (sub._user.email || '');
}

function resolveAudienceLabel(sub: Submission): string {
  if (Array.isArray(sub.audience)) return sub.audience.join(', ');
  return sub.audience ?? '';
}

/**
 * Extracts the YYYY-MM-DD string from the 1st choice date, used for filter matching.
 */
function resolveDateKey(sub: Submission): string {
  const date = sub.preferredDate;
  if (!date) return '';
  try {
    const d =
      typeof date === 'object' && 'toDate' in date && typeof (date as { toDate(): Date }).toDate === 'function'
        ? (date as { toDate(): Date }).toDate()
        : typeof date === 'string'
          ? new Date(date)
          : (date as Date);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function compareRows(
  a: EnrichedSubmission,
  b: EnrichedSubmission,
  key: ColumnId,
  dir: SortDir,
): number {
  const mul = dir === 'asc' ? 1 : -1;
  const str = (v: string) => v.toLowerCase();

  let cmp = 0;
  switch (key) {
    case 'submitter':
      cmp = str(resolveSubmitterName(a)).localeCompare(str(resolveSubmitterName(b)));
      break;
    case 'company':
      cmp = str(a.companyName ?? '').localeCompare(str(b.companyName ?? ''));
      break;
    case 'title':
      cmp = str(a.title ?? '').localeCompare(str(b.title ?? ''));
      break;
    case 'type':
      cmp = str(SESSION_TYPE_CONFIG[a.sessionType]?.label ?? a.sessionType)
        .localeCompare(str(SESSION_TYPE_CONFIG[b.sessionType]?.label ?? b.sessionType));
      break;
    case 'audience':
      cmp = str(resolveAudienceLabel(a)).localeCompare(str(resolveAudienceLabel(b)));
      break;
    case 'status':
      cmp = (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
      break;
    case 'room':
      cmp = str(a.roomAssignment ?? '').localeCompare(str(b.roomAssignment ?? ''));
      break;
    case 'speaker':
      cmp = str(resolveSpeaker(a)).localeCompare(str(resolveSpeaker(b)));
      break;
    case 'av':
      cmp = Number(a.avSelected === true) - Number(b.avSelected === true);
      break;
    case 'paid':
      cmp = Number(a.paymentStatus === 'complete') - Number(b.paymentStatus === 'complete');
      break;
    case 'pillar':
      cmp = str(a.pillar ?? '').localeCompare(str(b.pillar ?? ''));
      break;
    case 'format':
      cmp = str(a.format ?? '').localeCompare(str(b.format ?? ''));
      break;
    case 'cpe':
      cmp = Number(Boolean(a.cpe)) - Number(Boolean(b.cpe));
      break;
    default:
      cmp = 0;
  }
  return cmp * mul;
}

// ─── Combobox ─────────────────────────────────────────────────────────────────

function CompanyCombobox({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input in sync when external clear happens
  useEffect(() => { setInputVal(value); }, [value]);

  const filtered = useMemo(() => {
    if (!inputVal) return options;
    const lower = inputVal.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(lower));
  }, [inputVal, options]);

  const handleSelect = (opt: string) => {
    setInputVal(opt);
    onChange(opt);
    setOpen(false);
  };

  const handleClear = () => {
    setInputVal('');
    onChange('');
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={inputVal}
            onChange={e => {
              setInputVal(e.target.value);
              if (!open) setOpen(true);
              if (!e.target.value) onChange('');
            }}
            onFocus={() => setOpen(true)}
            placeholder="Company…"
            className="h-8 pl-8 pr-7 text-sm w-44"
          />
          {inputVal && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 text-muted-foreground hover:text-foreground"
              aria-label="Clear company filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </PopoverTrigger>
      {filtered.length > 0 && (
        <PopoverContent
          className="w-56 p-1 max-h-60 overflow-y-auto"
          align="start"
          onOpenAutoFocus={e => e.preventDefault()}
        >
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(opt)}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground',
                value === opt && 'bg-accent text-accent-foreground font-medium',
              )}
            >
              {opt}
            </button>
          ))}
        </PopoverContent>
      )}
    </Popover>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function ToggleGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {options.map(o => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThreeWay({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AVFilter | ProxyFilter;
  onChange: (v: AVFilter) => void;
}) {
  const opts: { value: AVFilter; label: string }[] = [
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

export default function SessionsTable({ role }: SessionsTableProps) {
  const isAdmin = role === 'admin';
  const { submissions } = useSubmissions();
  const { users } = useUserProfiles();
  const router = useRouter();
  const { toast } = useToast();

  // ── Proxy invoice state (admin only) ────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Column sort state (null = keep default proxy-float order) ───────────────
  const [sortKey, setSortKey] = useState<ColumnId | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ── Filter state ────────────────────────────────────────────────────────────
  const [companyFilter, setCompanyFilter]       = useState('');
  const [typeFilter, setTypeFilter]             = useState<string[]>([]);
  const [audienceFilter, setAudienceFilter]     = useState<string[]>([]);
  const [pillarFilter, setPillarFilter]         = useState<string[]>([]);
  const [statusFilter, setStatusFilter]         = useState<string[]>([]);
  const [dateFilter, setDateFilter]             = useState('');
  const [roomFilter, setRoomFilter]             = useState('');
  const [avOrderedFilter, setAvOrderedFilter]   = useState<AVFilter>('all');
  const [avPaidFilter, setAvPaidFilter]         = useState<AVFilter>('all');
  const [proxyFilter, setProxyFilter]           = useState<ProxyFilter>('all');
  const [cpeFilter, setCpeFilter]               = useState(false);

  const toggleSort = (id: ColumnId) => {
    if (sortKey === id) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(id);
      setSortDir('asc');
    }
  };

  const hasActiveFilters =
    companyFilter !== '' ||
    typeFilter.length > 0 ||
    audienceFilter.length > 0 ||
    pillarFilter.length > 0 ||
    statusFilter.length > 0 ||
    dateFilter !== '' ||
    roomFilter !== '' ||
    avOrderedFilter !== 'all' ||
    avPaidFilter !== 'all' ||
    proxyFilter !== 'all' ||
    cpeFilter;

  const clearAllFilters = () => {
    setCompanyFilter('');
    setTypeFilter([]);
    setAudienceFilter([]);
    setPillarFilter([]);
    setStatusFilter([]);
    setDateFilter('');
    setRoomFilter('');
    setAvOrderedFilter('all');
    setAvPaidFilter('all');
    setProxyFilter('all');
    setCpeFilter(false);
  };

  // ── Toggle helpers ──────────────────────────────────────────────────────────
  const toggleType     = (v: string) => setTypeFilter(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleAudience = (v: string) => setAudienceFilter(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const togglePillar   = (v: string) => setPillarFilter(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleStatus   = (v: string) => setStatusFilter(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  // ── Enrich submissions with user data ───────────────────────────────────────
  const enriched = useMemo((): EnrichedSubmission[] =>
    submissions.map(sub => {
      const user = users?.find(u => u.id === sub.userId);
      return {
        ...sub,
        _user: user
          ? { name: user.name, email: user.email, avatar: user.avatar }
          : { name: 'Unknown User', email: '', avatar: '' },
      };
    }),
  [submissions, users]);

  // ── Derive filter option lists from the full (unfiltered) dataset ───────────
  const companyOptions = useMemo(() =>
    [...new Set(enriched.map(s => s.companyName).filter((c): c is string => Boolean(c)))].sort(),
  [enriched]);

  const dateOptions = useMemo(() => {
    const keys = [...new Set(enriched.map(s => resolveDateKey(s)).filter(Boolean))].sort();
    return keys.map(k => {
      const d = new Date(`${k}T12:00:00Z`);
      return { value: k, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) };
    });
  }, [enriched]);

  const roomOptions = useMemo(() => {
    const rooms = [...new Set(enriched.map(s => s.roomAssignment?.trim() || ''))];
    const named = rooms.filter(Boolean).sort();
    const hasUnassigned = rooms.includes('');
    return [
      ...(hasUnassigned ? [{ value: '__unassigned__', label: 'Unassigned' }] : []),
      ...named.map(r => ({ value: r, label: r })),
    ];
  }, [enriched]);

  // ── Apply filters (order preserved from enriched) ───────────────────────────
  const filtered = useMemo(() => enriched.filter(sub => {
    if (companyFilter && sub.companyName?.toLowerCase() !== companyFilter.toLowerCase()) return false;
    if (typeFilter.length > 0 && !typeFilter.includes(sub.sessionType)) return false;
    if (audienceFilter.length > 0) {
      const aud = sub.audience;
      const matches = Array.isArray(aud)
        ? audienceFilter.some(f => aud.includes(f))
        : audienceFilter.includes(aud as string);
      if (!matches) return false;
    }
    if (pillarFilter.length > 0 && !pillarFilter.includes(sub.pillar ?? '')) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(sub.status)) return false;
    if (dateFilter) {
      if (resolveDateKey(sub) !== dateFilter) return false;
    }
    if (roomFilter) {
      const roomVal = sub.roomAssignment?.trim() || '';
      if (roomFilter === '__unassigned__') { if (roomVal !== '') return false; }
      else { if (roomVal !== roomFilter) return false; }
    }
    if (avOrderedFilter === 'yes' && !sub.avSelected) return false;
    if (avOrderedFilter === 'no' && sub.avSelected) return false;
    if (avPaidFilter === 'yes' && sub.paymentStatus !== 'complete') return false;
    if (avPaidFilter === 'no' && sub.paymentStatus === 'complete') return false;
    if (isAdmin) {
      if (proxyFilter === 'yes' && !sub.isProxy) return false;
      if (proxyFilter === 'no' && sub.isProxy) return false;
    }
    if (cpeFilter && !sub.cpe) return false;
    return true;
  }), [enriched, companyFilter, typeFilter, audienceFilter, pillarFilter, statusFilter, dateFilter, roomFilter, avOrderedFilter, avPaidFilter, proxyFilter, cpeFilter, isAdmin]);

  // ── Display order: default proxy-float, or active column sort ───────────────
  const displayRows = useMemo(() => {
    if (sortKey !== null) {
      return [...filtered].sort((a, b) => compareRows(a, b, sortKey, sortDir));
    }
    // Default (unchanged): proxy sessions float to top (admin), then by POC email
    if (!isAdmin) return filtered;
    return [...filtered].sort((a, b) => {
      if (a.isProxy && !b.isProxy) return -1;
      if (!a.isProxy && b.isProxy) return 1;
      if (a.isProxy && b.isProxy) {
        const ae = a.pocEmail ?? a.presenterPocEmail ?? '';
        const be = b.pocEmail ?? b.presenterPocEmail ?? '';
        return ae.localeCompare(be);
      }
      return 0;
    });
  }, [filtered, sortKey, sortDir, isAdmin]);

  // ── Proxy invoice generation ─────────────────────────────────────────────────
  const handleGenerateProxyInvoice = async () => {
    const selectedItems = filtered.filter(item => selectedIds.has(item.id));
    const rawEmails = selectedItems
      .map(item => item.pocEmail ?? item.presenterPocEmail ?? null)
      .filter((e): e is string => Boolean(e));
    const uniqueEmails = [...new Set(rawEmails)];
    if (uniqueEmails.length !== 1) {
      toast({ title: 'Mismatched partners', description: 'All selected sessions must belong to the same partner.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const partnerEmail = uniqueEmails[0];
      const partnerName = selectedItems[0].companyName ?? partnerEmail;
      const sessionIds = selectedItems.map(s => s.id);
      const result = await createXeroInvoice(selectedItems, partnerEmail, partnerName, `PROXY-${Date.now()}`, sessionIds, 'manual');
      if (result.success) {
        toast({ title: `Invoice generated — ${result.invoiceNumber ?? result.invoiceId}` });
        setSelectedIds(new Set());
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast({ title: 'Invoice generation failed', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedEmails = [...new Set(
    [...selectedIds]
      .map(id => { const item = filtered.find(d => d.id === id); return item?.pocEmail ?? item?.presenterPocEmail ?? null; })
      .filter((e): e is string => Boolean(e))
  )];
  const emailMismatch = selectedEmails.length > 1;
  const firstSelectedEmail = selectedEmails[0] ?? null;

  // ── Column definitions for header rendering ──────────────────────────────────
  const fromParam = isAdmin ? 'all-sessions' : 'review';

  const renderSortIcon = (id: ColumnId) => {
    if (sortKey === id) {
      return sortDir === 'asc'
        ? <ArrowUp className="h-3.5 w-3.5" />
        : <ArrowDown className="h-3.5 w-3.5" />;
    }
    return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  };

  const SortableHead = ({
    id,
    children,
    className,
  }: {
    id: ColumnId;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => toggleSort(id)}
      >
        {children}
        {renderSortIcon(id)}
      </button>
    </TableHead>
  );

  return (
    <>
      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/30 px-4 py-3">

        {/* Company combobox */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Company</span>
          <CompanyCombobox
            options={companyOptions}
            value={companyFilter}
            onChange={setCompanyFilter}
          />
        </div>

        {/* Session type */}
        <ToggleGroup
          label="Type"
          options={[
            { value: 'workshop',      label: 'Workshop' },
            { value: 'info-session',  label: 'Info Session' },
            { value: 'reception',     label: 'Reception' },
          ]}
          selected={typeFilter}
          onToggle={toggleType}
        />

        {/* Audience */}
        <ToggleGroup
          label="Audience"
          options={submissionFormConfig.audiences.map(a => ({ value: a.value, label: a.label }))}
          selected={audienceFilter}
          onToggle={toggleAudience}
        />

        {/* Pillar */}
        <ToggleGroup
          label="Pillar"
          options={submissionFormConfig.pillars.map(p => ({ value: p.value, label: p.label }))}
          selected={pillarFilter}
          onToggle={togglePillar}
        />

        {/* Status */}
        <ToggleGroup
          label="Status"
          options={[
            { value: 'phase_1', label: 'Awaiting Approval' },
            { value: 'phase_2', label: 'Needs Info' },
            { value: 'phase_3', label: 'Awaiting Room' },
            { value: 'phase_4', label: 'Confirmed' },
          ]}
          selected={statusFilter}
          onToggle={toggleStatus}
        />

        {/* Date */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Date</span>
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          >
            <option value="">All dates</option>
            {dateOptions.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* Room */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Room</span>
          <select
            value={roomFilter}
            onChange={e => setRoomFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          >
            <option value="">All rooms</option>
            {roomOptions.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* AV Ordered */}
        <ThreeWay label="AV Ordered" value={avOrderedFilter} onChange={setAvOrderedFilter} />

        {/* AV Paid */}
        <ThreeWay label="AV Paid" value={avPaidFilter} onChange={setAvPaidFilter} />

        {/* CPE */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">CPE</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setCpeFilter(p => !p)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
                cpeFilter
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground',
              )}
            >
              CPE
            </button>
          </div>
        </div>

        {/* Proxy — admin only */}
        {isAdmin && (
          <ThreeWay label="Proxy" value={proxyFilter} onChange={v => setProxyFilter(v)} />
        )}

        {/* Clear all */}
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

      {/* ── Result count ── */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of {submissions.length} sessions
        </p>
      )}

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Proxy select column — admin only (not sortable) */}
                  {isAdmin && <TableHead className="w-10" />}
                  <SortableHead id="submitter">Submitter</SortableHead>
                  <SortableHead id="company">Company</SortableHead>
                  <SortableHead id="title">Title</SortableHead>
                  <SortableHead id="type">Type</SortableHead>
                  <SortableHead id="audience">Audience</SortableHead>
                  <SortableHead id="status" className="text-center">Status</SortableHead>
                  <SortableHead id="room">Room</SortableHead>
                  <SortableHead id="speaker">Speaker</SortableHead>
                  <SortableHead id="av" className="text-center">AV</SortableHead>
                  <SortableHead id="paid" className="text-center">Paid</SortableHead>
                  <SortableHead id="pillar">Pillar</SortableHead>
                  <SortableHead id="format">Format</SortableHead>
                  <SortableHead id="cpe" className="text-center">CPE</SortableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 14 : 13}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      {hasActiveFilters
                        ? 'No sessions match the active filters.'
                        : 'No sessions found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayRows.map(item => {
                    const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.phase_1;
                    const TypeIcon  = SESSION_TYPE_CONFIG[item.sessionType]?.icon || Briefcase;
                    const typeLabel = SESSION_TYPE_CONFIG[item.sessionType]?.label || 'Workshop';
                    const userName  = (item._user.name && item._user.name !== 'New Member') ? item._user.name : item._user.email;
                    const fallback  = userName?.charAt(0) || '';
                    const speaker   = resolveSpeaker(item);
                    const partnerEmail = item.pocEmail ?? item.presenterPocEmail ?? null;
                    const avOrdered = item.avSelected === true;
                    const avPaid    = item.paymentStatus === 'complete';

                    return (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer"
                        style={isAdmin && item.isProxy && partnerEmail ? {
                          borderLeft: '2px solid rgba(150,150,150,0.3)',
                          backgroundColor: 'rgba(150,150,150,0.05)',
                        } : undefined}
                        onClick={() => router.push(`/submit/${item.sessionType}/${item.id}?from=${fromParam}`)}
                      >
                        {/* Proxy checkbox — admin only */}
                        {isAdmin && (
                          <TableCell onClick={e => e.stopPropagation()} className="w-10">
                            {item.isProxy && (
                              <Checkbox
                                checked={selectedIds.has(item.id)}
                                onCheckedChange={() => toggleSelect(item.id)}
                              />
                            )}
                          </TableCell>
                        )}

                        {/* Submitter */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarImage src={item._user.avatar || ''} alt={item._user.name || ''} />
                              <AvatarFallback>{fallback}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{userName}</div>
                              {/* Submitter email — admin only */}
                              {isAdmin && (
                                <div className="text-xs text-muted-foreground truncate">{item._user.email}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Company */}
                        <TableCell className="text-sm text-muted-foreground">
                          {item.companyName || '—'}
                        </TableCell>

                        {/* Title + badges */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.title}
                            {isAdmin && item.isProxy && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0 font-normal text-muted-foreground">
                                Proxy
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Session type + community badge */}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <TypeIcon className="h-4 w-4 text-muted-foreground" />
                              {typeLabel}
                            </div>
                            {item.community && (
                              <Badge variant="secondary" className="text-xs w-fit px-1.5 py-0 font-normal">
                                Community
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Audience */}
                        <TableCell className="text-sm text-muted-foreground">
                          {Array.isArray(item.audience)
                            ? item.audience.join(', ')
                            : (item.audience ?? '—')}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn('whitespace-nowrap font-medium gap-1.5', statusCfg.className)}
                          >
                            <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', statusCfg.dot)} />
                            {statusCfg.label}
                          </Badge>
                        </TableCell>

                        {/* Room */}
                        <TableCell className="text-sm">
                          {item.roomAssignment ? (
                            <span className="text-foreground">{item.roomAssignment}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Speaker */}
                        <TableCell className="text-sm">
                          {speaker}
                        </TableCell>

                        {/* AV Ordered */}
                        <TableCell className="text-center">
                          {avOrdered ? (
                            <CheckCheck className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>

                        {/* AV Paid */}
                        <TableCell className="text-center">
                          {avPaid ? (
                            <CheckCheck className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>

                        {/* Pillar */}
                        <TableCell className="text-sm">{item.pillar}</TableCell>

                        {/* Format */}
                        <TableCell className="text-sm">{item.format}</TableCell>

                        {/* CPE */}
                        <TableCell className="text-center">
                          {item.cpe && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0 font-normal">
                              CPE
                            </Badge>
                          )}
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

      {/* ── Proxy invoice bottom bar — admin only ── */}
      {isAdmin && selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'hsl(var(--background))',
          borderTop: '1px solid hsl(var(--border))',
          padding: '12px 24px',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        }}>
          <span className="text-sm font-medium">{selectedIds.size} session(s) selected</span>
          {firstSelectedEmail && (
            <span className="text-sm text-muted-foreground">{firstSelectedEmail}</span>
          )}
          {emailMismatch && (
            <span className="text-sm text-red-600 font-medium">⚠ Sessions must belong to the same partner</span>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleGenerateProxyInvoice}
              disabled={emailMismatch || isGenerating}
            >
              {isGenerating
                ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Generating…</>
                : 'Generate Invoice'
              }
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
