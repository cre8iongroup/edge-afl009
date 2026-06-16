// ─── AV Package Configuration ────────────────────────────────────────────────
// All base prices are in USD cents to avoid float math.
import { PORTAL_CLOSE_DATE } from './deadlines';

/** AV package selection opens on this date. Before this, partners see a coming-soon message. */
export const AV_OPEN_DATE = new Date('2026-01-01T00:00:00');

export type AVPackage = {
  id: string;
  name: string;
  tier: 'starter' | 'pro' | 'elite' | 'lux';
  basePrice: number; // in cents
  description: string;
  includes: string[];
};

export type AVAddOn = {
  id: string;
  label: string;
  /** Alternate label shown in the UI when a specific package is selected (e.g. upgrade wording). */
  upgradeLabel?: string;
  price: number; // in cents — fallback if no deltaByPackage match
  /** Per-package delta prices in cents. When selectedPackage.id is a key here, use this value instead of price. */
  deltaByPackage?: Record<string, number>;
  sessionTypes: Array<'workshop' | 'reception' | 'info-session'>;
  /** Package IDs where this add-on is already included. Row is shown as non-interactive in the selector. */
  includedInPackages?: string[];
  /**
   * Add-on IDs or package IDs — at least one must be selected/active for this add-on to be available.
   * When none match, the row renders as locked with an explanatory note.
   */
  requiresAnyOf?: string[];
  /** When true, the pricing tier multiplier is NOT applied — price is used as-is regardless of early-bird status. */
  flatPrice?: boolean;
};

// ─── Per-session-type packages ─────────────────────────────────────────────

export const workshopPackages: AVPackage[] = [
  {
    id: 'workshop-starter',
    name: 'Edge Starter',
    tier: 'starter',
    basePrice: 0,
    description: 'Everything you need for a straightforward presenter-led session.',
    includes: [
      'Screen/Projector',
      'Sound System with Computer Audio',
      'One Wireless Microphone',
      'Two ALPFA Branded Scenic Cubes',
    ],
  },
  {
    id: 'workshop-pro',
    name: 'Edge Pro',
    tier: 'pro',
    basePrice: 90000, // $900
    description: 'Elevated production for interactive or panel-style workshops.',
    includes: [
      'Screen/Projector',
      'Sound System with Computer Audio',
      'Two Wireless Microphones',
      'Two Custom Branded Scenic Cubes',
    ],
  },
  {
    id: 'workshop-elite',
    name: 'Edge Elite',
    tier: 'elite',
    basePrice: 200000, // $2,000
    description: 'Full production for flagship sessions requiring broadcast-quality output.',
    includes: [
      'Screen/Projector',
      'Sound System with Computer Audio',
      'Four Wireless Microphones',
      'Four Custom Branded Scenic Cubes',
    ],
  },
];

export const receptionPackages: AVPackage[] = [
  {
    id: 'reception-starter',
    name: 'Edge Starter',
    tier: 'starter',
    basePrice: 0,
    description: 'Ambient audio and lighting for a professional reception atmosphere.',
    includes: [
      'Sound System with Computer Audio',
      'One Wireless Microphone',
    ],
  },
  {
    id: 'reception-pro',
    name: 'Edge Pro',
    tier: 'pro',
    basePrice: 280000, // $2,800
    description: 'Enhanced atmosphere and clear audio for presentations or remarks.',
    includes: [
      'Two Wireless Microphones',
      'Two Custom Branded Scenic Cubes',
      '(8) RGB Uplights — Static Colors',
      'Small Photo Backdrop',
    ],
  },
  {
    id: 'reception-elite',
    name: 'Edge Elite',
    tier: 'elite',
    basePrice: 500000, // $5,000
    description: 'Premium event production — ideal for award ceremonies or keynote receptions.',
    includes: [
      'Two Wireless Microphones',
      'Four Custom Branded Scenic Cubes',
      '(8) RGB Uplights — Static Colors',
      'Large Photo Backdrop',
      'Dedicated Room Tech',
    ],
  },
  {
    id: 'reception-lux',
    name: 'Edge Lux',
    tier: 'lux',
    basePrice: 1050000, // $10,500
    description: 'The ultimate reception experience with full lighting design and dedicated on-site support.',
    includes: [
      'Two Wireless Microphones',
      'Four Custom Branded Scenic Cubes',
      '(16) RGB Uplights — Static Colors',
      'LED Totem w/Custom Graphics',
      'Large Photo Backdrop',
      'Dedicated Room Tech',
      '(4) RGB Moving Head Lights w/stands',
    ],
  },
];

