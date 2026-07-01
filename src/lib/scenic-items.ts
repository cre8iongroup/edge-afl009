// ─── Scenic Items Utility ─────────────────────────────────────────────────────
// Constants and helpers for identifying scenic items across AV packages and
// add-ons, and tracking their production status.

import type { Submission } from '@/lib/types';
import { getPackagesForSessionType } from '@/lib/av-packages';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Generic ALPFA-branded cubes — no custom design work required. */
export const ALPFA_BRANDED_CUBE_STRINGS = new Set([
  'Two ALPFA Branded Scenic Cubes',
]);

/** All scenic strings that can appear in a package's includes array. */
export const SCENIC_PACKAGE_INCLUDES = new Set([
  'Two ALPFA Branded Scenic Cubes',
  'Two Custom Branded Scenic Cubes',
  'Four Custom Branded Scenic Cubes',
  'Small Photo Backdrop',
  'Large Photo Backdrop',
  '(8) RGB Uplights — Static Colors',
  '(16) RGB Uplights — Static Colors',
  'LED Totem w/Custom Graphics',
]);

/** All scenic strings that can appear in avSelection.addOns. */
export const SCENIC_ADDON_LABELS = new Set([
  'Upgrade to Two Custom Branded Scenic Cubes',
  'Upgrade to Four Custom Branded Scenic Cubes',
  'Custom Branded Head Table Cover',
  'Custom LED Totem',
  "3'x2' Custom Backdrop",
  '(16) RGB Uplights — Static Colors',
  'LED Totem w/Custom Graphics',
  'Large Photo Backdrop',
  'Small Photo Backdrop',
]);

/** Scenic status dropdown values in display order. */
export const SCENIC_STATUS_OPTIONS = [
  'To Do',
  'Needs Partner Logo',
  'In Progress',
  'Ready for Convention',
] as const;

/** Priority order for default sorting — lower index = higher priority. */
export const SCENIC_STATUS_SORT_ORDER: Record<string, number> = {
  'To Do':                 1,
  'Needs Partner Logo':    2,
  'In Progress':           3,
  'Ready for Convention':  4,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export type ScenicItems = {
  included: string[];
  addOns: string[];
  hasCustom: boolean;
};

/**
 * Extracts scenic items from a submission's AV package and add-ons.
 *
 * - `included`: scenic items from the base package definition
 * - `addOns`: scenic add-ons the partner purchased
 * - `hasCustom`: true if any item requires custom design work
 *   (i.e. is NOT generic ALPFA-branded cubes)
 */
export function getScenicItems(submission: Submission): ScenicItems {
  const result: ScenicItems = { included: [], addOns: [], hasCustom: false };

  if (!submission.avSelected || !submission.avSelection) return result;

  const { packageId, sessionType } = submission.avSelection;

  // Look up the package definition to get its includes array
  const packages = getPackagesForSessionType(sessionType);
  const pkg = packages.find(p => p.id === packageId);

  if (pkg) {
    result.included = pkg.includes.filter(item => SCENIC_PACKAGE_INCLUDES.has(item));
  }

  // Filter add-ons to scenic items only
  if (submission.avSelection.addOns) {
    result.addOns = submission.avSelection.addOns.filter(item => SCENIC_ADDON_LABELS.has(item));
  }

  // Check if any item requires custom work
  const allItems = [...result.included, ...result.addOns];
  result.hasCustom = allItems.some(item => !ALPFA_BRANDED_CUBE_STRINGS.has(item));

  return result;
}
