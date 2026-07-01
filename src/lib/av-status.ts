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
 * Derives the operational AV status for a given session submission.
 * Evaluation order matters — ADD-ONS DUE must be checked before NO CHARGE,
 * and INVOICE REQUESTED must be checked before NOT SUBMITTED.
 */
export function getAVStatus(submission: Submission): AVStatusResult {
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

  // 2. ADD-ONS DUE — free base package with paid add-ons, payment incomplete
  //    (must be checked BEFORE No Charge to catch the edge case)
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

  // 3. NO CHARGE — zero-cost order, payment confirmed
  if (avSelection.orderTotal === 0 && paymentComplete === true) {
    return {
      label: 'No Charge',
      tooltip: 'Free package confirmed, no payment required. No action needed.',
      variant: 'success',
    };
  }

  // From here: orderTotal > 0 (real balance)

  // 4. PAID — real balance, payment confirmed
  if (avSelection.orderTotal > 0 && paymentStatus === 'complete') {
    return {
      label: 'Paid',
      tooltip: 'Payment confirmed. No action needed.',
      variant: 'success',
    };
  }

  // 5. INVOICE REQUESTED — manual payment requested, awaiting confirmation
  //    (must be checked BEFORE Not Submitted)
  if (
    avSelection.orderTotal > 0 &&
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

  // 6. NOT SUBMITTED — fallback for real balance, payment incomplete
  if (avSelection.orderTotal > 0 && paymentComplete !== true) {
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
