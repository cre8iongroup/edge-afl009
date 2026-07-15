'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').toLowerCase().trim();
}

/**
 * Live subscription to page_allowlists/{docId}.
 * Gate pages/nav with `allowed` (Auth email vs emails[], lowercased).
 */
export function usePageAllowlist(docId: string) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [emails, setEmails] = useState<string[]>([]);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!firestore) return;
    const ref = doc(firestore, 'page_allowlists', docId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setExists(snap.exists());
        const list = snap.exists() ? (snap.data()?.emails ?? []) : [];
        setEmails(Array.isArray(list) ? list.map(String) : []);
        setLoadingDoc(false);
      },
      () => {
        setExists(false);
        setEmails([]);
        setLoadingDoc(false);
      },
    );
    return unsub;
  }, [firestore, docId]);

  const normalizedUserEmail = useMemo(
    () => normalizeEmail(user?.email),
    [user?.email],
  );

  const normalizedEmails = useMemo(
    () => emails.map(normalizeEmail).filter(Boolean),
    [emails],
  );

  const allowed =
    !!normalizedUserEmail && normalizedEmails.includes(normalizedUserEmail);

  return {
    emails,
    normalizedEmails,
    exists,
    allowed,
    isLoading: isUserLoading || loadingDoc,
    userEmail: user?.email ?? null,
  };
}
