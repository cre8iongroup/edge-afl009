'use client';

import AppLayout from '@/components/layout/app-layout';
import SubmissionCard from '@/components/dashboard/submission-card';
import DeadlineBanner from '@/components/dashboard/deadline-banner';
import { useSubmissions } from '@/components/submissions-provider';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { FilePlus, Mail } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserProfile } from '@/hooks/use-user-profile';
import ProcessTimeline from '@/components/template/process-timeline';
import { isPortalClosed } from '@/lib/deadlines';

export default function DashboardPage() {
  const { user } = useUser();
  const { submissions } = useSubmissions();
  const { profile } = useUserProfile(user?.uid);
  const userEmail = user?.email?.toLowerCase();
  const userSubmissions = submissions.filter(sub =>
    sub.userId === user?.uid ||
    (userEmail && (sub.authorizedEmails ?? []).map(e => e.toLowerCase()).includes(userEmail))
  );

  const displayName = profile?.name && profile.name !== 'New Member' ? profile.name : '';
  const isAdmin = ['internal', 'admin', 'superadmin'].includes(profile?.role ?? '');
  const portalClosed = isPortalClosed();

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold">Welcome to the ALPFA 2026 Convention Portal</h1>
          <p className="text-muted-foreground">Here&apos;s an overview of your submissions.</p>
        </div>

        {/* Pre-deadline banner — visible to regular role only, self-hides once portal closes */}
        {!isAdmin && <DeadlineBanner />}

        <ProcessTimeline />

        {/* Post-deadline gate: replace submission area for regular role once portal closes */}
        {(portalClosed && !isAdmin) ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center gap-4 p-8 md:p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Mail className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="font-headline text-xl font-semibold">Submissions are now closed.</h2>
                <p className="max-w-prose text-sm text-muted-foreground">
                  The June&nbsp;26 deadline has passed and the portal is no longer accepting new
                  submissions or edits. If you need immediate assistance with your session, please
                  contact our team at{' '}
                  <a
                    href="mailto:edge@cre8iongroup.com"
                    className="font-medium text-primary hover:underline"
                  >
                    edge@cre8iongroup.com
                  </a>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {userSubmissions.length > 0 ? (
              userSubmissions.map((submission) => (
                <SubmissionCard key={submission.id} submission={submission} />
              ))
            ) : (
              <div className="col-span-full">
                <Card className="flex flex-col items-center justify-center text-center p-8 md:p-12">
                  <CardHeader>
                    <CardTitle className="font-headline text-2xl">Ready to Make an Impact?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="max-w-prose text-muted-foreground">
                      It looks like you haven&apos;t submitted a session proposal yet. Share your expertise and contribute to the ALPFA 2026 Convention by submitting a workshop, reception, or info session.
                    </p>
                    <Link href="/template" passHref>
                      <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <FilePlus className="mr-2" />
                        Start a New Submission
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
