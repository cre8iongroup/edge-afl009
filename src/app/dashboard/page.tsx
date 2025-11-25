'use client';

import AppLayout from '@/components/layout/app-layout';
import { useAuth } from '@/components/auth-provider';
import { submissions } from '@/lib/data';
import SubmissionCard from '@/components/dashboard/submission-card';

export default function DashboardPage() {
  const { user } = useAuth();
  const userSubmissions = submissions.filter(sub => sub.userId === user?.id);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold">Welcome, {user?.name}!</h1>
          <p className="text-muted-foreground">Here&apos;s an overview of your submissions.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {userSubmissions.length > 0 ? (
            userSubmissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))
          ) : (
            <div className="col-span-full text-center text-muted-foreground">
                You haven&apos;t made any submissions yet.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