export const infoSessionPackages: AVPackage[] = [
  {
    id: 'info-starter',
    name: 'Edge Starter',
    tier: 'starter',
    basePrice: 0,
    description: 'Everything you need for a straightforward presenter-led session.',
    includes: [
      'Screen/Projector',
      'Sound System with Computer Audio',
      'One Wireless Microphone',
      'Two ALPFA Branded Scenic Cubes',
    ],
  },
  {
    id: 'info-pro',
    name: 'Edge Pro',
    tier: 'pro',
    basePrice: 90000, // $900
    description: 'Elevated production for interactive or panel-style workshops.',
    includes: [
      'Screen/Projector',
      'Sound System with Computer Audio',
      'Two Wireless Microphones',
      'Two Custom Branded Scenic Cubes',
    ],
  },
  {
    id: 'info-elite',
    name: 'Edge Elite',
    tier: 'elite',
    basePrice: 200000, // $2,000
    description: 'Full production for flagship sessions requiring broadcast-quality output.',
    includes: [
      'Screen/Projector',
      'Sound System with Computer Audio',
      'Four Wireless Microphones',
      'Four Custom Branded Scenic Cubes',
    ],
  },
];

// SCENIC ITEMS — TODO (pre-launch):
// The following add-on items will need:
// 1. Tooltip or modal with a short description and example photo for each scenic item
// 2. A separate details-capture flow for items that require partner assets
//    (e.g. logo files for branded cubes, head table covers, backdrops, totems)
// Items needing this treatment: Custom Branded Scenic Cubes, Custom Branded Head Table Cover,
// Custom LED Totem, 3'x2' Custom Backdrop, Large Photo Backdrop, LED Totem w/Custom Graphics
export const avAddOns: AVAddOn[] = [
  // ─── Workshop / Info Session add-ons ───────────────────────────────────────

  // PLACEHOLDER PRICING — confirm all delta amounts with Tim before launch
  {
    id: 'addon-upgrade-to-two-mics',
    label: 'Upgrade to Two Wireless Microphones',
    price: 40000, // delta price from Starter (adds 1 mic)
    sessionTypes: ['workshop', 'info-session'],
    includedInPackages: ['workshop-pro', 'workshop-elite', 'info-pro', 'info-elite'],
    flatPrice: true,
  },
  {
    id: 'addon-upgrade-to-four-mics',
    label: 'Upgrade to Four Wireless Microphones',
    deltaByPackage: {
      'workshop-starter': 120000,
      'workshop-pro':      80000,
      'info-starter':     120000,
      'info-pro':          80000,
    },
    price: 120000, // fallback price if no deltaByPackage match
    sessionTypes: ['workshop', 'info-session'],
    includedInPackages: ['workshop-elite', 'info-elite'],
    flatPrice: true,
  },
  {
    id: 'addon-head-table',
    label: 'Custom Branded Head Table Cover',
    price: 20000, // $200
    sessionTypes: ['workshop', 'info-session'],
    flatPrice: true,
  },
  {
    id: 'addon-led-totem',
    label: 'Custom LED Totem',
    price: 200000, // $2,000
    sessionTypes: ['workshop', 'info-session'],
    flatPrice: true,
  },

  // PLACEHOLDER PRICING — confirm all delta amounts with Tim before launch
  {
    id: 'addon-upgrade-to-two-cubes',
    label: 'Upgrade to Two Custom Branded Scenic Cubes',
    price: 60000, // upgrading from 2 generic ALPFA cubes (Starter only)
    sessionTypes: ['workshop', 'info-session'],
    includedInPackages: ['workshop-pro', 'workshop-elite', 'info-pro', 'info-elite'],
    flatPrice: true,
  },
  {
    id: 'addon-upgrade-to-four-cubes',
    label: 'Upgrade to Four Custom Branded Scenic Cubes',
    deltaByPackage: {
      'workshop-starter': 120000,
      'workshop-pro':      60000,
      'info-starter':     120000,
      'info-pro':          60000,
    },
    price: 120000, // fallback
    sessionTypes: ['workshop', 'info-session'],
    includedInPackages: ['workshop-elite', 'info-elite'],
    flatPrice: true,
  },
  {
    id: 'addon-backdrop-small',
    label: "3'x2' Custom Backdrop",
    price: 22500, // PLACEHOLDER PRICING — confirm with Tim before launch
    sessionTypes: ['workshop', 'info-session'],
    flatPrice: true,
  },

  // ─── Reception add-ons ─────────────────────────────────────────────────────
  {
    id: 'addon-16-uplights',
    label: '(16) RGB Uplights — Static Colors',
    price: 400000, // $4,000
    sessionTypes: ['reception'],
    includedInPackages: ['reception-lux'],
    flatPrice: true,
  },
  {
    id: 'addon-75-tv',
    label: '75" TV with Stand',
    price: 200000, // $2,000
    sessionTypes: ['reception'],
    flatPrice: true,
  },
  {
    id: 'addon-led-totem-reception',
    label: 'LED Totem w/Custom Graphics',
    price: 200000, // $2,000
    sessionTypes: ['reception'],
    includedInPackages: ['reception-lux'],
    flatPrice: true,
  },
  {
    id: 'addon-large-backdrop',
    label: 'Large Photo Backdrop',
    price: 60000, // $600
    sessionTypes: ['reception'],
    includedInPackages: ['reception-elite', 'reception-lux'],
    flatPrice: true,
  },
  {
    id: 'addon-moving-heads',
    label: '(4) RGB Moving Head Lights w/stands',
    price: 320000, // $3,200
    sessionTypes: ['reception'],
    includedInPackages: ['reception-lux'],
    flatPrice: true,
  },
  {
    id: 'addon-small-backdrop-reception',
    label: 'Small Photo Backdrop',
    price: 30000, // $300
    sessionTypes: ['reception'],
    includedInPackages: ['reception-pro', 'reception-elite', 'reception-lux'],
    flatPrice: true,
  },
  {
    id: 'addon-dedicated-room-tech',
    label: 'Dedicated Room Tech',
    price: 60000, // $600
    sessionTypes: ['reception'],
    includedInPackages: ['reception-elite', 'reception-lux'],
    flatPrice: true,
  },
  {
    id: 'addon-photo-booth',
    label: 'Branded Photo Booth Kiosk',
    price: 100000, // $1,000
    sessionTypes: ['reception'],
    requiresAnyOf: [
      'addon-small-backdrop-reception',
      'addon-large-backdrop',
      'reception-pro',
      'reception-elite',
      'reception-lux',
    ],
    flatPrice: true,
  },

  // ─── Workshop-only add-ons ─────────────────────────────────────────────────
  {
    id: 'addon-ai-translation',
    label: 'AI Translation',
    price: 80000, // $800
    sessionTypes: ['workshop'],
    flatPrice: true,
  },
];

