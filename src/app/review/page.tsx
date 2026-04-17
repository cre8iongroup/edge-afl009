'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/app-layout';
import { useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useSubmissions } from '@/components/submissions-provider';
import { useUserProfiles } from '@/hooks/use-user-profiles';
import { useToast } from '@/hooks/use-toast';
import { sendStatusUpdateEmail, sendSessionApprovedEmail } from '@/lib/actions';
import type { Submission } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Clock,
  RotateCcw,
  CheckCircle2,
  Briefcase,
  Handshake,
  Presentation,
  ClipboardCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REVIEWABLE_STATUSES: Submission['status'][] = ['phase_1', 'phase_1_revision'];

const ALLOWED_ROLES = ['internal', 'admin', 'client'] as const;

const statusConfig = {
  phase_1: {
    icon: Clock,
    label: 'Awaiting Approval',
    className: 'border-blue-500/50 text-blue-500 bg-blue-500/5',
  },
  phase_1_revision: {
    icon: RotateCcw,
    label: 'Revision Requested',
    className: 'border-orange-500/50 text-orange-500 bg-orange-500/5',
  },
} satisfies Partial<Record<Submission['status'], { icon: React.ElementType; label: string; className: string }>>;

const sessionTypeConfig: Record<Submission['sessionType'], { icon: React.ElementType; label: string }> = {
  workshop:      { icon: Briefcase,    label: 'Workshop' },
  reception:     { icon: Handshake,    label: 'Reception' },
  'info-session': { icon: Presentation, label: 'Info Session' },
};

// ─── Session Review Card ──────────────────────────────────────────────────────

function SessionReviewCard({ submission }: { submission: Submission }) {
  const { updateSubmission } = useSubmissions();
  const { toast } = useToast();
  const { users } = useUserProfiles();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [revisingId, setRevisingId] = useState<string | null>(null);

  const statusCfg = statusConfig[submission.status as keyof typeof statusConfig] ?? statusConfig.phase_1;
  const StatusIcon = statusCfg.icon;
  const sessionCfg = sessionTypeConfig[submission.sessionType];
  const SessionIcon = sessionCfg.icon;

  const submitter = users?.find(u => u.id === submission.userId);

  const handleApprove = async () => {
    setApprovingId(submission.id);
    try {
      const updated = { ...submission, status: 'phase_2' as Submission['status'] };
      await updateSubmission(updated);
      if (submitter?.email) {
        await sendStatusUpdateEmail(updated, submitter.email);
        await sendSessionApprovedEmail(updated, submitter.email);
      }
      toast({
        title: 'Session Approved',
        description: `"${submission.title}" has been moved to Phase 2.`,
      });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not approve the session. Please try again.' });
    } finally {
      setApprovingId(null);
    }
  };

  const handleRequestRevision = async () => {
    setRevisingId(submission.id);
    try {
      const updated = { ...submission, status: 'phase_1_revision' as Submission['status'] };
      await updateSubmission(updated);
      if (submitter?.email) {
        await sendStatusUpdateEmail(updated, submitter.email);
      }
      toast({
        title: 'Revision Requested',
        description: `"${submission.title}" has been sent back for revision.`,
      });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not request revision. Please try again.' });
    } finally {
      setRevisingId(null);
    }
  };

  const isApproving = approvingId === submission.id;
  const isRevising = revisingId === submission.id;
  const isBusy = isApproving || isRevising;

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="font-headline text-lg leading-snug">{submission.title}</CardTitle>
            {submitter && (
              <p className="text-xs text-muted-foreground">
                Submitted by {submitter.name || submitter.email}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn('shrink-0 whitespace-nowrap self-start font-medium', statusCfg.className)}
          >
            <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
            {statusCfg.label}
          </Badge>
        </div>

        <CardDescription className="flex flex-wrap gap-2 pt-2">
          <Badge variant="secondary" className="gap-1.5">
            <SessionIcon className="h-3.5 w-3.5" />
            {sessionCfg.label}
          </Badge>
          <Badge variant="secondary">{submission.pillar}</Badge>
          <Badge variant="secondary">{submission.format}</Badge>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="line-clamp-3 text-sm text-muted-foreground">{submission.description}</p>

        <div className="mt-auto flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={handleApprove}
            disabled={isBusy}
            className="flex-1 gap-2 bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600"
            id={`approve-${submission.id}`}
          >
            {isApproving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isApproving ? 'Approving…' : 'Approve'}
          </Button>

          <Button
            onClick={handleRequestRevision}
            disabled={isBusy || submission.status === 'phase_1_revision'}
            variant="outline"
            className="flex-1 gap-2 border-orange-500/50 text-orange-600 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-40"
            id={`revise-${submission.id}`}
          >
            {isRevising ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            {isRevising ? 'Sending…' : 'Request Revision'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const { user, isUserLoading } = useUser();
  const { profile, isLoading: isProfileLoading } = useUserProfile(user?.uid);
  const { submissions, loading: submissionsLoading } = useSubmissions();
  const router = useRouter();

  const isLoading = isUserLoading || isProfileLoading;
  const canViewPage =
    !isLoading &&
    user &&
    profile &&
    (ALLOWED_ROLES as readonly string[]).includes(profile.role);

  // Route guard — same pattern as /all-sessions
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/');
        return;
      }
      if (!profile || !(ALLOWED_ROLES as readonly string[]).includes(profile.role)) {
        router.push('/dashboard');
      }
    }
  }, [user, profile, isLoading, router]);

  const pendingSessions = submissions.filter(s =>
    REVIEWABLE_STATUSES.includes(s.status)
  );

  const phase1Count = submissions.filter(s => s.status === 'phase_1').length;
  const revisionCount = submissions.filter(s => s.status === 'phase_1_revision').length;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Page header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-headline text-3xl font-semibold">Review Sessions</h1>
          <p className="text-muted-foreground">
            Approve or request revisions for Phase 1 submissions.
          </p>
        </div>

        {/* Summary badges */}
        {canViewPage && !submissionsLoading && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">{phase1Count} Awaiting Approval</span>
            </div>
            {revisionCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-2">
                <RotateCcw className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-700">{revisionCount} Revision Requested</span>
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {(isLoading || submissionsLoading) && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Access denied (loading complete, not authorized) */}
        {!isLoading && !canViewPage && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">You don&apos;t have access to this page.</p>
          </div>
        )}

        {/* Session grid */}
        {canViewPage && !submissionsLoading && pendingSessions.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pendingSessions.map(submission => (
              <SessionReviewCard key={submission.id} submission={submission} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {canViewPage && !submissionsLoading && pendingSessions.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 gap-4 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-medium">All caught up</p>
              <p className="text-sm text-muted-foreground">
                No sessions are currently awaiting review.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
