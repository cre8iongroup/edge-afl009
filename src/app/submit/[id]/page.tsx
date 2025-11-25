'use client';

import AppLayout from '@/components/layout/app-layout';
import SubmissionForm from '@/components/submit/submission-form';
import { submissions } from '@/lib/data';
import { useParams } from 'next/navigation';

export default function EditSubmissionPage() {
  const params = useParams();
  const { id } = params;

  // In a real app, you'd fetch this from a database
  const submission = submissions.find(sub => sub.id === id);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold">Edit Workshop Proposal</h1>
          <p className="text-muted-foreground">Make changes to your session submission below.</p>
        </div>
        {submission ? (
          <SubmissionForm submission={submission} />
        ) : (
          <div className="text-center text-muted-foreground">
            Submission not found.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
