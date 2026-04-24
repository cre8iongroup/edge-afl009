// ─── AV Package Configuration ────────────────────────────────────────────────
// All base prices are in USD cents to avoid float math.
// Actual prices and package contents to be updated by client before launch.

/** AV package selection opens on this date. Before this, partners see a coming-soon message. */
export const AV_OPEN_DATE = new Date('2026-04-29T00:00:00');

export type AVPackage = {
  id: string;
  name: string;
  tier: 'starter' | 'pro' | 'elite';
  basePrice: number; // in cents
  description: string;
  includes: string[];
};

export type AVAddOn = {
  id: string;
  label: string;
  price: number; // in cents
  sessionTypes: Array<'workshop' | 'reception' | 'info-session'>;
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
      'Wireless lapel microphone',
      'Projector & 16:9 screen',
      'HDMI pass-through for presenter laptop',
      'Basic lighting setup',
    ],
  },
  {
    id: 'workshop-pro',
    name: 'Edge Pro',
    tier: 'pro',
    basePrice: 75000, // $750
    description: 'Elevated production for interactive or panel-style workshops.',
    includes: [
      'Everything in Edge Starter',
      'Panel table microphones (up to 4)',
      'Confidence monitor for presenter',
      'Live slide-clicker remote',
      'Session recording (MP4 delivered post-event)',
    ],
  },
  {
    id: 'workshop-elite',
    name: 'Edge Elite',
    tier: 'elite',
    basePrice: 150000, // $1,500
    description: 'Full production for flagship sessions requiring broadcast-quality output.',
    includes: [
      'Everything in Edge Pro',
      'Multi-camera shoot (2 cameras)',
      'Live stream feed to ALPFA channels',
      'Professional lighting rig',
      'Branded lower-thirds & transitions',
      'Dedicated A/V technician on-site',
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
      'Background music playback system',
      'Ambient uplighting (4 fixtures)',
      'Welcome slide display',
    ],
  },
  {
    id: 'reception-pro',
    name: 'Edge Pro',
    tier: 'pro',
    basePrice: 60000, // $600
    description: 'Enhanced atmosphere and clear audio for presentations or remarks.',
    includes: [
      'Everything in Edge Starter',
      'Podium with wired microphone',
      'Wireless handheld mic for Q&A',
      'Enhanced lighting package',
      'Background music mixing',
    ],
  },
  {
    id: 'reception-elite',
    name: 'Edge Elite',
    tier: 'elite',
    basePrice: 120000, // $1,200
    description: 'Premium event production — ideal for award ceremonies or keynote receptions.',
    includes: [
      'Everything in Edge Pro',
      'LED video wall or large-format display',
      'Event photographer coordination',
      'Branded signage integration',
      'Full lighting design & programmed cues',
      'Dedicated A/V technician on-site',
    ],
  },
];

export const infoSessionPackages: AVPackage[] = [
  {
    id: 'info-starter',
    name: 'Edge Starter',
    tier: 'starter',
    basePrice: 0,
    description: 'Clean, functional setup for information-driven presentations.',
    includes: [
      'Wireless handheld microphone',
      'Projector & screen',
      'HDMI pass-through',
    ],
  },
  {
    id: 'info-pro',
    name: 'Edge Pro',
    tier: 'pro',
    basePrice: 50000, // $500
    description: 'Professional setup with recording for post-event distribution.',
    includes: [
      'Everything in Edge Starter',
      'Podium microphone',
      'Session recording (MP4)',
      'Confidence monitor',
    ],
  },
  {
    id: 'info-elite',
    name: 'Edge Elite',
    tier: 'elite',
    basePrice: 100000, // $1,000
    description: 'Broadcast-ready production for high-visibility info sessions.',
    includes: [
      'Everything in Edge Pro',
      'Live stream capability',
      'Single-camera shoot',
      'Branded slide transitions',
      'On-site technician',
    ],
  },
];

export const avAddOns: AVAddOn[] = [
  {
    id: 'addon-transcription',
    label: 'Live Captioning / Transcription',
    price: 25000, // $250
    sessionTypes: ['workshop', 'info-session', 'reception'],
  },
  {
    id: 'addon-interpreting',
    label: 'Spanish Simultaneous Interpreting',
    price: 50000, // $500
    sessionTypes: ['workshop', 'info-session', 'reception'],
  },
  {
    id: 'addon-extra-camera',
    label: 'Additional Camera Angle',
    price: 30000, // $300
    sessionTypes: ['workshop', 'info-session'],
  },
  {
    id: 'addon-social-clip',
    label: 'Social Media Highlight Clip (30s edit)',
    price: 20000, // $200
    sessionTypes: ['workshop', 'reception'],
  },
  {
    id: 'addon-photo',
    label: 'Event Photography (2 hrs)',
    price: 40000, // $400
    sessionTypes: ['reception'],
  },
  {
    id: 'addon-dj',
    label: 'DJ / Music Curation (2 hrs)',
    price: 55000, // $550
    sessionTypes: ['reception'],
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
  multiplier: number; // e.g. 1.0, 1.15, 1.25
  label: string;      // short urgency label shown in UI
  description: string;
  deadlineLabel: string | null;
  isClosed: boolean;
};

/**
 * Returns the active pricing tier based on the current date.
 *
 * Standard  → now through May 15      → ×1.00
 * +15%      → May 16 – June 14        → ×1.15
 * +25%      → June 15 – June 26       → ×1.25
 * Closed    → after June 26           → no orders accepted
 */
export function getPricingTier(now: Date = new Date()): PricingTier {
  const y = now.getFullYear();

  const lateStart = new Date(y, 4, 16); // May 16
  const finalStart = new Date(y, 5, 15); // Jun 15
  const closeEnd = new Date(y, 5, 27); // Jun 27 00:00 → treats Jun 26 as last full day

  if (now >= closeEnd) {
    return {
      name: 'Closed',
      multiplier: 1.25,
      label: 'AV Orders Closed',
      description: 'The deadline has passed. Contact connect@cre8iongroup.com for assistance.',
      deadlineLabel: null,
      isClosed: true,
    };
  }

  if (now >= finalStart) {
    return {
      name: 'Final',
      multiplier: 1.25,
      label: 'Final Pricing — +25%',
      description: 'Final deadline is June 26. No AV orders accepted after this date.',
      deadlineLabel: 'Closes June 26',
      isClosed: false,
    };
  }

  if (now >= lateStart) {
    return {
      name: 'Late',
      multiplier: 1.15,
      label: 'Pricing Updated — +15%',
      description: 'Standard pricing has passed. Next increase on June 15.',
      deadlineLabel: 'Price increases June 15',
      isClosed: false,
    };
  }

  return {
    name: 'Standard',
    multiplier: 1.0,
    label: 'Standard Pricing',
    description: 'Submit by May 15 for the best rate. Price increases May 16.',
    deadlineLabel: 'Price increases May 16',
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
