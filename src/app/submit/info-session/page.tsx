'use client';

import AppLayout from '@/components/layout/app-layout';
import InfoSessionForm from '@/components/submit/info-session-form';

export default function SubmitInfoSessionPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold">Submit an Info Session</h1>
          <p className="text-muted-foreground">Fill out the form below to submit your info session for the ALPFA 2026 Convention.</p>
        </div>
        <InfoSessionForm />
      </div>
    </AppLayout>
  );
}
