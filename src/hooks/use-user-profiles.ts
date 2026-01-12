'use client';

import { useMemo } from 'react';
import { collection, CollectionReference } from 'firebase/firestore';
import { useFirestore, useCollection, WithId, useMemoFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';

export function useUserProfiles() {
  const firestore = useFirestore();

  const usersColRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users') as CollectionReference<UserProfile>;
  }, [firestore]);

  const { data: users, isLoading, error } = useCollection<UserProfile>(usersColRef);

  return { users: users as WithId<UserProfile>[] | null, isLoading, error };
}
