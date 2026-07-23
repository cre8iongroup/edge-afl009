'use client';

import AppLayout from '@/components/layout/app-layout';
import AuditTable from '@/components/shared/audit-table';
import { useUser } from '@/firebase';
import { usePageAllowlist } from '@/hooks/use-page-allowlist';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuditPage() {
  const { user, isUserLoading } = useUser();
  const { allowed, isLoading: isAllowlistLoading } = usePageAllowlist('audit');
  const router = useRouter();

  const canViewPage =
    !isUserLoading && !isAllowlistLoading && !!user && allowed;

  useEffect(() => {
    if (isUserLoading || isAllowlistLoading) return;
    if (!user) {
      router.push('/');
      return;
    }
    if (!allowed) {
      router.push('/dashboard');
    }
  }, [user, allowed, isUserLoading, isAllowlistLoading, router]);

  if (isUserLoading || isAllowlistLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold">Audit</h1>
          <p className="text-muted-foreground">
            Presenter assets and AV/payment completeness across all sessions.
            AI Notes apply to workshops and info sessions only — receptions are
            excluded.
          </p>
        </div>
        {canViewPage && <AuditTable />}
      </div>
    </AppLayout>
  );
}
