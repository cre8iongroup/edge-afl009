'use client';

import Link from 'next/link';
import AppLayout from '@/components/layout/app-layout';
import TemplateForm from '@/components/template/template-form';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function TemplatePage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-12">
        <div className="space-y-4 text-center">
          <h1 className="font-headline text-4xl font-bold tracking-tight">Workshop Submission Guide</h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Follow this guide to craft a compelling workshop proposal. Below, you&apos;ll find an example of a high-quality submission.
          </p>
        </div>
        
        <div>
            <h2 className="mb-2 font-headline text-3xl font-semibold">Example Submission</h2>
            <p className="mb-6 text-muted-foreground">
                This is a read-only example of a well-crafted proposal to guide you.
            </p>
            <TemplateForm />
        </div>

        <div className="flex justify-center">
          <Link href="/submit/workshop" passHref>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Get Started with Your Submission
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
