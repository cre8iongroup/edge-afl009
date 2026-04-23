'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/app-layout';
import { useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useSubmissions } from '@/components/submissions-provider';
import { useUserProfiles } from '@/hooks/use-user-profiles';
import type { Submission } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Clock,
  Briefcase,
  Handshake,
  Presentation,
  ClipboardCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REVIEWABLE_STATUSES: Submission['status'][] = ['phase_1'];

const ALLOWED_ROLES = ['internal', 'admin', 'client'] as const;

const statusConfig: Record<string, { dot: string; label: string; className: string }> = {
  phase_1: {
    dot: 'bg-blue-500',
    label: 'Awaiting Approval',
    className: 'text-blue-500 border-blue-500/50',
  },
};

const sessionTypeConfig: Record<Submission['sessionType'], { icon: React.ElementType; label: string }> = {
  workshop:      { icon: Briefcase,    label: 'Workshop' },
  reception:     { icon: Handshake,    label: 'Reception' },
  'info-session': { icon: Presentation, label: 'Info Session' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const { user, isUserLoading } = useUser();
  const { profile, isLoading: isProfileLoading } = useUserProfile(user?.uid);
  const { submissions, loading: submissionsLoading } = useSubmissions();
  const { users } = useUserProfiles();
  const router = useRouter();

  const isLoading = isUserLoading || isProfileLoading;
  const canViewPage =
    !isLoading &&
    user &&
    profile &&
    (ALLOWED_ROLES as readonly string[]).includes(profile.role);

  // Route guard
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

  const phase1Count = pendingSessions.length;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Page header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-headline text-3xl font-semibold">Review Sessions</h1>
          <p className="text-muted-foreground">
            Approve Phase 1 submissions.
          </p>
        </div>

        {/* Summary badge */}
        {canViewPage && !submissionsLoading && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">{phase1Count} Awaiting Approval</span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {(isLoading || submissionsLoading) && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Access denied */}
        {!isLoading && !canViewPage && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">You don&apos;t have access to this page.</p>
          </div>
        )}

        {/* Sessions table */}
        {canViewPage && !submissionsLoading && pendingSessions.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitter</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Pillar</TableHead>
                      <TableHead>Format</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSessions.map((item) => {
                      const statusCfg = statusConfig[item.status] ?? statusConfig['phase_1'];
                      const SessionTypeIcon = sessionTypeConfig[item.sessionType]?.icon || Briefcase;
                      const sessionTypeLabel = sessionTypeConfig[item.sessionType]?.label || 'Workshop';
                      const submitter = users?.find(u => u.id === item.userId);
                      const userName = submitter
                        ? (submitter.name && submitter.name !== 'New Member' ? submitter.name : submitter.email)
                        : 'Unknown User';
                      const fallbackInitial = userName?.charAt(0) || '';

                      return (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/submit/${item.sessionType}/${item.id}?from=review`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={submitter?.avatar || ''} alt={submitter?.name || ''} />
                                <AvatarFallback>{fallbackInitial}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{userName}</div>
                                <div className="text-xs text-muted-foreground">{submitter?.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <SessionTypeIcon className="h-4 w-4 text-muted-foreground" />
                              {sessionTypeLabel}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn('whitespace-nowrap font-medium gap-1.5', statusCfg.className)}
                            >
                              <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', statusCfg.dot)} />
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.pillar}</TableCell>
                          <TableCell>{item.format}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
