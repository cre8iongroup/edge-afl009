// POST /api/stripe/webhook
// Verifies Stripe webhook signatures and processes checkout.session.completed events.
// Raw body is required for signature verification — Next.js App Router reads it via req.text().
// No bodyParser config export needed in App Router (that's Pages Router syntax).

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';
import { sendPaymentConfirmedEmail } from '@/lib/actions';
import { createXeroInvoice } from '@/lib/xero-actions';
import { getAuthenticatedXeroClient } from '@/lib/xero';
import { Invoice, Payment } from 'xero-node';
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

  // ─── Xero: create AUTHORISED invoice and record payment ─────────────────────
  try {
    const xeroSessionDocs = await Promise.all(
      firestoreSessionIds.map((id) => db.doc(`submissions/${id}`).get())
    );
    const xeroSessions = xeroSessionDocs
      .filter((doc) => doc.exists)
      .map((doc) => ({ id: doc.id, ...doc.data() } as Submission));

    if (xeroSessions.length === 0) {
      console.warn('⚠️ Xero: no session docs found — skipping invoice creation');
    } else {
      const firstSession = xeroSessions[0];
      const isWorkshop = firstSession.sessionType === 'workshop';
      const partnerEmail = isWorkshop
        ? (firstSession.presenterPocEmail ?? firstSession.presenterEmail ?? '')
        : (firstSession.pocEmail ?? '');
      const partnerName = firstSession.companyName ?? '';

      const xeroResult = await createXeroInvoice(
        xeroSessions,
        partnerEmail,
        partnerName,
        checkoutSession.id,
        firestoreSessionIds,
        'stripe',
        Invoice.StatusEnum.AUTHORISED,
      );

      if (xeroResult.success && xeroResult.invoiceId) {
        const { xero, tenantId } = await getAuthenticatedXeroClient();
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        await xero.accountingApi.createPayment(tenantId, {
          invoice: { invoiceID: xeroResult.invoiceId },
          account: { code: '022' },
          amount: (checkoutSession.amount_total ?? 0) / 100,
          date: today,
          reference: paymentIntentId ?? undefined,
          type: Payment.PaymentTypeEnum.ACCRECPAYMENT,
        });
        console.log('✅ Xero payment recorded for invoice:', xeroResult.invoiceId);
      } else if (!xeroResult.success) {
        console.error('❌ Xero invoice creation failed:', xeroResult.error);
      }
    }
  } catch (xeroErr) {
    console.error('❌ Xero block failed (non-fatal):', xeroErr);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
