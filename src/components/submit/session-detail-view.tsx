'use client';

import type { Submission } from '@/lib/types';
import { useSubmissions } from '@/components/submissions-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Clock,
  AlertCircle,
  Info,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Circle,
  Users,
  Monitor,
  ArrowLeft,
  MapPin,
  ShieldCheck,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import AVPackageSelector from './av-package-selector';
import PresenterSection from './presenter-section';
import { AV_OPEN_DATE } from '@/lib/av-packages';
import { useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useUserProfiles } from '@/hooks/use-user-profiles';
import { sendStatusUpdateEmail, sendSessionApprovedEmail } from '@/lib/actions';

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

const phaseMenuItems: { phase: Submission['status']; label: string }[] = [
  { phase: 'phase_1', label: 'Move to Phase 1 — Awaiting Approval' },
  { phase: 'phase_2', label: 'Move to Phase 2 — Action Required' },
  { phase: 'phase_3', label: 'Move to Phase 3 — Submitted, Awaiting Room Assignment' },
  { phase: 'phase_4', label: 'Move to Phase 4 — Locked' },
];

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

// ─── Admin Panel ───────────────────────────────────────────────────────────────────────────────

function AdminPanel({ submission }: { submission: Submission }) {
  const { updateSubmission } = useSubmissions();
  const { toast } = useToast();

  // ─ Room Assignment ───────────────────────────────────────────────────────
  const [roomValue, setRoomValue] = useState(submission.roomAssignment ?? '');
  const [roomSaving, setRoomSaving] = useState(false);

  const saveRoom = async () => {
    setRoomSaving(true);
    try {
      await updateSubmission({ ...submission, roomAssignment: roomValue.trim() || undefined });
      toast({ title: 'Room assignment saved' });
    } catch {
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not save room assignment.' });
    } finally {
      setRoomSaving(false);
    }
  };

  // ─ Authorized Emails ─────────────────────────────────────────────────
  const [emailInput, setEmailInput] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const currentEmails = submission.authorizedEmails ?? [];

  const addEmail = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || currentEmails.includes(email)) {
      setEmailInput('');
      return;
    }
    setEmailSaving(true);
    try {
      await updateSubmission({ ...submission, authorizedEmails: [...currentEmails, email] });
      setEmailInput('');
      emailInputRef.current?.focus();
      toast({ title: 'Access granted', description: `${email} can now view and edit this session.` });
    } catch {
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not update authorized emails.' });
    } finally {
      setEmailSaving(false);
    }
  };

  const removeEmail = async (email: string) => {
    try {
      await updateSubmission({ ...submission, authorizedEmails: currentEmails.filter(e => e !== email) });
      toast({ title: 'Access removed', description: `${email} no longer has delegate access.` });
    } catch {
      toast({ variant: 'destructive', title: 'Remove failed' });
    }
  };

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-base font-semibold text-amber-700">Admin Only</CardTitle>
        </div>
        <CardDescription>These fields are only visible to internal team members.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Room Assignment */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            Room Assignment
          </label>
          <p className="text-xs text-muted-foreground">
            Free-text — e.g. "Workshop 2 (W206ABC) — Monday August 10, 3:00 PM"
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomValue}
              onChange={e => setRoomValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveRoom()}
              placeholder="Enter room and time..."
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" onClick={saveRoom} disabled={roomSaving}>
              {roomSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Authorized Emails */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            Delegate Access
          </label>
          <p className="text-xs text-muted-foreground">
            Additional emails that can view and edit this session. The original owner always retains full access.
          </p>
          <div className="flex gap-2">
            <input
              ref={emailInputRef}
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEmail()}
              placeholder="email@domain.com"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" onClick={addEmail} disabled={emailSaving || !emailInput.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          {currentEmails.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {currentEmails.map(email => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs"
                >
                  {email}
                  <button
                    onClick={() => removeEmail(email)}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${email}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

      </CardContent>
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


// ─── POC Resolution Helper ────────────────────────────────────────────────────

