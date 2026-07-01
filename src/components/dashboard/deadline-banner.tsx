'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { isPortalClosed } from '@/lib/deadlines';

/**
 * Pre-deadline informational banner for the partner dashboard.
 *
 * Visible:  regular-role partners only, while the portal is still open.
 * Hidden:   automatically once isPortalClosed() returns true (the portal gate
 *           messaging takes over at that point).
 * Dismiss:  session-only — state is not persisted; banner reappears on refresh.
 */
export default function DeadlineBanner() {
  const [dismissed, setDismissed] = useState(false);

  // Hide once the portal has closed — the dashboard gate message replaces this
  if (isPortalClosed()) return null;
  if (dismissed) return null;

  return (
    <div
      role="alert"
      className="relative flex items-start gap-3 rounded-lg border border-amber-400/60 bg-amber-50 px-4 py-3.5 text-amber-900"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />

      <p className="text-sm leading-relaxed">
        <span className="font-semibold">Please note updated deadlines:&nbsp;</span>
        All presenter headshots and bios are due by{' '}
        <span className="font-semibold">June 22</span>. All session orders must be
        finalized by <span className="font-semibold">July 7</span>. Any orders not
        placed by the deadline risk forfeiture of your session placement.
      </p>

      <button
        type="button"
        aria-label="Dismiss deadline reminder"
        onClick={() => setDismissed(true)}
        className="ml-auto shrink-0 rounded p-0.5 text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
