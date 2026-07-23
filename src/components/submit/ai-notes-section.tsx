'use client';

import type { Submission } from '@/lib/types';
import { useSubmissions } from '@/components/submissions-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { FileText, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

// FINAL — approved by Esperanza, July 14, 2026.
// Known gap: copy states a 72-hour pre-session opt-out cutoff, but the app does not
// enforce that lock for this show year — intentional, not a bug.
function ConsentCopy() {
  return (
    <>
      <p>
        Note: Live AI translation &amp; captioning runs on every session for accessibility and is
        not affected by this choice. This checkbox controls AI note-taking only.
      </p>
      <p>
        By leaving this box checked, I consent to the AI-powered capture, transcription, and
        summarization of this session, including spoken remarks, questions, responses, and
        discussion points. I understand these notes, transcripts, and summaries will be shared with
        ALPFA members and may be used by ALPFA in promotional, marketing, or educational materials.
        ALPFA handles these materials in accordance with its{' '}
        <a
          href="https://alpfa.org/cms/wp-content/uploads/2026/04/2026-05-Final_Website-Terms-of-Service.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-foreground"
        >
          Terms of Service
        </a>
        ,{' '}
        <a
          href="https://alpfa.org/cms/wp-content/uploads/2026/04/2026-05-Final_Website-Privacy-Policy.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-foreground"
        >
          Privacy Policy
        </a>
        , and applicable data privacy regulations, and access to any session audio is limited to
        authorized personnel on a need-to-know basis. I understand I may opt this session out of
        note-taking until 72 hours before it begins, after which the selection is final.
      </p>
    </>
  );
}

function formatLocalTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function latestOptOutTimestamp(log: Submission['aiNotesConsentLog']): string | null {
  if (!log?.length) return null;
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].action === 'opted_out') return log[i].timestamp;
  }
  return null;
}

export default function AiNotesSection({ submission }: { submission: Submission }) {
  const firestore = useFirestore();
  const { updateSubmission } = useSubmissions();
  const { toast } = useToast();

  const [flagEnabled, setFlagEnabled] = useState(false);
  const [flagLoading, setFlagLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const optedOut = submission.aiNotesOptOut === true;
  const pendingAction: 'opted_out' | 'opted_in' = optedOut ? 'opted_in' : 'opted_out';

  useEffect(() => {
    if (!firestore) return;
    const flagRef = doc(firestore, 'feature_flags', 'ai_notes_visible');
    const unsub = onSnapshot(
      flagRef,
      (snap) => {
        setFlagEnabled(snap.exists() && snap.data()?.enabled === true);
        setFlagLoading(false);
      },
      () => {
        setFlagEnabled(false);
        setFlagLoading(false);
      }
    );
    return unsub;
  }, [firestore]);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const nextLog = [
        ...(submission.aiNotesConsentLog ?? []),
        { action: pendingAction, timestamp },
      ];
      await updateSubmission({
        ...submission,
        aiNotesOptOut: pendingAction === 'opted_out',
        aiNotesConsentLog: nextLog,
      });
      setDialogOpen(false);
      toast({
        title: pendingAction === 'opted_out' ? 'Opted out of AI notes' : 'Opted back in to AI notes',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not update AI notes preference. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (flagLoading || !flagEnabled) return null;
  if (submission.sessionType === 'reception') return null;

  const optOutAt = latestOptOutTimestamp(submission.aiNotesConsentLog);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <CardTitle className="text-base font-semibold">AI Session Notes</CardTitle>
          </div>
          <CardDescription>
            Live AI translation &amp; captioning runs on every session for accessibility and cannot be
            turned off. This section controls AI note-taking only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {optedOut ? (
            <p className="text-sm font-medium text-red-600">
              AI Session Notes: Opted Out
              {optOutAt ? ` — ${formatLocalTimestamp(optOutAt)}` : ''}
            </p>
          ) : (
            <p className="text-sm font-medium text-green-600">AI Session Notes: Enabled</p>
          )}

          <Button
            variant={optedOut ? 'default' : 'outline'}
            onClick={() => setDialogOpen(true)}
          >
            {optedOut ? 'Opt Back In' : 'Opt Out of AI Notes'}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === 'opted_out' ? 'Opt out of AI notes?' : 'Opt back in to AI notes?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <ConsentCopy />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void handleConfirm(); }} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
