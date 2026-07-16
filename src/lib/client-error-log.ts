/**
 * Best-effort client error logging for portal error boundaries.
 * Always console.errors; additionally persists to Firestore client_errors
 * fire-and-forget so a broken write cannot block the fallback UI.
 */

import { getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

export type ClientErrorLogSource = 'error' | 'global-error';

const MAX_STACK_CHARS = 8000;
const MAX_MESSAGE_CHARS = 2000;

function truncate(value: string | null, max: number): string | null {
  if (value == null) return null;
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function describeAuthState(): string {
  if (typeof window === 'undefined') return 'ssr';

  try {
    const pending = window.localStorage.getItem('emailForSignIn');
    const apps = getApps();

    if (apps.length === 0) {
      return pending
        ? `no-firebase-app; magic-link-pending:${pending}`
        : 'no-firebase-app; signed-out-or-unknown';
    }

    const user = getAuth(apps[0]).currentUser;
    if (user) {
      return `signed-in; uid=${user.uid}; email=${user.email ?? 'null'}`;
    }

    // currentUser null can mean signed out OR auth still restoring from persistence.
    return pending
      ? `signed-out-or-mid-restore; magic-link-pending:${pending}`
      : 'signed-out-or-mid-restore';
  } catch {
    return 'auth-state-unavailable';
  }
}

function resolveUidEmail(): { uid: string | null; email: string | null } {
  try {
    const apps = getApps();
    if (apps.length === 0) return { uid: null, email: null };
    const user = getAuth(apps[0]).currentUser;
    return {
      uid: user?.uid ?? null,
      email: user?.email ?? null,
    };
  } catch {
    return { uid: null, email: null };
  }
}

type ClientErrorPayload = {
  source: ClientErrorLogSource;
  message: string;
  name: string;
  digest: string | null;
  stack: string | null;
  authState: string;
  href: string | null;
  userAgent: string | null;
  timestamp: string;
  uid: string | null;
  email: string | null;
};

/**
 * Fire-and-forget persist. Intentionally does not throw to callers.
 * Reasoning: error boundaries often fire because Firestore already failed
 * (e.g. permission-error). Awaiting a write here could hang or throw again
 * inside the recovery UI. Console logging remains the guaranteed local trail.
 */
function persistClientError(payload: ClientErrorPayload): void {
  try {
    const apps = getApps();
    if (apps.length === 0) {
      console.warn('[portal-client-error] skip Firestore persist — no Firebase app');
      return;
    }

    const db = getFirestore(apps[0]);
    void addDoc(collection(db, 'client_errors'), {
      source: payload.source,
      message: truncate(payload.message, MAX_MESSAGE_CHARS) ?? '',
      name: payload.name,
      digest: payload.digest,
      stack: truncate(payload.stack, MAX_STACK_CHARS),
      authState: payload.authState,
      href: payload.href,
      userAgent: payload.userAgent,
      timestamp: payload.timestamp,
      uid: payload.uid,
      email: payload.email,
    }).catch((err) => {
      console.error('[portal-client-error] Firestore persist failed', err);
    });
  } catch (err) {
    console.error('[portal-client-error] Firestore persist setup failed', err);
  }
}

export function logClientError(
  source: ClientErrorLogSource,
  error: Error & { digest?: string },
): void {
  const { uid, email } = resolveUidEmail();

  const payload: ClientErrorPayload = {
    source,
    message: error.message,
    name: error.name,
    digest: error.digest ?? null,
    stack: error.stack ?? null,
    authState: describeAuthState(),
    href: typeof window !== 'undefined' ? window.location.href : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    timestamp: new Date().toISOString(),
    uid,
    email,
  };

  // Structured so App Hosting / browser consoles can filter on the prefix.
  console.error('[portal-client-error]', payload);

  persistClientError(payload);
}