function resolvePoc(submission: Submission): { name: string; email: string } {
  const isReceptionOrInfo =
    submission.sessionType === 'reception' || submission.sessionType === 'info-session';
  const name = isReceptionOrInfo
    ? (submission.pocName ?? '')
    : (submission.presenterPocName ?? submission.presenterName ?? '');
  const email = isReceptionOrInfo
    ? (submission.pocEmail ?? '')
    : (submission.presenterPocEmail ?? submission.presenterEmail ?? '');
  return { name: name || 'Not provided', email: email || 'Not provided' };
}

// ─── Date Slot Formatting Helper ──────────────────────────────────────────────

function formatDateSlot(date?: Date | string | { toDate(): Date } | null, time?: string | null): string {
  if (!date && !time) return 'Not provided';
  const parts: string[] = [];
  if (date) {
    try {
      // Handle Firestore Timestamp (.toDate()), JS Date, or ISO string
      const d =
        typeof date === 'object' && 'toDate' in date && typeof (date as { toDate(): Date }).toDate === 'function'
          ? (date as { toDate(): Date }).toDate()
          : typeof date === 'string'
            ? new Date(date)
            : (date as Date);
      parts.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }));
    } catch { parts.push(String(date)); }
  }
  if (time) parts.push(time);
  return parts.join(' — ') || 'Not provided';
}

// ─── Submission Summary Card ──────────────────────────────────────────────────

