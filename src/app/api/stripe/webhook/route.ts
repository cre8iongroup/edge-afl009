// POST /api/stripe/webhook
// Verifies Stripe webhook signatures and processes checkout.session.completed events.
// Raw body is required for signature verification — Next.js App Router reads it via req.text().
// No bodyParser config export needed in App Router (that's Pages Router syntax).

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';
import { sendPaymentConfirmedEmail } from '@/lib/actions';
import type { Submission } from '@/lib/types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ Stripe webhook: missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('❌ Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Only handle checkout.session.completed — ignore all others
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const checkoutSession = event.data.object as Stripe.Checkout.Session;
  const rawSessionIds = checkoutSession.metadata?.sessionIds ?? '';

  if (!rawSessionIds) {
    console.error('❌ Stripe webhook: no sessionIds in metadata');
    return NextResponse.json({ error: 'Missing sessionIds metadata' }, { status: 400 });
  }

  const firestoreSessionIds = rawSessionIds.split(',').map((id) => id.trim());
  const paymentIntentId = checkoutSession.payment_intent as string | null;
  const paidAt = new Date().toISOString();

  const db = getFirestore(adminApp);

  // Write payment completion fields to each Firestore session doc
  await Promise.all(
    firestoreSessionIds.map((id) =>
      db.doc(`submissions/${id}`).update({
        paymentComplete: true,
        paymentStatus: 'complete',
        'avSelection.stripePaymentIntentId': paymentIntentId ?? null,
        'avSelection.stripePaidAt': paidAt,
      })
    )
  );

  console.log('✅ Stripe payment complete for sessions:', firestoreSessionIds);

  // Fetch each session doc and fire payment confirmation email
  const sessionDocs = await Promise.all(
    firestoreSessionIds.map((id) => db.doc(`submissions/${id}`).get())
  );

  await Promise.all(
    sessionDocs
      .filter((doc) => doc.exists)
      .map((doc) => {
        const submission = { id: doc.id, ...doc.data() } as Submission;
        return sendPaymentConfirmedEmail(submission);
      })
  );

  // TODO (follow-up): create Xero invoice for each session here
  // createXeroInvoice(sessions, partnerEmail, partnerName, orderId, sessionIds, 'manual')

  return NextResponse.json({ received: true }, { status: 200 });
}