// ─── Package lookup by session type ──────────────────────────────────────────

export function getPackagesForSessionType(
  sessionType: 'workshop' | 'reception' | 'info-session'
): AVPackage[] {
  if (sessionType === 'workshop') return workshopPackages;
  if (sessionType === 'reception') return receptionPackages;
  return infoSessionPackages;
}

export function getAddOnsForSessionType(
  sessionType: 'workshop' | 'reception' | 'info-session'
): AVAddOn[] {
  return avAddOns.filter((a) => a.sessionTypes.includes(sessionType));
}

// ─── Date-driven pricing tiers ────────────────────────────────────────────────

export type PricingTier = {
  name: string;
  multiplier: number; // e.g. 0.75, 1.0
  label: string;      // short urgency label shown in UI
  description: string;
  deadlineLabel: string | null;
  isClosed: boolean;
};

/**
 * Returns the active pricing tier based on the current date.
 *
 * Early Bird → now through May 29 2026  → ×0.75 (25% off)
 * Standard   → May 30 – June 26 2026   → ×1.00
 * Closed     → after June 26 2026      → no orders accepted
 */
export function getPricingTier(now: Date = new Date()): PricingTier {
  const standardStart = new Date(2026, 4, 30); // May 30 2026
  const closeEnd      = PORTAL_CLOSE_DATE;      // Jun 27 00:00 → treats Jun 26 as last full day (see deadlines.ts)

  if (now >= closeEnd) {
    return {
      name: 'Closed',
      multiplier: 1.0,
      label: 'AV Orders Closed',
      description: 'The deadline has passed. Contact connect@cre8iongroup.com for assistance.',
      deadlineLabel: null,
      isClosed: true,
    };
  }

  if (now >= standardStart) {
    return {
      name: 'Standard',
      multiplier: 1.0,
      label: 'Standard Pricing',
      description: 'Submit by June 26 — AV orders close after this date.',
      deadlineLabel: 'Orders close June 26',
      isClosed: false,
    };
  }

  return {
    name: 'Early Bird',
    multiplier: 0.75,
    label: 'Early Bird — 25% Off',
    description: 'Save 25% — Early Bird pricing ends May 29.',
    deadlineLabel: 'Early Bird ends May 29',
    isClosed: false,
  };
}

