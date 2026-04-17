'use client';

import AppLayout from '@/components/layout/app-layout';
import SessionDetailView from '@/components/submit/session-detail-view';
import { useParams } from 'next/navigation';
import { useSubmissions } from '@/components/submissions-provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirestore } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useMemo } from 'react';
import type { Submission } from '@/lib/types';

export default function WorkshopDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { getSubmission } = useSubmissions();
  const firestore = useFirestore();

  // Primary: look up from the in-memory collection (covers owner + admin queries).
  const collectionSubmission = getSubmission(id);

  // Fallback: direct doc fetch by ID — allows delegates in authorizedEmails to
  // reach this page. Firestore rules permit get if email is in authorizedEmails.
  // We only activate this when the collection query didn't return the doc.
  const docRef = useMemo(
    () => (!collectionSubmission && firestore ? doc(collection(firestore, 'submissions'), id) : null),
    [collectionSubmission, firestore, id],
  );
  const { data: docSubmission, isLoading } = useDoc<Submission>(docRef);

  const submission = collectionSubmission ?? docSubmission ?? null;

  return (
    <AppLayout>
      {submission ? (
        <SessionDetailView submission={submission} />
      ) : isLoading ? (
        <div className="text-center text-muted-foreground py-16">Loading…</div>
      ) : (
        <div className="text-center text-muted-foreground py-16">Submission not found.</div>
      )}
    </AppLayout>
  );
}
