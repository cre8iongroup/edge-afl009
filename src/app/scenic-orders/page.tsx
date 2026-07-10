'use client';

import AppLayout from '@/components/layout/app-layout';
import ScenicTable from '@/components/shared/scenic-table';
import { useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ScenicOrdersPage() {
  const { user, isUserLoading } = useUser();
  const { profile, isLoading: isProfileLoading } = useUserProfile(user?.uid);
  const router = useRouter();

  const canViewPage = !isUserLoading && !isProfileLoading && user && profile && ['internal', 'admin', 'superadmin'].includes(profile.role);

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user) {
        router.push('/');
        return;
      }
      if (!profile || !['internal', 'admin', 'superadmin'].includes(profile.role)) {
        router.push('/dashboard');
      }
    }
  }, [user, profile, isUserLoading, isProfileLoading, router]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold">Scenic Orders</h1>
          <p className="text-muted-foreground">Track and manage scenic items across all confirmed AV orders.</p>
        </div>
        {canViewPage && <ScenicTable />}
      </div>
    </AppLayout>
  );
}
