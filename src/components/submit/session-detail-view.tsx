'use client';

import type { Submission } from '@/lib/types';
import { useSubmissions } from '@/components/submissions-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { submissionFormConfig } from '@/lib/data';
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
  CreditCard,
  Pencil,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import AVPackageSelector from './av-package-selector';
import PresenterSection from './presenter-section';
import AiNotesSection from './ai-notes-section';
import { AV_OPEN_DATE } from '@/lib/av-packages';
import { useUser, useFirestore } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { AV_STATUS_LABELS } from '@/lib/av-status';
import { getDoc, doc, collection, getDocs, query, where, updateDoc, deleteField } from 'firebase/firestore';
import { sendStatusUpdateEmail, sendSessionApprovedEmail, sendPaymentConfirmedEmail, sendRoomAssignedEmail, sendPresenterUpdateEmail } from '@/lib/actions';
import { availableSlots } from '@/lib/schedule';

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
  const { user } = useUser();
  const firestore = useFirestore();

  // ─ AV Status Override ───────────────────────────────────────────────
  const [avStatusValue, setAvStatusValue] = useState(submission.avStatus ?? '');
  const [avStatusSaving, setAvStatusSaving] = useState(false);

  const handleAvStatusChange = async (value: string) => {
    const isAuto = value === '__auto__';
    setAvStatusValue(isAuto ? '' : value);
    setAvStatusSaving(true);
    try {
      if (isAuto) {
        // Delete the field from Firestore so getAVStatus() computes it
        if (firestore) {
          const docRef = doc(firestore, 'submissions', submission.id);
          await updateDoc(docRef, { avStatus: deleteField() });
        }
      } else {
        await updateSubmission({ ...submission, avStatus: value });
      }
      toast({ title: isAuto ? 'AV status reset to auto-computed' : `AV status set to ${value}` });
    } catch {
      setAvStatusValue(submission.avStatus ?? '');
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not update AV status.' });
    } finally {
      setAvStatusSaving(false);
    }
  };

  // ─ Community tag ───────────────────────────────────────────────────────
  const [communityValue, setCommunityValue] = useState(submission.community ?? false);
  const [communitySaving, setCommunitySaving] = useState(false);

  const handleCommunityToggle = async (checked: boolean | string) => {
    const bool = checked === true;
    setCommunityValue(bool);
    setCommunitySaving(true);
    try {
      await updateSubmission({ ...submission, community: bool });
      toast({ title: bool ? 'Tagged as Community Workshop' : 'Community tag removed' });
    } catch {
      setCommunityValue(!bool);
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not update community tag.' });
    } finally {
      setCommunitySaving(false);
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

  // ─ Proxy Submission ──────────────────────────────────────────────────────
  const [proxyValue, setProxyValue] = useState(submission.isProxy ?? false);
  const [proxySaving, setProxySaving] = useState(false);

  const handleProxyToggle = async (checked: boolean | string) => {
    const bool = checked === true;
    setProxyValue(bool);
    setProxySaving(true);
    try {
      await updateSubmission({ ...submission, isProxy: bool });
      toast({ title: bool ? 'Marked as proxy submission' : 'Proxy flag removed' });
    } catch {
      setProxyValue(!bool);
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not update proxy status.' });
    } finally {
      setProxySaving(false);
    }
  };

  // ─ Payment ────────────────────────────────────────────────────────────
  const [paymentRef, setPaymentRef] = useState(submission.paymentReference ?? '');
  const [paymentSaving, setPaymentSaving] = useState(false);

  const handleMarkPaid = async () => {
    setPaymentSaving(true);
    try {
      await updateSubmission({
        ...submission,
        paymentComplete: true,
        paymentStatus: 'complete',
        paymentReference: paymentRef.trim(),
        paymentMarkedBy: user?.email ?? 'admin',
        paymentMarkedAt: new Date().toISOString(),
      });
      toast({ title: 'Payment marked as received' });
      await sendPaymentConfirmedEmail({ ...submission, paymentReference: paymentRef.trim() });
    } catch {
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not update payment status.' });
    } finally {
      setPaymentSaving(false);
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

        {/* AV Status Override */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
            AV Status
          </label>
          <p className="text-xs text-muted-foreground">
            Manually set the AV status for this session. Use this to verify and categorize sessions during admin review.
          </p>
          <Select
            value={avStatusValue || '__auto__'}
            onValueChange={handleAvStatusChange}
            disabled={avStatusSaving}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Auto (computed)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__auto__">
                <span className="text-muted-foreground">Auto (computed)</span>
              </SelectItem>
              {AV_STATUS_LABELS.map(label => (
                <SelectItem key={label} value={label}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        {/* Community Workshop — workshop submissions only */}
        {submission.sessionType === 'workshop' && (
          <div className="space-y-2 pt-4 border-t">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Community Workshop
            </label>
            <div className="flex items-center gap-3">
              <Checkbox
                id="community-tag"
                checked={communityValue}
                onCheckedChange={handleCommunityToggle}
                disabled={communitySaving}
              />
              <label htmlFor="community-tag" className="text-sm text-muted-foreground cursor-pointer">
                Tag this session as a Community Workshop
              </label>
            </div>
          </div>
        )}

        {/* Proxy Submission */}
        <div className="space-y-2 pt-4 border-t">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            Proxy Submission
          </label>
          <div className="flex items-center gap-3">
            <Checkbox
              id="proxy-tag"
              checked={proxyValue}
              onCheckedChange={handleProxyToggle}
              disabled={proxySaving}
            />
            <label htmlFor="proxy-tag" className="text-sm text-muted-foreground cursor-pointer">
              This session was submitted by an admin on behalf of a partner who cannot access the portal.
            </label>
          </div>
        </div>

        {/* Payment Management — only when an order has been finalized */}
        {submission.paymentMethod && (() => {
          const formatTs = (iso?: string) =>
            iso
              ? new Date(iso).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                } as Intl.DateTimeFormatOptions) +
                ' ' +
                new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              : '—';

          const methodLabel =
            submission.paymentMethod === 'manual' ? 'Invoice / Manual' :
            submission.paymentMethod === 'free'   ? 'Free Order' :
            submission.paymentMethod === 'stripe' ? 'Online (Stripe)' :
                                                    submission.paymentMethod;

          return (
            <div className="space-y-2 pt-4 border-t">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                Payment
              </label>

              {/* ── awaiting_manual ── */}
              {submission.paymentStatus === 'awaiting_manual' && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/8 p-4 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment Status</p>
                      <p className="text-amber-700 font-medium">Awaiting Manual Payment</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment Method</p>
                      <p>{methodLabel}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invoice Number</p>
                      <p className="font-mono">{submission.invoiceNumber ?? '—'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Order Finalized</p>
                      <p>{formatTs(submission.orderFinalizedAt)}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment Reference</p>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={e => setPaymentRef(e.target.value)}
                      placeholder="Check number, wire confirmation ID, etc."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleMarkPaid}
                    disabled={paymentSaving || !paymentRef.trim()}
                  >
                    {paymentSaving ? (
                      <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Saving…</>
                    ) : (
                      <><CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Mark Payment Received</>
                    )}
                  </Button>
                </div>
              )}

              {/* ── complete (manual or any) ── */}
              {submission.paymentStatus === 'complete' && submission.paymentMethod !== 'free' && (
                <div className="rounded-lg border border-green-500/40 bg-green-500/8 p-4 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment Status</p>
                      <p className="text-green-700 font-medium">Payment Received ✓</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment Method</p>
                      <p>{methodLabel}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invoice Number</p>
                      <p className="font-mono">{submission.invoiceNumber ?? '—'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference</p>
                      <p>{submission.paymentReference ?? '—'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Marked by</p>
                      <p>{submission.paymentMarkedBy ?? '—'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Marked at</p>
                      <p>{formatTs(submission.paymentMarkedAt)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── free ── */}
              {submission.paymentMethod === 'free' && (
                <div className="rounded-lg border border-green-500/40 bg-green-500/8 p-4 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div className="space-y-0.5 sm:col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment Status</p>
                      <p className="text-green-700 font-medium">Free Order — No Payment Required</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Order Finalized</p>
                      <p>{formatTs(submission.orderFinalizedAt)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── stripe (read-only) ── */}
              {submission.paymentMethod === 'stripe' && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment Status</p>
                      <p>Online Payment</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
                      <p>{submission.paymentStatus ?? '—'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invoice Number</p>
                      <p className="font-mono">{submission.invoiceNumber ?? '—'}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          );
        })()}

      </CardContent>
    </Card>
  );
}

// ─── Admin Correction Panel ───────────────────────────────────────────────────

/** Converts a Firestore Timestamp, JS Date, or ISO string to YYYY-MM-DD for <input type="date">. */
function formatDateForInput(date?: Date | string | { toDate(): Date } | null): string {
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

function AdminCorrectionPanel({ submission }: { submission: Submission }) {
  const { updateSubmission } = useSubmissions();

  const isWorkshop    = submission.sessionType === 'workshop';
  const isInfoSession = submission.sessionType === 'info-session';

  // ─ Field state — initialised from submission prop ─────────────────────────
  const [title,         setTitle]         = useState(submission.title ?? '');
  const [description,   setDescription]   = useState(submission.description ?? '');
  const [companyName,   setCompanyName]   = useState(submission.companyName ?? '');
  const [pillar,        setPillar]        = useState(submission.pillar ?? '');

  // Date/time fields (workshop & reception)
  const [preferredDate,  setPreferredDate]  = useState(formatDateForInput(submission.preferredDate));
  const [preferredTime,  setPreferredTime]  = useState(submission.preferredTime ?? '');
  const [preferredDate2, setPreferredDate2] = useState(formatDateForInput(submission.preferredDate2));
  const [preferredTime2, setPreferredTime2] = useState(submission.preferredTime2 ?? '');

  // Time slots for info sessions (stored in preferredTimes[])
  const [preferredTimes, setPreferredTimes] = useState<[string, string]>([
    submission.preferredTimes?.[0] ?? '',
    submission.preferredTimes?.[1] ?? '',
  ]);

  // Audience — string for workshop (radio), string[] for info/reception (checkboxes)
  const [audience, setAudience] = useState<string | string[]>(
    submission.audience ?? (isWorkshop ? '' : [])
  );

  // Save state
  const [saving,    setSaving]    = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'success' | 'error'>('idle');

  // ─ Audience toggle helper (multi-select) ─────────────────────────────────
  const toggleAudience = (value: string) => {
    setAudience(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
    });
  };

  // ─ Save handler ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaveState('idle');
    try {
      const patch: Partial<Submission> = {
        title:       title.trim(),
        description: description.trim(),
        companyName: companyName.trim() || undefined,
        pillar,
        audience,
      };

      if (isInfoSession) {
        patch.preferredDate  = preferredDate ? new Date(preferredDate) : undefined;
        patch.preferredTimes = preferredTimes.filter(Boolean);
        // preferredDate2 / preferredTime2 not applicable for info sessions
      } else {
        patch.preferredDate  = preferredDate  ? new Date(preferredDate)  : undefined;
        patch.preferredTime  = preferredTime.trim()  || undefined;
        patch.preferredDate2 = preferredDate2 ? new Date(preferredDate2) : undefined;
        patch.preferredTime2 = preferredTime2.trim() || undefined;
      }

      await updateSubmission({ ...submission, ...patch });
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch {
      setSaveState('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-base font-semibold text-amber-700">Content Corrections</CardTitle>
        </div>
        <CardDescription>
          Correct partner-submitted fields. Changes are written to Firestore immediately on save.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── Session Details ── */}
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Session Details</p>

          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Company Name <span className="text-muted-foreground font-normal">(Optional)</span></label>
            <Input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Session Title</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Session title"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Session description"
              className="min-h-[120px] resize-y"
            />
          </div>

          {/* Pillar */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Pillar</label>
            <select
              value={pillar}
              onChange={e => setPillar(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a pillar…</option>
              {submissionFormConfig.pillars.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t" />

        {/* ── Schedule Preferences ── */}
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Schedule Preferences</p>

          {isInfoSession ? (
            // Info sessions: one date, two time slots from preferredTimes[]
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date</label>
                <input
                  type="date"
                  value={formatDateForInput(preferredDate ? new Date(preferredDate) : undefined) || preferredDate}
                  onChange={e => setPreferredDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">1st Choice Time</label>
                <Input
                  value={preferredTimes[0]}
                  onChange={e => setPreferredTimes([e.target.value, preferredTimes[1]])}
                  placeholder="e.g. 9:00 AM"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">2nd Choice Time</label>
                <Input
                  value={preferredTimes[1]}
                  onChange={e => setPreferredTimes([preferredTimes[0], e.target.value])}
                  placeholder="e.g. 11:00 AM"
                />
              </div>
            </div>
          ) : (
            // Workshop & Reception: two date+time pairs
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">1st Choice Date</label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={e => setPreferredDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">1st Choice Time</label>
                <Input
                  value={preferredTime}
                  onChange={e => setPreferredTime(e.target.value)}
                  placeholder="e.g. 9:00 AM"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">2nd Choice Date</label>
                <input
                  type="date"
                  value={preferredDate2}
                  onChange={e => setPreferredDate2(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">2nd Choice Time</label>
                <Input
                  value={preferredTime2}
                  onChange={e => setPreferredTime2(e.target.value)}
                  placeholder="e.g. 11:00 AM"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t" />

        {/* ── Primary Audience ── */}
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Primary Audience</p>

          {isWorkshop ? (
            // Workshop — single select radio
            <RadioGroup
              value={typeof audience === 'string' ? audience : ''}
              onValueChange={val => setAudience(val)}
              className="grid gap-2 sm:grid-cols-2"
            >
              {submissionFormConfig.audiences.map(a => (
                <div key={a.value} className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value={a.value} id={`correction-aud-${a.value}`} />
                  <Label htmlFor={`correction-aud-${a.value}`} className="cursor-pointer font-normal">
                    {a.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            // Info session / Reception — multi-select checkboxes
            <div className="grid gap-2 sm:grid-cols-2">
              {submissionFormConfig.audiences.map(a => {
                const checked = Array.isArray(audience) && audience.includes(a.value);
                return (
                  <label
                    key={a.value}
                    className={cn(
                      'flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent transition-colors',
                      checked && 'border-primary bg-primary/5',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleAudience(a.value)}
                    />
                    <span className="text-sm font-normal">{a.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t" />

        {/* ── Save row ── */}
        <div className="flex items-center justify-end gap-3">
          {saveState === 'success' && (
            <span className="text-sm text-green-600 font-medium">Changes saved ✓</span>
          )}
          {saveState === 'error' && (
            <span className="text-sm text-red-600 font-medium">Save failed — please try again</span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}

type RoomDoc = {
  roomId: string;
  label: string;
  wing: string;
  sessionTypes: string[];
  capacity: { theater: number; banquet: number; classroom: number };
};

// Tombstoned slots — removed from availableSlots but kept here so Tim can
// place sessions that were already confirmed into these closed time blocks.
const TOMBSTONED_SLOTS: { date: string; sessionType: Submission['sessionType']; time: string }[] = [
  { date: '2026-08-10T12:00:00.000Z', sessionType: 'workshop', time: '11:30 AM - 12:30 PM' },
  { date: '2026-08-11T12:00:00.000Z', sessionType: 'workshop', time: '11:00 AM - 12:00 PM' },
];

/** Formats an ISO date string to a consistent human-readable label, e.g. "Monday, Aug 10". */
function formatDayLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

/** Converts a time string like "11:30 AM - 12:30 PM" to minutes since midnight for sorting. */
function timeToMinutes(timeStr: string): number {
  const start = timeStr.split(' - ')[0].trim();
  const [clock, period] = start.split(' ');
  const [h, m] = clock.split(':').map(Number);
  const h24 = period === 'PM' && h !== 12 ? h + 12 : period === 'AM' && h === 12 ? 0 : h;
  return h24 * 60 + m;
}

/**
 * Parses a previously-saved roomAssignment string back into its components.
 * Format: "{roomId} — {dayLabel} @ {time}"
 * Returns empty strings for any field that cannot be parsed (e.g. old-format strings).
 */
function parseRoomAssignment(str: string | undefined): { roomId: string; dayLabel: string; time: string } {
  if (!str) return { roomId: '', dayLabel: '', time: '' };
  const parts = str.split(' — ');
  const roomId = parts[0]?.trim() ?? '';
  // parts[1] onward contains: "dayLabel @ time"
  const remainder = parts.slice(1).join(' — ').trim();
  const atIdx = remainder.indexOf(' @ ');
  if (atIdx < 0) return { roomId, dayLabel: '', time: '' };
  const dayLabel = remainder.slice(0, atIdx).trim();
  const time     = remainder.slice(atIdx + 3).trim();
  return { roomId, dayLabel, time };
}

function RoomAssignmentPanel({ submission }: { submission: Submission }) {
  const firestore = useFirestore();
  const { updateSubmission } = useSubmissions();
  const { toast } = useToast();

  const isReception   = submission.sessionType === 'reception';
  const isInfoSession = submission.sessionType === 'info-session';

  // ─ Parse existing roomAssignment for pre-population ────────────────────
  const parsed = parseRoomAssignment(submission.roomAssignment);

  // ─ Room list (fetched from Firestore) ──────────────────────────────
  const [rooms,        setRooms]        = useState<RoomDoc[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    if (!firestore) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(firestore, 'rooms'));
        const all  = snap.docs.map(d => d.data() as RoomDoc);
        all.sort((a, b) => a.roomId.localeCompare(b.roomId));
        if (!cancelled) setRooms(all);
      } catch (err) {
        console.error('[RoomAssignmentPanel] Failed to load rooms:', err);
      } finally {
        if (!cancelled) setLoadingRooms(false);
      }
    })();
    return () => { cancelled = true; };
  }, [firestore]);

  // ─ Available days (derived from schedule.ts + tombstoned) ───────────────
  const availableDays = useMemo(() => {
    const st = submission.sessionType;
    const fromActive     = availableSlots.filter(s => s.sessionTypes.includes(st)).map(s => s.date);
    const fromTombstoned = TOMBSTONED_SLOTS.filter(t => t.sessionType === st).map(t => t.date);
    return [...new Set([...fromActive, ...fromTombstoned])].sort();
  }, [submission.sessionType]);

  // ─ Selections (pre-populated from existing roomAssignment) ─────────────
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (!parsed.dayLabel) return '';
    const allIsoDates = [
      ...availableSlots.map(s => s.date),
      ...TOMBSTONED_SLOTS.map(t => t.date),
    ];
    return [...new Set(allIsoDates)].find(iso => formatDayLabel(iso) === parsed.dayLabel) ?? '';
  });

  const [selectedTime,   setSelectedTime]   = useState<string>(parsed.time);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(parsed.roomId);

  const selectedRoom = rooms.find(r => r.roomId === selectedRoomId) ?? null;

  // ─ Time options for the selected day ───────────────────────────────
  const timeOptions = useMemo(() => {
    if (!selectedDate) return [];
    const st = submission.sessionType;
    const active = availableSlots
      .filter(s => s.date === selectedDate && s.sessionTypes.includes(st))
      .flatMap(s => s.times.map(t => ({ time: t.time, closed: false })));
    const closed = TOMBSTONED_SLOTS
      .filter(t => t.date === selectedDate && t.sessionType === st)
      .map(t => ({ time: t.time, closed: true }));
    return [...active, ...closed].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [selectedDate, submission.sessionType]);


  // ─ Partner preferences (read-only reference) ────────────────────────
  const partnerFirst = formatDateSlot(
    submission.preferredDate,
    isInfoSession
      ? (Array.isArray(submission.preferredTimes) ? submission.preferredTimes[0] : undefined)
      : submission.preferredTime
  );
  const partnerSecond = isInfoSession
    ? (Array.isArray(submission.preferredTimes) ? (submission.preferredTimes[1] ?? 'Not provided') : 'Not provided')
    : formatDateSlot(submission.preferredDate2, submission.preferredTime2);

  // ─ Cascade resets when upstream selections change ─────────────────────
  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDate(e.target.value);
    setSelectedTime('');
    setSelectedRoomId('');
    setConflict(null);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTime(e.target.value);
    setSelectedRoomId('');
    setConflict(null);
  };

  // ─ Conflict detection ──────────────────────────────────────────────────
  const [conflict,         setConflict]         = useState<string | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);

  const checkConflict = useCallback(async (roomId: string) => {
    if (!firestore || !roomId || !selectedDate || !selectedTime) { setConflict(null); return; }
    setCheckingConflict(true);
    try {
      const dayLabel  = formatDayLabel(selectedDate);
      const exactSlot = `${roomId} — ${dayLabel} @ ${selectedTime}`;
      const q = query(
        collection(firestore, 'submissions'),
        where('roomAssignment', '>=', exactSlot),
        where('roomAssignment', '<',  exactSlot + '\uf8ff')
      );
      const snap   = await getDocs(q);
      const others = snap.docs.filter(d => d.id !== submission.id);
      if (others.length > 0) {
        const other = others[0].data() as Submission;
        setConflict(`"${other.title ?? others[0].id}" is already assigned to this room at this time.`);
      } else {
        setConflict(null);
      }
    } catch (err) {
      // Composite index may not exist yet — fail silently (non-blocking)
      console.warn('[RoomAssignmentPanel] Conflict check skipped (index may be missing):', err);
      setConflict(null);
    } finally {
      setCheckingConflict(false);
    }
  }, [firestore, submission.id, selectedDate, selectedTime]);

  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedRoomId(id);
    checkConflict(id);
  };

  // ─ Save ────────────────────────────────────────────────────────────────
  const [saving,    setSaving]    = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    if (!selectedRoom || !selectedDate || !selectedTime) return;
    setSaving(true);
    setSaveState('idle');
    try {
      const dayLabel       = formatDayLabel(selectedDate);
      // Format: "W208 — Monday, Aug 10 @ 02:00 PM - 03:00 PM"
      const roomAssignment = `${selectedRoom.roomId} — ${dayLabel} @ ${selectedTime}`;
      await updateSubmission({ ...submission, roomAssignment });
      setSaveState('success');
      toast({ title: 'Room assignment saved', description: roomAssignment });
      setTimeout(() => setSaveState('idle'), 3000);
    } catch {
      setSaveState('error');
      toast({ variant: 'destructive', title: 'Save failed', description: 'Could not save room assignment.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-dashed border-blue-500/50 bg-blue-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-600" />
          <CardTitle className="text-base font-semibold text-blue-700">Room Assignment</CardTitle>
        </div>
        <CardDescription>
          Assign a room, day, and time slot. Partner preferences are shown for reference only.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">

        {/* ── Partner preferences (read-only reference) ── */}
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Partner Preferences (for reference only)</p>
          <div className="grid gap-1 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">1st choice: </span>
              <span>{partnerFirst}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">2nd choice: </span>
              <span>{partnerSecond}</span>
            </div>
          </div>
        </div>

        <div className="border-t" />

        {/* ── Day selector ── */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Day</label>
          <select
            value={selectedDate}
            onChange={handleDateChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select a day…</option>
            {availableDays.map(iso => (
              <option key={iso} value={iso}>{formatDayLabel(iso)}</option>
            ))}
          </select>
        </div>

        {/* ── Time selector ── */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Time Slot</label>
          <select
            value={selectedTime}
            onChange={handleTimeChange}
            disabled={!selectedDate}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{selectedDate ? 'Select a time…' : 'Select a day first…'}</option>
            {timeOptions.map(opt => (
              <option key={opt.time} value={opt.time}>
                {opt.time}{opt.closed ? ' (Closed to new bookings)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* ── Room selector (active only after day + time are chosen) ── */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Room</label>
          {loadingRooms ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading rooms…
            </div>
          ) : (
            <select
              value={selectedRoomId}
              onChange={handleRoomChange}
              disabled={!selectedDate || !selectedTime}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {selectedDate && selectedTime ? 'Select a room…' : 'Select day & time first…'}
              </option>
              {rooms.map(r => (
                <option key={r.roomId} value={r.roomId}>
                  {r.roomId}
                </option>
              ))}
            </select>
          )}
        </div>



        {/* ── Conflict warning ── */}
        {checkingConflict && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking for conflicts…
          </div>
        )}
        {!checkingConflict && conflict && (
          <div className="flex items-start gap-2 rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Conflict detected:</span> {conflict}
            </p>
          </div>
        )}

        <div className="border-t" />

        {/* ── Save row ── */}
        <div className="flex items-center justify-end gap-3">
          {saveState === 'success' && (
            <span className="text-sm text-green-600 font-medium">Saved ✓</span>
          )}
          {saveState === 'error' && (
            <span className="text-sm text-red-600 font-medium">Save failed — try again</span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !selectedRoomId || !selectedDate || !selectedTime || loadingRooms}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Assign Room
          </Button>
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
          {submission.companyName && (
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
            {submission.expectedAttendance != null && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected Attendance</p>
                <p className="text-sm">{submission.expectedAttendance}</p>
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
  isAdmin = false,
  showApproveButton = false,
  onApprove,
  isApproving = false,
  approved = false,
}: {
  submission: Submission;
  isAdmin?: boolean;
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

      {/* Admin panel — admin only */}
      {isAdmin && <AdminPanel submission={submission} />}
      {isAdmin && <AdminCorrectionPanel submission={submission} />}
      {isAdmin && <RoomAssignmentPanel submission={submission} />}
    </div>
  );
}

// ─── Phase 2: Needs Information ───────────────────────────────────────────────

function Phase2View({ submission, isAdmin, isClient }: { submission: Submission; isAdmin: boolean; isClient: boolean }) {
  const { updateSubmission } = useSubmissions();

  const presentersAdded = submission.presentersAdded ?? false;
  const avSelected = submission.avSelected ?? false;
  const paymentComplete = submission.paymentComplete ?? false;
  const isReception = submission.sessionType === 'reception';
  const avIsOpen = new Date() >= AV_OPEN_DATE;

  // Reception: advance once AV selected + payment confirmed.
  // Workshop/info-session: need presenters added + AV selected + payment confirmed.
  const allDone = isReception
    ? (avSelected && paymentComplete)
    : (presentersAdded && avSelected && paymentComplete);

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

      {/* AI Session Notes — feature-flagged; hidden from client role */}
      {!isClient && <AiNotesSection submission={submission} />}

      <div className="flex flex-col gap-4">

        {/* Task 1 — Presenters (workshop & info-session only) */}
        {!isReception && (
          <TaskPill complete={presentersAdded} icon={Users} label="Presenters Added" alwaysShowChildren>
            <PresenterSection submission={submission} />
          </TaskPill>
        )}

        {/* Task 2 – AV Package & Payment (hidden from client users) */}
        {!isClient && (
          <TaskPill complete={avSelected} icon={Monitor} label="AV Package &amp; Payment" alwaysShowChildren>
            {avIsOpen ? (
              <AVPackageSelector submission={submission} />
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  AV package selection opens May 8. You'll receive an email when this section is ready to complete.
                </p>
              </div>
            )}
          </TaskPill>
        )}
      </div>

      {/* Admin panel — admin only */}
      {isAdmin && <AdminPanel submission={submission} />}
      {isAdmin && <AdminCorrectionPanel submission={submission} />}
      {isAdmin && <RoomAssignmentPanel submission={submission} />}
    </div>
  );
}

// ─── Phase 3: Submitted – Awaiting Assignment ─────────────────────────────────

function Phase3View({ submission, isAdmin, isClient }: { submission: Submission; isAdmin: boolean; isClient: boolean }) {
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
              assignments. You'll receive confirmation by July 6.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submission Summary */}
      <SubmissionSummaryCard submission={submission} />

      {/* AI Session Notes — feature-flagged; hidden from client role */}
      {!isClient && <AiNotesSection submission={submission} />}

      {/* Presenters — editable until July 6 (hidden for receptions) */}
      {!isReception && (
        <Card className="border-green-500/40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              <CardTitle className="text-base font-semibold text-green-700">Presenters Added</CardTitle>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              You can update presenter details and headshots until July 6.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PresenterSection submission={submission} />
          </CardContent>
        </Card>
      )}

      {/* AV Package — locked read-only view (hidden from client users) */}
      {!isClient && (
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
      )}


      {/* Admin panel — admin only */}
      {isAdmin && <AdminPanel submission={submission} />}
      {isAdmin && <AdminCorrectionPanel submission={submission} />}
      {isAdmin && <RoomAssignmentPanel submission={submission} />}

    </div>
  );
}

// ─── Phase 4: Confirmed ───────────────────────────────────────────────────────

function Phase4View({ submission, isAdmin, isClient }: { submission: Submission; isAdmin: boolean; isClient: boolean }) {
  const cfg = phaseConfig.phase_4;
  const Icon = cfg.icon;
  const isReception = submission.sessionType === 'reception';
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

      {/* AI Session Notes — feature-flagged; hidden from client role */}
      {!isClient && <AiNotesSection submission={submission} />}

      {/* Presenters — editable for admin/internal/superadmin; read-only for partners */}
      {isAdmin && !isReception ? (
        <Card className="border-green-500/40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              <CardTitle className="text-base font-semibold text-green-700">Presenters</CardTitle>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              Edit presenter details and headshots for this confirmed session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PresenterSection submission={submission} />
          </CardContent>
        </Card>
      ) : (
        submission.presenters && submission.presenters.length > 0 && (
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
        )
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

      {/* AV Package — locked read-only view (hidden from client users) */}
      {!isClient && (
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
      )}

      {/* Admin panel — admin only */}
      {isAdmin && <AdminPanel submission={submission} />}
      {isAdmin && <AdminCorrectionPanel submission={submission} />}
      {isAdmin && <RoomAssignmentPanel submission={submission} />}

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
  const firestore = useFirestore();
  const { updateSubmission } = useSubmissions();
  const { toast } = useToast();
  const router = useRouter();
  const isAdmin = ['internal', 'admin', 'superadmin'].includes(profile?.role ?? '');
  const isClient = profile?.role === 'client';

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [pendingPhase, setPendingPhase] = useState<Submission['status'] | null>(null);
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);

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
      if (firestore && submission.userId) {
        const submitterSnap = await getDoc(doc(firestore, 'users', submission.userId));
        const submitterEmail = submitterSnap.data()?.email as string | undefined;
        if (submitterEmail) {
          await sendStatusUpdateEmail(updated, submitterEmail);
          await sendSessionApprovedEmail(updated, submitterEmail);
        }
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

  const handlePhaseChange = (newPhase: Submission['status']) => {
    if (newPhase === 'phase_4') {
      if (!submission.roomAssignment?.trim()) {
        toast({
          variant: 'destructive',
          title: 'Room assignment required',
          description: 'Please save a room assignment before moving to Phase 4.',
        });
        return;
      }
      // Room is populated — open the confirmation dialog
      setPendingPhase('phase_4');
      setPhaseDialogOpen(true);
      return;
    }
    // All other phase transitions proceed immediately (existing behaviour preserved)
    void executePhaseChange(newPhase);
  };

  const executePhaseChange = async (newPhase: Submission['status']) => {
    try {
      const updated = { ...submission, status: newPhase };
      await updateSubmission(updated);
      if (firestore && submission.userId) {
        const submitterSnap = await getDoc(doc(firestore, 'users', submission.userId));
        const submitterEmail = submitterSnap.data()?.email as string | undefined;
        if (submitterEmail) {
          if (newPhase === 'phase_4') {
            await sendRoomAssignedEmail(updated);
          } else {
            await sendStatusUpdateEmail(updated, submitterEmail);
            if (newPhase === 'phase_2') {
              await sendSessionApprovedEmail(updated, submitterEmail);
            }
          }
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
      {/* Phase 4 confirmation dialog */}
      <AlertDialog open={phaseDialogOpen} onOpenChange={setPhaseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send room assignment notification?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Moving to Phase 4 will send a room assignment notification to the partner.
                </p>
                <div className="rounded-md border border-border bg-muted/50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Room</p>
                  <p className="text-sm font-medium text-foreground">{submission.roomAssignment}</p>
                </div>
                <p>Do you want to proceed?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPhaseDialogOpen(false); setPendingPhase(null); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPhaseDialogOpen(false);
                if (pendingPhase) void executePhaseChange(pendingPhase);
                setPendingPhase(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link
            href={from === 'review' ? '/review' : from === 'all-sessions' ? '/all-sessions' : from === 'av-orders' ? '/av-orders' : from === 'scenic-orders' ? '/scenic-orders' : '/dashboard'}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {from === 'review' ? 'Back to Review Sessions' : from === 'all-sessions' ? 'Back to All Sessions' : from === 'av-orders' ? 'Back to AV Orders' : from === 'scenic-orders' ? 'Back to Scenic Orders' : 'Back to Dashboard'}
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
          isAdmin={isAdmin}
          showApproveButton={showApproveButton}
          onApprove={handleApprove}
          isApproving={isApproving}
          approved={approved}
        />
      )}
      {submission.status === 'phase_2' && <Phase2View submission={submission} isAdmin={isAdmin} isClient={isClient} />}
      {submission.status === 'phase_3' && <Phase3View submission={submission} isAdmin={isAdmin} isClient={isClient} />}
      {submission.status === 'phase_4' && <Phase4View submission={submission} isAdmin={isAdmin} isClient={isClient} />}
    </div>
  );
}