// ─── Price helpers ────────────────────────────────────────────────────────────

/** Apply pricing tier multiplier and round to nearest cent. */
export function applyMultiplier(basePrice: number, multiplier: number): number {
  return Math.round(basePrice * multiplier);
}

/** Format cents as a USD string, e.g. 75000 → "$750.00". */
export function formatPrice(cents: number): string {
  if (cents === 0) return 'Included';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

// ─── Order consolidation ──────────────────────────────────────────────────────

/**
 * Consolidates package includes and selected add-on labels into a single
 * "what you're getting" list. Some add-ons replace package items (upgrades),
 * others are purely additive. See inline comments for each rule.
 */
export function consolidateOrderItems(
  packageIncludes: string[],
  addOnLabels: string[]
): string[] {
  let items = [...packageIncludes];

  // ── Priority flags ──────────────────────────────────────────────────────
  // If both mic upgrade tiers are somehow selected, four-mic wins.
  // If both cube upgrade tiers are somehow selected, four-cube wins.
  const hasFourMics  = addOnLabels.some(a => a === 'Upgrade to Four Wireless Microphones');
  const hasTwoMics   = addOnLabels.some(a => a === 'Upgrade to Two Wireless Microphones');
  const hasFourCubes = addOnLabels.some(a => a === 'Upgrade to Four Custom Branded Scenic Cubes');
  const hasTwoCubes  = addOnLabels.some(a => a === 'Upgrade to Two Custom Branded Scenic Cubes');
  const hasLargeBackdrop = addOnLabels.some(a => a === 'Large Photo Backdrop');
  const has16Uplights    = addOnLabels.some(a => a === '(16) RGB Uplights — Static Colors');

  // ── Mic upgrade (replace any existing mic include) ───────────────────────
  if (hasFourMics) {
    items = items.filter(i => !i.includes('Wireless Microphone'));
    items.push('Four Wireless Microphones');
  } else if (hasTwoMics) {
    items = items.filter(i => !i.includes('Wireless Microphone'));
    items.push('Two Wireless Microphones');
  }

  // ── Cube upgrade (replace any existing cube include) ────────────────────
  if (hasFourCubes) {
    items = items.filter(i => !i.includes('Scenic Cubes'));
    items.push('Four Custom Branded Scenic Cubes');
  } else if (hasTwoCubes) {
    items = items.filter(i => !i.includes('Scenic Cubes'));
    items.push('Two Custom Branded Scenic Cubes');
  }

  // ── Uplights upgrade (16 replaces 8, no "Upgrade to" prefix) ────────────
  if (has16Uplights) {
    items = items.filter(i => !i.includes('RGB Uplights'));
    items.push('(16) RGB Uplights — Static Colors');
  }

  // ── Large backdrop (replaces small if present, additive if no backdrop) ──
  if (hasLargeBackdrop) {
    items = items.filter(i => !i.includes('Photo Backdrop'));
    items.push('Large Photo Backdrop');
  }

  // ── All remaining additive add-ons ───────────────────────────────────────
  // Skip any add-ons already handled above as upgrades
  const handledLabels = new Set([
    'Upgrade to Four Wireless Microphones',
    'Upgrade to Two Wireless Microphones',
    'Upgrade to Four Custom Branded Scenic Cubes',
    'Upgrade to Two Custom Branded Scenic Cubes',
    '(16) RGB Uplights — Static Colors',
    'Large Photo Backdrop',
  ]);

  for (const label of addOnLabels) {
    if (!handledLabels.has(label)) {
      items.push(label);
    }
  }

  return items;
}
