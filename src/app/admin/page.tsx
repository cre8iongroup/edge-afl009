'use client';

import AppLayout from '@/components/layout/app-layout';
import SubmissionsTable from '@/components/admin/submissions-table';
import { useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const { profile, isLoading: isProfileLoading } = useUserProfile(user?.uid);
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!profile || !['client', 'internal'].includes(profile.role)) {
        router.push('/dashboard');
      }
    }
  }, [user, profile, isUserLoading, isProfileLoading, router]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold">All Sessions</h1>
          <p className="text-muted-foreground">View and manage all workshop submissions.</p>
        </div>
        <SubmissionsTable />
      </div>
    </AppLayout>
  );
}
