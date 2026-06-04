'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/app-layout';
import { useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useSubmissions } from '@/components/submissions-provider';
import { Loader2, AlertCircle } from 'lucide-react';
import SessionsTable from '@/components/shared/sessions-table';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALLOWED_ROLES = ['internal', 'admin', 'client'] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const { user, isUserLoading } = useUser();
  const { profile, isLoading: isProfileLoading } = useUserProfile(user?.uid);
  const { loading: submissionsLoading } = useSubmissions();
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

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Page header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-headline text-3xl font-semibold">Review Sessions</h1>
          <p className="text-muted-foreground">
            Approve submissions and track all sessions. Use the filters below to focus on any phase.
          </p>
        </div>

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

        {canViewPage && !submissionsLoading && (
          <SessionsTable role="client" />
        )}
      </div>
    </AppLayout>
  );
}
