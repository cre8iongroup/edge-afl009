'use client';

import { useMemo } from 'react';
import { collection, CollectionReference } from 'firebase/firestore';
import { useFirestore, useCollection, WithId } from '@/firebase';
import { UserProfile } from '@/lib/types';

export function useUserProfiles() {
  const firestore = useFirestore();

  const usersColRef = useMemo(() => {
    return collection(firestore, 'users') as CollectionReference<UserProfile>;
  }, [firestore]);

  const { data: users, isLoading, error } = useCollection<UserProfile>(usersColRef);

  return { users: users as WithId<UserProfile>[] | null, isLoading, error };
}
