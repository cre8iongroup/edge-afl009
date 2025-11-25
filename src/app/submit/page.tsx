'use client';

import AppLayout from '@/components/layout/app-layout';
import SubmissionForm from '@/components/submit/submission-form';

export default function SubmitPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold">Submit a Workshop Proposal</h1>
          <p className="text-muted-foreground">Fill out the form below to submit your session for the ALPFA Convention.</p>
        </div>
        <SubmissionForm />
      </div>
    </AppLayout>
  );
}
