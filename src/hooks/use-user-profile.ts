'use client';

import { useMemo } from 'react';
import { doc, DocumentReference } from 'firebase/firestore';
import { useFirestore, useDoc, WithId, useMemoFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';

export function useUserProfile(uid: string | undefined) {
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !uid) return null;
    return doc(firestore, 'users', uid) as DocumentReference<UserProfile>;
  }, [firestore, uid]);

  const { data: profile, isLoading, error } = useDoc<UserProfile>(userDocRef);

  return { profile: profile as WithId<UserProfile> | null, isLoading, error };
}
