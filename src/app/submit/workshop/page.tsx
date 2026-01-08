'use client';

import AppLayout from '@/components/layout/app-layout';
import SubmissionForm from '@/components/submit/submission-form';

export default function SubmitWorkshopPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold">Submit a Workshop Proposal</h1>
          <p className="text-muted-foreground">Fill out the form below to submit your workshop for the ALPFA 2026 Convention.</p>
        </div>
        <SubmissionForm sessionType="workshop" />
      </div>
    </AppLayout>
  );
}
