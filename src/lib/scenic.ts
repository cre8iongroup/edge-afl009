// ─── Scenic Gate Configuration ────────────────────────────────────────────────
// Single source of truth for identifying which AV orders include custom scenic
// elements that require partner brand asset submission (logos, brand guidelines).
//
// Used by:
//   - /scenic page  — to determine if a partner has scenic sessions to display
//   - sidebar-nav   — to conditionally show the Scenic Assets nav item
//
// Date gating (SCENIC_CLOSE_DATE / isScenicClosed) lives in deadlines.ts.

import type { Submission } from './types';

// ─── Package IDs that include custom scenic elements ─────────────────────────
// Excludes workshop-starter and info-starter — those include generic ALPFA-branded
// cubes that require no partner assets.

export const SCENIC_PACKAGE_IDS = new Set([
  'workshop-pro',
  'workshop-elite',
  'info-pro',
  'info-elite',
  'reception-pro',
  'reception-elite',
  'reception-lux',
]);

// ─── Add-on label strings that represent scenic purchasable items ─────────────
// These are the exact strings stored in avSelection.addOns (human-readable labels,
// not add-on IDs — see av-packages.ts AVAddOn.label for source of truth).

export const SCENIC_ADDON_LABELS = new Set([
  'Upgrade to Two Custom Branded Scenic Cubes',
  'Upgrade to Four Custom Branded Scenic Cubes',
  'Custom Branded Head Table Cover',
  'Custom LED Totem',
  'LED Totem w/Custom Graphics',
  "3'x2' Custom Backdrop",
  'Large Photo Backdrop',
  'Small Photo Backdrop',
  'Branded Photo Booth Kiosk',
]);

// ─── Gate helper ──────────────────────────────────────────────────────────────

/**
 * Returns true if any submission in the array includes a scenic element —
 * either via a scenic package tier or a scenic add-on.
 *
 * Used to determine whether the Scenic Assets panel should be shown to a partner.
 */
export function hasScenic(submissions: Submission[]): boolean {
  return submissions.some(
    (s) =>
      s.avSelected &&
      s.avSelection &&
      (SCENIC_PACKAGE_IDS.has(s.avSelection.packageId) ||
        s.avSelection.addOns?.some((label) => SCENIC_ADDON_LABELS.has(label)))
  );
}
