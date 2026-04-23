'use client';

import AppLayout from '@/components/layout/app-layout';
import SessionDetailView from '@/components/submit/session-detail-view';
import { useParams, useSearchParams } from 'next/navigation';
import { useSubmissions } from '@/components/submissions-provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirestore } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useMemo } from 'react';
import type { Submission } from '@/lib/types';

export default function InfoSessionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? undefined;
  const { getSubmission } = useSubmissions();
  const firestore = useFirestore();

  const collectionSubmission = getSubmission(id);

  const docRef = useMemo(
    () => (!collectionSubmission && firestore ? doc(collection(firestore, 'submissions'), id) : null),
    [collectionSubmission, firestore, id],
  );
  const { data: docSubmission, isLoading } = useDoc<Submission>(docRef);

  const submission = collectionSubmission ?? docSubmission ?? null;

  return (
    <AppLayout>
      {submission ? (
        <SessionDetailView submission={submission} from={from} />
      ) : isLoading ? (
        <div className="text-center text-muted-foreground py-16">Loading…</div>
      ) : (
        <div className="text-center text-muted-foreground py-16">Submission not found.</div>
      )}
    </AppLayout>
  );
}
