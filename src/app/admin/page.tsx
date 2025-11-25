'use client';

import AppLayout from '@/components/layout/app-layout';
import SubmissionsTable from '@/components/admin/submissions-table';

export default function AdminPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold">Admin Dashboard</h1>
          <p className="text-muted-foreground">View and manage all workshop submissions.</p>
        </div>
        <SubmissionsTable />
      </div>
    </AppLayout>
  );
}