function SubmissionSummaryCard({ submission }: { submission: Submission }) {
  const [expanded, setExpanded] = useState(false);
  const poc = resolvePoc(submission);
  const isWorkshop = submission.sessionType === 'workshop';
  const isInfoSession = submission.sessionType === 'info-session';
  const isReceptionOrInfo = submission.sessionType === 'reception' || isInfoSession;

  const preferredTimes = Array.isArray(submission.preferredTimes) ? submission.preferredTimes : [];
  const firstChoice = isInfoSession
    ? formatDateSlot(submission.preferredDate, preferredTimes[0] ?? null)
    : formatDateSlot(submission.preferredDate, submission.preferredTime);
  const secondChoice = isInfoSession
    ? (preferredTimes[1] ?? 'Not provided')
    : formatDateSlot(submission.preferredDate2, submission.preferredTime2);

  const secondaryAudience = Array.isArray(submission.secondaryAudience)
    ? submission.secondaryAudience.join(', ')
    : (submission.secondaryAudience ?? '');
  const objectives = Array.isArray(submission.objectives) ? submission.objectives.join(', ') : '';
  const audience = Array.isArray(submission.audience)
    ? submission.audience.join(', ')
    : (submission.audience ?? '');

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <CardTitle className="text-base font-semibold">Submission Summary</CardTitle>
          </div>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Session Title</p>
            <p className="text-sm font-medium">{submission.title}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Session Type · Pillar</p>
            <p className="text-sm capitalize">{submission.sessionType.replace('-', ' ')}{submission.pillar ? ` · ${submission.pillar}` : ''}</p>
          </div>
          {isReceptionOrInfo && submission.companyName && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Company Name</p>
              <p className="text-sm">{submission.companyName}</p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">1st Choice</p>
            <p className="text-sm">{firstChoice}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">2nd Choice</p>
            <p className="text-sm">{secondChoice}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Point of Contact</p>
            <p className="text-sm">{poc.name}</p>
          </div>
        </div>
        {expanded && (
          <div className="border-t pt-4 grid gap-3 sm:grid-cols-2">
            {submission.description && (
              <div className="sm:col-span-2 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
                <p className="text-sm whitespace-pre-wrap">{submission.description}</p>
              </div>
            )}
            {isWorkshop && objectives && (
              <div className="sm:col-span-2 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Objectives</p>
                <p className="text-sm">{objectives}</p>
              </div>
            )}
            {audience && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Primary Audience</p>
                <p className="text-sm">{audience}</p>
              </div>
            )}
            {secondaryAudience && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Secondary Audience</p>
                <p className="text-sm">{secondaryAudience}</p>
              </div>
            )}
            {submission.format && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Format</p>
                <p className="text-sm">{submission.format}</p>
              </div>
            )}
            {isWorkshop && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CPE Credit</p>
                <p className="text-sm">{submission.cpe ? 'Requested' : 'Not requested'}</p>
              </div>
            )}
            {isInfoSession && submission.specialSetup && (
              <div className="sm:col-span-2 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Special Setup Requests</p>
                <p className="text-sm">{submission.specialSetup}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">POC Name</p>
              <p className="text-sm">{poc.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">POC Email</p>
              <p className="text-sm">{poc.email}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Phase 1: Awaiting Approval ───────────────────────────────────────────────

function Phase1View({
  submission,
  showApproveButton = false,
  onApprove,
  isApproving = false,
  approved = false,
}: {
  submission: Submission;
  showApproveButton?: boolean;
  onApprove?: () => Promise<void>;
  isApproving?: boolean;
  approved?: boolean;
}) {
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

      <SubmissionSummaryCard submission={submission} />

      {showApproveButton && (
        <div className="flex justify-end">
          {approved ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 px-5 py-3 text-sm font-semibold text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Session Approved ✓
            </div>
          ) : (
            <Button
              onClick={onApprove}
              disabled={isApproving}
              className="gap-2 bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600 px-8 py-5 text-base"
              id={`approve-${submission.id}`}
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {isApproving ? 'Approving…' : 'Approve Session'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Phase 2: Needs Information ───────────────────────────────────────────────

function Phase2View({ submission }: { submission: Submission }) {
  const { updateSubmission } = useSubmissions();

  const presentersAdded = submission.presentersAdded ?? false;
  const avSelected = submission.avSelected ?? false;
  const isReception = submission.sessionType === 'reception';
  const avIsOpen = new Date() >= AV_OPEN_DATE;

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

      <SubmissionSummaryCard submission={submission} />

      <div className="flex flex-col gap-4">

        {/* Task 1 — Presenters (workshop & info-session only) */}
        {!isReception && (
          <TaskPill complete={presentersAdded} icon={Users} label="Presenters Added" alwaysShowChildren>
            <PresenterSection submission={submission} />
          </TaskPill>
        )}

        {/* Task 2 – AV Package & Payment */}
        <TaskPill complete={avSelected} icon={Monitor} label="AV Package &amp; Payment" alwaysShowChildren>
          {avIsOpen ? (
            <AVPackageSelector submission={submission} />
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                AV package selection opens April 29. You'll receive an email when this section is ready to complete.
              </p>
            </div>
          )}
        </TaskPill>
      </div>
    </div>
  );
}

// ─── Phase 3: Submitted – Awaiting Assignment ─────────────────────────────────

function Phase3View({ submission, isAdmin }: { submission: Submission; isAdmin: boolean }) {
  const cfg = phaseConfig.phase_3;
  const Icon = cfg.icon;
  const isReception = submission.sessionType === 'reception';
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

      {/* Submission Summary */}
      <SubmissionSummaryCard submission={submission} />

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

      {/* Room assignment — shown to partner only when filled in by admin */}
      {submission.roomAssignment && (
        <Card className="border-green-500/40 bg-green-500/5">
          <CardContent className="flex items-start gap-3 p-5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <div>
              <p className="text-sm font-semibold text-green-700">Room Assignment</p>
              <p className="text-sm mt-0.5">{submission.roomAssignment}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin panel — admin only */}
      {isAdmin && <AdminPanel submission={submission} />}

    </div>
  );
}

// ─── Phase 4: Confirmed ───────────────────────────────────────────────────────

function Phase4View({ submission, isAdmin }: { submission: Submission; isAdmin: boolean }) {
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

      <SubmissionSummaryCard submission={submission} />

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

      {/* Room & time assignment */}
      {submission.roomAssignment ? (
        <Card className="border-green-500/40 bg-green-500/5">
          <CardContent className="flex items-start gap-3 p-5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            <div>
              <p className="text-sm font-semibold text-green-700">Room Assignment</p>
              <p className="text-sm mt-0.5">{submission.roomAssignment}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-5">
            <CardDescription className="text-center text-sm text-muted-foreground">
              Your room and time assignment details will appear here once finalized by the ALPFA team.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Admin panel — admin only */}
      {isAdmin && <AdminPanel submission={submission} />}

    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function SessionDetailView({
  submission,
  from,
}: {
  submission: Submission;
  from?: string;
}) {
  const { user } = useUser();
  const { profile } = useUserProfile(user?.uid);
  const { users } = useUserProfiles();
  const { updateSubmission } = useSubmissions();
  const { toast } = useToast();
  const router = useRouter();
  const isAdmin = ['internal', 'admin'].includes(profile?.role ?? '');
  const isClient = profile?.role === 'client';

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  // Access check: original owner OR listed in authorizedEmails (OR logic, not replacement)
  const userEmail = user?.email?.toLowerCase();
  const isAuthorized =
    isAdmin ||
    isClient ||
    (user && submission.userId === user.uid) ||
    (userEmail && (submission.authorizedEmails ?? []).map(e => e.toLowerCase()).includes(userEmail));

  const cfg = phaseConfig[submission.status] ?? phaseConfig.phase_1;
  const StatusIcon = cfg.icon;

  const handleApprove = async () => {
    setApprovingId(submission.id);
    try {
      const updated = { ...submission, status: 'phase_2' as Submission['status'] };
      await updateSubmission(updated);
      const submitter = users?.find(u => u.id === submission.userId);
      if (submitter?.email) {
        await sendStatusUpdateEmail(updated, submitter.email);
        await sendSessionApprovedEmail(updated, submitter.email);
      }
      setApproved(true);
      toast({
        title: 'Session Approved',
        description: `"${submission.title}" has been moved to Phase 2.`,
      });
      setTimeout(() => router.push('/review'), 1500);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not approve the session. Please try again.' });
    } finally {
      setApprovingId(null);
    }
  };

  const handlePhaseChange = async (newPhase: Submission['status']) => {
    try {
      const updated = { ...submission, status: newPhase };
      await updateSubmission(updated);
      const submitter = users?.find(u => u.id === submission.userId);
      if (submitter?.email) {
        await sendStatusUpdateEmail(updated, submitter.email);
        if (newPhase === 'phase_2') {
          await sendSessionApprovedEmail(updated, submitter.email);
        }
      }
      toast({
        title: 'Phase Updated',
        description: `“${submission.title}” moved to ${phaseConfig[newPhase].label}.`,
      });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update the phase. Please try again.' });
    }
  };

  const isApproving = approvingId === submission.id;
  const showApproveButton = isClient && from === 'review' && submission.status === 'phase_1';

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">You don't have access to this session.</p>
        <Link href="/dashboard" className="text-sm underline text-muted-foreground hover:text-foreground">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link
            href={from === 'review' ? '/review' : from === 'all-sessions' ? '/all-sessions' : '/dashboard'}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {from === 'review' ? 'Back to Review Sessions' : from === 'all-sessions' ? 'Back to All Sessions' : 'Back to Dashboard'}
          </Link>
          <h1 className="font-headline text-3xl font-semibold">{submission.title}</h1>
          <p className="text-muted-foreground capitalize">{submission.sessionType.replace('-', ' ')} Submission</p>
        </div>
        <div className="flex items-center gap-2 self-start flex-wrap">
          <Badge variant="outline" className={cn('whitespace-nowrap px-3 py-1.5 text-sm', cfg.className)}>
            <StatusIcon className="mr-1.5 h-4 w-4" />
            {cfg.label}
          </Badge>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8">
                  Change Phase
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Move to Phase</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {phaseMenuItems.map(({ phase, label }) => (
                  <DropdownMenuItem
                    key={phase}
                    onSelect={() => handlePhaseChange(phase)}
                    disabled={submission.status === phase}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Phase content — partners see human-readable labels only, never phase keys */}
      {submission.status === 'phase_1' && (
        <Phase1View
          submission={submission}
          showApproveButton={showApproveButton}
          onApprove={handleApprove}
          isApproving={isApproving}
          approved={approved}
        />
      )}
      {submission.status === 'phase_2' && <Phase2View submission={submission} />}
      {submission.status === 'phase_3' && <Phase3View submission={submission} isAdmin={isAdmin} />}
      {submission.status === 'phase_4' && <Phase4View submission={submission} isAdmin={isAdmin} />}
    </div>
  );
}

