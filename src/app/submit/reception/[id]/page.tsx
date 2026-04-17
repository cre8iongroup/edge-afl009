'use client';

import AppLayout from '@/components/layout/app-layout';
import SessionDetailView from '@/components/submit/session-detail-view';
import { useParams } from 'next/navigation';
import { useSubmissions } from '@/components/submissions-provider';

export default function ReceptionDetailPage() {
  const params = useParams();
  const { id } = params;
  const { getSubmission } = useSubmissions();

  const submission = getSubmission(id as string);

  return (
    <AppLayout>
      {submission ? (
        <SessionDetailView submission={submission} />
      ) : (
        <div className="text-center text-muted-foreground py-16">Submission not found.</div>
      )}
    </AppLayout>
  );
}
