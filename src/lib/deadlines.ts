// ─── Portal Deadline Configuration ───────────────────────────────────────────
// Single source of truth for all date gates used across the portal.
// All dates use local-time midnight for consistency with av-packages.ts.

/** Portal closes after this instant. July 8 00:00 = July 7 is the last full day. */
export const PORTAL_CLOSE_DATE = new Date(2026, 6, 8);

/** Scenic asset uploads (headshots, logos) remain open until this instant. July 10 EOD. */
export const SCENIC_CLOSE_DATE = new Date(2026, 6, 11);

/** Display-only: deadline shown in the pre-deadline banner. */
export const PRESENTER_DEADLINE = new Date(2026, 5, 22); // June 22

/** Display-only: deadline shown in the pre-deadline banner. Matches PORTAL_CLOSE_DATE. */
export const AV_DEADLINE = new Date(2026, 5, 27); // June 26 EOD

/**
 * Returns true once the portal ordering deadline has passed.
 * Controls: nav lockdown, dashboard gate, order summary gate.
 */
export function isPortalClosed(): boolean {
  return new Date() >= PORTAL_CLOSE_DATE;
}

/**
 * Returns true once the scenic asset upload window has closed.
 * Reserved for future use in presenter/headshot upload gating.
 */
export function isScenicClosed(): boolean {
  return new Date() >= SCENIC_CLOSE_DATE;
}
