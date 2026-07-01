// ─── AV Status Utility ────────────────────────────────────────────────────────
// Single source of truth for deriving the operational AV status of a session.
// Used by the AV Orders table and anywhere else that needs to bucket a session's
// AV/payment state into an actionable label.

import type { Submission } from '@/lib/types';

export type AVStatusVariant = 'default' | 'destructive' | 'warning' | 'success' | 'muted';

export type AVStatusResult = {
  label: string;
  tooltip: string;
  variant: AVStatusVariant;
};

/**
 * Priority order for default sorting — lower index = higher priority.
 * Surfaces actionable sessions at the top of the AV Orders table.
 */
export const AV_STATUS_SORT_ORDER: Record<string, number> = {
  'Add-Ons Due':        0,
  'Not Submitted':      1,
  'Invoice Requested':  2,
  'Not Started':        3,
  'No Charge':          4,
  'Paid':               5,
};

export const AV_STATUS_LABELS = [
  'Not Started',
  'Add-Ons Due',
  'No Charge',
  'Paid',
  'Invoice Requested',
  'Not Submitted',
] as const;

/**
 * Maps the six known AV status labels to their badge variant.
 * Used both for computed results and admin-set overrides.
 */
const LABEL_VARIANT_MAP: Record<string, AVStatusVariant> = {
  'Not Started':        'muted',
  'Add-Ons Due':        'destructive',
  'No Charge':          'success',
  'Paid':               'success',
  'Invoice Requested':  'warning',
  'Not Submitted':      'destructive',
};

/**
 * Derives the operational AV status for a given session submission.
 *
 * If submission.avStatus is set (admin override), it is returned directly
 * with the matching variant. Otherwise the status is computed from the
 * AV order and payment fields.
 *
 * Evaluation order matters — PAID and INVOICE REQUESTED are checked before
 * ADD-ONS DUE so that active payment intent takes priority over package
 * structure. ADD-ONS DUE is checked before NO CHARGE to catch the edge case.
 */
export function getAVStatus(submission: Submission): AVStatusResult {
  // ── Admin override — manually set avStatus takes priority ──────────────
  if (submission.avStatus && typeof submission.avStatus === 'string' && submission.avStatus.trim()) {
    return {
      label: submission.avStatus,
      tooltip: 'AV status manually set by admin.',
      variant: LABEL_VARIANT_MAP[submission.avStatus] ?? 'default',
    };
  }

  const { avSelected, avSelection, paymentComplete, paymentStatus, paymentMethod } = submission;

  // 1. NOT STARTED — no AV order placed at all
  if (avSelected !== true || !avSelection) {
    return {
      label: 'Not Started',
      tooltip: 'Partner has not selected an AV package yet. Chase partner to log in and select a package.',
      variant: 'muted',
    };
  }

  // From here: avSelected === true AND avSelection exists

  // 2. PAID — payment confirmed (any order total)
  if (paymentStatus === 'complete') {
    return {
      label: avSelection.orderTotal === 0 ? 'No Charge' : 'Paid',
      tooltip: avSelection.orderTotal === 0
        ? 'Free package confirmed, no payment required. No action needed.'
        : 'Payment confirmed. No action needed.',
      variant: 'success',
    };
  }

  // 3. INVOICE REQUESTED — manual payment requested, awaiting confirmation
  //    (fires before ADD-ONS DUE so payment intent takes priority)
  if (
    paymentMethod === 'manual' &&
    paymentStatus === 'awaiting_manual'
  ) {
    return {
      label: 'Invoice Requested',
      tooltip:
        'Partner requested a manual invoice. Confirm the invoice was generated in Xero and follow up on payment receipt.',
      variant: 'warning',
    };
  }

  // 4. ADD-ONS DUE — free base package with paid add-ons, payment incomplete
  //    (checked before NO CHARGE to catch the edge case)
  if (
    avSelection.finalPrice === 0 &&
    avSelection.addOnsTotal > 0 &&
    paymentComplete !== true
  ) {
    return {
      label: 'Add-Ons Due',
      tooltip:
        'Free base package with paid add-ons selected. Partner selected a free package but added paid upgrades and has not completed payment. This may appear confirmed but payment is still required.',
      variant: 'destructive',
    };
  }

  // 5. NO CHARGE — zero-cost order, payment not yet marked complete
  if (avSelection.orderTotal === 0 && paymentComplete === true) {
    return {
      label: 'No Charge',
      tooltip: 'Free package confirmed, no payment required. No action needed.',
      variant: 'success',
    };
  }

  // 6. NOT SUBMITTED — catch-all for remaining unpaid
  if (paymentComplete !== true) {
    return {
      label: 'Not Submitted',
      tooltip:
        'AV package confirmed but partner never completed the order flow. Chase partner to return to portal and finalize their order.',
      variant: 'destructive',
    };
  }

  // Safety fallback (should never reach here)
  return {
    label: 'Not Started',
    tooltip: 'Unable to determine AV status.',
    variant: 'muted',
  };
}
