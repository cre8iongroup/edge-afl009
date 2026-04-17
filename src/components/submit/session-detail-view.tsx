'use client';

import type { Submission } from '@/lib/types';
import { useSubmissions } from '@/components/submissions-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Clock,
  AlertCircle,
  Info,
  CalendarCheck,
  CheckCircle2,
  Circle,
  Users,
  Monitor,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import AVPackageSelector from './av-package-selector';
import PresenterSection from './presenter-section';

// ─── Phase config — single source of truth for labels, icons, colours ────────

const phaseConfig: Record<
  Submission['status'],
  { icon: React.ElementType; label: string; className: string; bannerClassName: string }
> = {
  phase_1: {
    icon: Clock,
    label: 'Awaiting Approval',
    className: 'border-blue-500/50 text-blue-500 bg-blue-500/10',
    bannerClassName: 'border-blue-500/30 bg-blue-500/5',
  },
  phase_2: {
    icon: AlertCircle,
    label: 'Needs Information',
    className: 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10',
    bannerClassName: 'border-yellow-500/30 bg-yellow-500/5',
  },
  phase_3: {
    icon: Info,
    label: 'Submitted - Awaiting Room Assignment',
    className: 'border-indigo-500/50 text-indigo-500 bg-indigo-500/10',
    bannerClassName: 'border-indigo-500/30 bg-indigo-500/5',
  },
  phase_4: {
    icon: CalendarCheck,
    label: 'Session Confirmed',
    className: 'border-green-500/50 text-green-500 bg-green-500/10',
    bannerClassName: 'border-green-500/30 bg-green-500/5',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value?: string | string[] | boolean | null }) {
  if (value === undefined || value === null || value === '') return null;
  const display = Array.isArray(value) ? value.join(', ') : String(value);
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{display}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

// ─── Task Pill ────────────────────────────────────────────────────────────────

function TaskPill({
  complete,
  icon: Icon,
  label,
  children,
  alwaysShowChildren = false,
}: {
  complete: boolean;
  icon: React.ElementType;
  label: string;
  children?: React.ReactNode;
  alwaysShowChildren?: boolean;
}) {
  return (
    <Card className={cn('transition-colors', complete ? 'border-green-500/40 bg-green-500/5' : '')}>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          {complete ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={cn('font-medium', complete && !alwaysShowChildren ? 'text-green-600 line-through' : complete ? 'text-green-600' : '')}>{label}</span>
        </div>
        {(alwaysShowChildren || !complete) && children && <div>{children}</div>}
      </CardContent>
    </Card>
  );
}

// ─── Phase 1: Awaiting Approval ───────────────────────────────────────────────

function Phase1View({ submission }: { submission: Submission }) {
  const cfg = phaseConfig.phase_1;
  const Icon = cfg.icon;
  return (
    <div className="space-y-6">
      <Card className={cfg.bannerClassName}>
        <CardContent className="flex items-start gap-4 p-5">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
          <div>
            <p className="font-semibold text-blue-600">Under Review</p>
            <p className="text-sm text-muted-foreground">
              Your submission is being reviewed by the ALPFA programs team. You'll be notified once a decision is made —
              typically within 72 hours.
            </p>
          </div>
        </CardContent>
      </Card>

      <SectionCard title="Session Overview">
        <ReadOnlyField label="Title" value={submission.title} />
        <ReadOnlyField label="Session Type" value={submission.sessionType} />
        <ReadOnlyField label="Pillar" value={submission.pillar} />
        <ReadOnlyField label="Format" value={submission.format} />
      </SectionCard>

      <SectionCard title="Session Details">
        <div className="sm:col-span-2">
          <ReadOnlyField label="Description" value={submission.description} />
        </div>
        <ReadOnlyField label="Audience" value={submission.audience} />
        <ReadOnlyField label="CPE Credit" value={submission.cpe ? 'Yes' : 'No'} />
      </SectionCard>
    </div>
  );
}

// ─── Phase 2: Needs Information ───────────────────────────────────────────────

function Phase2View({ submission }: { submission: Submission }) {
  const { updateSubmission } = useSubmissions();

  const presentersAdded = submission.presentersAdded ?? false;
  const avSelected = submission.avSelected ?? false;
  const isReception = submission.sessionType === 'reception';

  // Reception: advance on AV only. Workshop/info-session: need both presenters + AV.
  const allDone = isReception ? avSelected : (presentersAdded && avSelected);

  useEffect(() => {
    if (allDone && submission.status === 'phase_2') {
      updateSubmission({ ...submission, status: 'phase_3' });
    }
  }, [allDone, submission, updateSubmission]);

  const cfg = phaseConfig.phase_2;
  const Icon = cfg.icon;

  const taskCount = isReception ? 'one task' : 'two tasks';
  const taskAgreement = isReception ? 'it is' : 'both are';

  return (
    <div className="space-y-6">
      <Card className={cfg.bannerClassName}>
        <CardContent className="flex items-start gap-4 p-5">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
          <div>
            <p className="font-semibold text-yellow-600">Action Required</p>
            <p className="text-sm text-muted-foreground">
              Your session has been approved! Complete the {taskCount} below to confirm your session. Once {taskAgreement} done,
              your submission will automatically advance.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">

        {/* Task 1 — Presenters (workshop & info-session only) */}
        {!isReception && (
          <TaskPill complete={presentersAdded} icon={Users} label="Presenters Added" alwaysShowChildren>
            <PresenterSection submission={submission} />
          </TaskPill>
        )}

        {/* Task 2 – AV Package & Payment — handled entirely by AVPackageSelector */}
        <TaskPill complete={avSelected} icon={Monitor} label="AV Package & Payment" alwaysShowChildren>
          <AVPackageSelector submission={submission} />
        </TaskPill>
      </div>
    </div>
  );
}

// ─── Phase 3: Submitted – Awaiting Assignment ─────────────────────────────────

function Phase3View({ submission }: { submission: Submission }) {
  const cfg = phaseConfig.phase_3;
  const Icon = cfg.icon;
  const isReception = submission.sessionType === 'reception';

  // Point of Contact: prefer PoC-specific fields, fall back to generic presenter fields.
  // Show "Not provided" rather than blank if all are empty.
  const pocName = submission.presenterPocName || submission.presenterName || 'Not provided';
  const pocEmail = submission.presenterPocEmail || submission.presenterEmail || 'Not provided';

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <Card className={cfg.bannerClassName}>
        <CardContent className="flex items-start gap-4 p-5">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
          <div>
            <p className="font-semibold text-indigo-600">Submitted — Awaiting Room Assignment</p>
            <p className="text-sm text-muted-foreground">
              All required information has been submitted. The ALPFA team is finalizing room and time
              assignments. You'll receive confirmation by July 1.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Session Overview */}
      <SectionCard title="Session Overview">
        <ReadOnlyField label="Title" value={submission.title} />
        <ReadOnlyField label="Session Type" value={submission.sessionType} />
        <ReadOnlyField label="Pillar" value={submission.pillar} />
        <ReadOnlyField label="Format" value={submission.format} />
      </SectionCard>

      {/* Point of Contact — always shown, never collapses to blank */}
      <SectionCard title="Point of Contact">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</p>
          <p className="text-sm">{pocName}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p>
          <p className="text-sm">{pocEmail}</p>
        </div>
      </SectionCard>

      {/* Presenters — editable until July 1 (hidden for receptions) */}
      {!isReception && (
        <Card className="border-green-500/40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              <CardTitle className="text-base font-semibold text-green-700">Presenters Added</CardTitle>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              You can update presenter details and headshots until July 1.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PresenterSection submission={submission} />
          </CardContent>
        </Card>
      )}

      {/* AV Package — locked read-only view (avSelected is true so AVLockedView renders) */}
      <Card className="border-green-500/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <CardTitle className="text-base font-semibold text-green-700">AV Package &amp; Payment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <AVPackageSelector submission={submission} />
        </CardContent>
      </Card>

    </div>
  );
}

// ─── Phase 4: Confirmed ───────────────────────────────────────────────────────

function Phase4View({ submission }: { submission: Submission }) {
  const cfg = phaseConfig.phase_4;
  const Icon = cfg.icon;
  return (
    <div className="space-y-6">
      <Card className={cfg.bannerClassName}>
        <CardContent className="flex items-start gap-4 p-5">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
          <div>
            <p className="font-semibold text-green-600">Session Confirmed!</p>
            <p className="text-sm text-muted-foreground">
              Your session is officially on the ALPFA convention schedule. See your assignment details below.
            </p>
          </div>
        </CardContent>
      </Card>

      <SectionCard title="Session Overview">
        <ReadOnlyField label="Title" value={submission.title} />
        <ReadOnlyField label="Session Type" value={submission.sessionType} />
        <ReadOnlyField label="Pillar" value={submission.pillar} />
        <ReadOnlyField label="Format" value={submission.format} />
      </SectionCard>

      {/* Point of Contact (from initial submission) + Presenters array */}
      {(submission.presenterName || submission.presenterPocName || (submission.presenters && submission.presenters.length > 0)) && (
        <SectionCard title="Point of Contact">
          <ReadOnlyField label="Name" value={submission.presenterPocName ?? submission.presenterName} />
          <ReadOnlyField label="Email" value={submission.presenterPocEmail ?? submission.presenterEmail} />
        </SectionCard>
      )}

      {submission.presenters && submission.presenters.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Presenters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {submission.presenters.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-md border p-3">
                {p.headshotUrl && (
                  <img src={p.headshotUrl} alt={p.name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.title} · {p.company}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Room & time assignment — fields populated by admin */}
      <Card className="border-dashed">
        <CardContent className="p-5">
          <CardDescription className="text-center text-sm text-muted-foreground">
            Your room and time assignment details will appear here once finalized by the ALPFA team.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function SessionDetailView({ submission }: { submission: Submission }) {
  const cfg = phaseConfig[submission.status] ?? phaseConfig.phase_1;
  const StatusIcon = cfg.icon;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="font-headline text-3xl font-semibold">{submission.title}</h1>
          <p className="text-muted-foreground capitalize">{submission.sessionType.replace('-', ' ')} Submission</p>
        </div>
        <Badge variant="outline" className={cn('self-start whitespace-nowrap px-3 py-1.5 text-sm', cfg.className)}>
          <StatusIcon className="mr-1.5 h-4 w-4" />
          {cfg.label}
        </Badge>
      </div>

      {/* Phase content — partners see human-readable labels only, never phase keys */}
      {submission.status === 'phase_1' && <Phase1View submission={submission} />}
      {submission.status === 'phase_2' && <Phase2View submission={submission} />}
      {submission.status === 'phase_3' && <Phase3View submission={submission} />}
      {submission.status === 'phase_4' && <Phase4View submission={submission} />}
    </div>
  );
}
