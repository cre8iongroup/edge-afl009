export type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'client' | 'internal' | 'regular';
};

export type Presenter = {
  id: string;           // client-generated UUID
  name: string;
  title: string;
  company: string;
  bio: string;          // 150 word max
  headshotUrl: string;  // Firebase Storage download URL — never base64
  email?: string;       // optional
  savedAt: string;      // ISO timestamp
};

export type AVSelection = {
  packageId: string;
  packageName: string;
  basePrice: number;        // cents
  pricingTier: string;      // e.g. 'Standard', 'Late', 'Final'
  multiplier: number;
  finalPrice: number;       // cents — package price after multiplier
  addOns: string[];         // add-on labels selected
  addOnsTotal: number;      // cents
  orderTotal: number;       // cents
  lockedAt: string;         // ISO timestamp
  sessionType: 'workshop' | 'reception' | 'info-session';
  // ─── Stripe fields — written by Block 2 webhook handler, absent during mock ───
  stripePaymentIntentId?: string;   // e.g. "pi_3Px..."
  stripeReceiptUrl?: string;        // Stripe-hosted receipt URL
  stripePaidAt?: string;            // ISO timestamp from Stripe event
};

export type Submission = {
  id: string;
  userId: string;
  sessionType: 'workshop' | 'reception' | 'info-session';
  title: string;
  description: string;
  status: 'phase_1' | 'phase_2' | 'phase_3' | 'phase_4';
  presentersAdded?: boolean;
  presenters?: Presenter[];         // Phase 2 full presenter profiles
  avSelected?: boolean;
  avSelection?: AVSelection;
  paymentComplete?: boolean;
  pillar: string;
  format: string;
  audience: string | string[];
  objectives: string[];
  cpe: boolean;
  createdAt: Date;
  preferredDate?: Date | string;
  preferredTime?: string;
  preferredDate2?: Date | string;
  preferredTime2?: string;
  preferredTimes?: string[];
  secondaryAudience?: string | string[];
  specialSetup?: string;
  presenterName?: string;
  presenterEmail?: string;
  presenterPocName?: string;
  presenterPocEmail?: string;
  presenterBio?: string;
  presenterHeadshot?: string;
};

    