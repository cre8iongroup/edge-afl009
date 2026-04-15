'use client';

import AppLayout from '@/components/layout/app-layout';
import ReceptionForm from '@/components/submit/reception-form';
import { useParams } from 'next/navigation';
import { useSubmissions } from '@/components/submissions-provider';

export default function EditReceptionPage() {
  const params = useParams();
  const { id } = params;
  const { getSubmission } = useSubmissions();

  const submission = getSubmission(id as string);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold">Edit Reception Proposal</h1>
          <p className="text-muted-foreground">Make changes to your submission below.</p>
        </div>
        {submission ? (
          <ReceptionForm submission={submission} />
        ) : (
          <div className="text-center text-muted-foreground">
            Submission not found.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
