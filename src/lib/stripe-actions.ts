'use server';

import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';
import type { Submission } from '@/lib/types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function createStripeCheckoutSession(
  sessions: Submission[],
  userEmail: string,
  sessionIds: string[],
): Promise<{ url: string | null; error?: string }> {
  try {
    // Build one line item per session
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = sessions
      .filter((s) => s.avSelection)
      .map((s) => {
        const av = s.avSelection!;
        const addOnSummary = av.addOns?.length
          ? av.addOns.join(', ')
          : 'No add-ons';
        return {
          price_data: {
            currency: 'usd',
            unit_amount: av.orderTotal, // already in cents
            product_data: {
              name: s.title,
              description: `${av.packageName} — ${addOnSummary}`,
            },
          },
          quantity: 1,
        };
      });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: userEmail,
      success_url: 'https://alpfa26.cre8ionedge.com/order?success=true',
      cancel_url: 'https://alpfa26.cre8ionedge.com/order',
      metadata: {
        sessionIds: sessionIds.join(','),
        source: 'alf009-edge',
      },
    });

    // Optimistic Firestore writes — mark sessions as pending before redirect
    const db = getFirestore(adminApp);
    const now = new Date().toISOString();
    await Promise.all(
      sessionIds.map((id) =>
        db.doc(`submissions/${id}`).update({
          paymentMethod: 'stripe',
          paymentStatus: 'pending',
          orderFinalizedAt: now,
        })
      )
    );

    console.log('✅ Stripe Checkout Session created:', session.id);
    return { url: session.url };
  } catch (error) {
    console.error('❌ Stripe Checkout Session creation failed:', error);
    return {
      url: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
