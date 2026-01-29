'use client';

import AppLayout from '@/components/layout/app-layout';
import ReceptionForm from '@/components/submit/reception-form';

export default function SubmitReceptionPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold">Submit a Reception</h1>
          <p className="text-muted-foreground">Fill out the form below to submit your reception for the ALPFA 2026 Convention.</p>
        </div>
        <ReceptionForm />
      </div>
    </AppLayout>
  );
}
