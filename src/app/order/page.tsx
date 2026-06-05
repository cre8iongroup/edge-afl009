'use client';

import { useState, useEffect } from 'react';

import AppLayout from '@/components/layout/app-layout';
import { useSubmissions } from '@/components/submissions-provider';
import { useUser } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { formatPrice, getPricingTier, getPackagesForSessionType, consolidateOrderItems } from '@/lib/av-packages';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, ShoppingCart, ExternalLink, CreditCard, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createXeroInvoice } from '@/lib/xero-actions';
import { createStripeCheckoutSession } from '@/lib/stripe-actions';

const sessionTypeLabel: Record<string, string> = {
  workshop:      'Workshop',
  reception:     'Reception',
  'info-session': 'Info Session',
};

export default function OrderPage() {
  const { user } = useUser();
  const { submissions } = useSubmissions();
  const { profile } = useUserProfile(user?.uid);
  const router = useRouter();
  const { toast } = useToast();

  const pricingTier = getPricingTier();

  const userEmail = user?.email?.toLowerCase();
  const userSubmissions = submissions.filter((s) =>
    s.userId === user?.uid ||
    (userEmail && (s.authorizedEmails ?? []).map(e => e.toLowerCase()).includes(userEmail))
  );

  // Sessions with AV confirmed but payment not yet captured
  const pendingPaymentSessions = userSubmissions.filter(
    (s) => s.avSelected === true && s.paymentComplete !== true
  );

  // Sessions where payment is already complete
  const paidSessions = userSubmissions.filter((s) => s.paymentComplete === true);

  // Grand total across all pending sessions that have a saved avSelection
  // TODO: recalculate at finalization using current pricingTier.multiplier
  const grandTotal = pendingPaymentSessions.reduce(
    (sum, s) => sum + (s.avSelection?.orderTotal ?? 0),
    0
  );

  // Detect if any pending session was confirmed under a different pricing tier
  const hasPricingMismatch = pendingPaymentSessions.some(
    (s) => s.avSelection && s.avSelection.pricingTier !== pricingTier.name
  );

  // All pending sessions are $0 — free confirmation flow
  const isFreeOrder = grandTotal === 0 && pendingPaymentSessions.length > 0;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderFinalized, setOrderFinalized] = useState(false);
  const [xeroResult, setXeroResult] = useState<{ invoiceNumber?: string } | null>(null);
  const [orderType, setOrderType] = useState<'manual' | 'free' | 'stripe' | null>(null);

  // True if all pending sessions already have a paymentMethod — order was finalized in a prior session
  const alreadyFinalized = pendingPaymentSessions.length > 0 &&
    pendingPaymentSessions.every((s) => s.paymentMethod != null);

  // Derive order type from state (in-session flow) or from Firestore data (returning user)
  const derivedOrderType = orderType ?? pendingPaymentSessions[0]?.paymentMethod ?? null;

  // Detect Stripe success redirect (?success=true) and show confirmation panel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setOrderType('stripe');
      setOrderFinalized(true);
    }
  }, []);

  async function handleRequestInvoice() {
    setIsSubmitting(true);
    try {
      const sessionIds = pendingPaymentSessions.map((s) => s.id);
      const result = await createXeroInvoice(
        pendingPaymentSessions,
        user?.email ?? '',
        user?.displayName ?? profile?.name ?? '',
        `INV-${Date.now()}`,
        sessionIds,
        'manual',
      );
      if (result.success) {
        setXeroResult({ invoiceNumber: result.invoiceNumber });
        setOrderType('manual');
        setOrderFinalized(true);
      } else {
        toast({ title: 'Invoice request failed', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFreeOrder() {
    setIsSubmitting(true);
    try {
      const sessionIds = pendingPaymentSessions.map((s) => s.id);
      const result = await createXeroInvoice(
        pendingPaymentSessions,
        user?.email ?? '',
        user?.displayName ?? profile?.name ?? '',
        `FREE-${Date.now()}`,
        sessionIds,
        'free',
      );
      if (result.success) {
        setXeroResult({ invoiceNumber: result.invoiceNumber });
        setOrderType('free');
        setOrderFinalized(true);
      } else {
        toast({ title: 'Order confirmation failed', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStripeCheckout() {
    setIsSubmitting(true);
    try {
      const sessionIds = pendingPaymentSessions.map((s) => s.id);
      const result = await createStripeCheckoutSession(
        pendingPaymentSessions,
        user?.email ?? '',
        sessionIds,
        window.location.origin,
      );
      if (result.url) {
        window.location.href = result.url;
      } else {
        toast({ title: 'Payment failed', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <AppLayout>
      <div className="flex flex-col gap-8 max-w-3xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-headline text-3xl font-semibold">Order Summary</h1>
            {pricingTier.name === 'Early Bird' && (
              <Badge className="border-green-500/50 bg-green-500/10 text-green-700 text-xs px-2.5 py-1">
                Early Bird Pricing Active — Save 25%
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Review your confirmed AV selections before placing your order.
          </p>
          {pricingTier.deadlineLabel && (
            <p className="text-sm text-muted-foreground">
              Pricing locks in at order placement.{' '}
              <span className="font-medium">{pricingTier.deadlineLabel}.</span>
            </p>
          )}
        </div>

        {/* ── Pricing mismatch warning ─────────────────────────────────── */}
        {hasPricingMismatch && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">
              <span className="font-semibold">Pricing has changed</span> since you confirmed one or
              more sessions. Your order will be placed at current{' '}
              <span className="font-semibold">{pricingTier.name}</span> pricing. Review your updated
              totals below.
            </p>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {pendingPaymentSessions.length === 0 && paidSessions.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-semibold">No confirmed AV selections yet.</p>
                <p className="text-sm text-muted-foreground">
                  Return to your dashboard to confirm your AV package for each session.
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Pending payment sessions ─────────────────────────────────── */}
        {pendingPaymentSessions.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sessions Awaiting Payment
            </h2>

            {pendingPaymentSessions.map((session) => {
              const av = session.avSelection;
              const lockedDate = av?.lockedAt
                ? new Date(av.lockedAt).toLocaleDateString('en-US', { dateStyle: 'long' })
                : null;
              const packages = getPackagesForSessionType(session.sessionType);
              const packageDetails = packages.find((p) => p.id === av?.packageId);
              const consolidatedItems = consolidateOrderItems(
                packageDetails?.includes ?? [],
                av?.addOns ?? []
              );

              return (
                <Card key={session.id}>
                  <CardContent className="p-5 space-y-4">
                    {/* Title + type */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <p className="font-semibold">{session.title}</p>
                        <Badge variant="secondary" className="text-xs">
                          {sessionTypeLabel[session.sessionType] ?? session.sessionType}
                        </Badge>
                      </div>
                      {av && (
                        <p className="text-lg font-bold tabular-nums shrink-0">
                          {formatPrice(av.orderTotal)}
                        </p>
                      )}
                    </div>

                    {av ? (
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Package
                          </p>
                          <p>{av.packageName}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Pricing Tier
                          </p>
                          <p>
                            {av.pricingTier}
                            {av.pricingTier !== pricingTier.name && (
                              <span className="ml-1.5 text-xs text-amber-600 font-medium">
                                (now {pricingTier.name})
                              </span>
                            )}
                          </p>
                        </div>
                        {consolidatedItems.length > 0 && (
                          <div className="space-y-0.5 sm:col-span-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              What You're Getting
                            </p>
                            <p className="text-muted-foreground">{consolidatedItems.join(', ')}</p>
                          </div>
                        )}
                        {lockedDate && (
                          <p className="text-xs text-muted-foreground sm:col-span-2">
                            Confirmed {lockedDate}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No AV selection data found.</p>
                    )}

                    {/* Edit link */}
                    <div className="border-t pt-3">
                      <Link
                        href={`/submit/${session.sessionType}/${session.id}?editAV=true`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Edit AV Selection
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}

        {/* ── Grand total + place order ────────────────────────────────── */}
        {pendingPaymentSessions.length > 0 && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Order Total
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Per-session line items */}
              <div className="space-y-2 text-sm">
                {pendingPaymentSessions.map((session) => (
                  <div key={session.id} className="flex justify-between">
                    <span className="truncate pr-4 text-muted-foreground">{session.title}</span>
                    <span className="tabular-nums shrink-0 font-medium">
                      {session.avSelection ? formatPrice(session.avSelection.orderTotal) : '—'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Grand total */}
              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Grand Total</span>
                <span className="tabular-nums">{formatPrice(grandTotal)}</span>
              </div>

              <p className="text-xs text-muted-foreground">
                {isFreeOrder
                  ? 'Your package is covered — no payment required to finalize.'
                  : 'Pricing is locked in when you place your order. Orders placed after May 29 will be charged at standard pricing.'}
              </p>

              {/* Payment options — conditional on free vs paid order */}
              {(orderFinalized || alreadyFinalized) ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-green-500/40 bg-green-500/10 p-5 text-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div className="space-y-1">
                    <p className="font-semibold text-green-800">
                      {derivedOrderType === 'stripe'
                        ? 'Payment Complete!'
                        : derivedOrderType === 'free'
                        ? 'Order Confirmed'
                        : 'Invoice Requested'}
                    </p>
                    <p className="text-sm text-green-700">
                      {derivedOrderType === 'stripe'
                        ? "Your payment was processed successfully. You're all set! Our team will be in touch with room assignment details by July 1."
                        : derivedOrderType === 'free'
                        ? "Your free order has been confirmed. We'll be in touch with next steps."
                        : 'Your invoice is on its way. Our team will follow up shortly with payment details and next steps.'}
                    </p>
                    {derivedOrderType !== 'stripe' && xeroResult?.invoiceNumber && (
                      <p className="text-xs text-muted-foreground pt-1">
                        {derivedOrderType === 'free' ? 'Confirmation reference:' : 'Invoice reference:'}{' '}
                        <span className="font-mono font-medium">{xeroResult.invoiceNumber}</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : isFreeOrder ? (
                <div className="space-y-3 pt-1">
                  <div className="flex items-start gap-3 rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-green-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-sm">Your AV package is included at no cost.</p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleFreeOrder}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming…</>
                    ) : (
                      'Confirm Free Order'
                    )}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Clicking confirm finalizes your AV selection. No payment is required.
                  </p>
                </div>

              ) : (
                <div className="grid gap-3 sm:grid-cols-2 pt-1">

                  {/* Card 1 — Pay by Card or ACH */}
                  <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="text-sm font-semibold">Pay by Card or ACH</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Secure online payment. Pricing locks in immediately upon completion.
                    </p>
                    <Button
                      className="w-full mt-auto"
                      onClick={handleStripeCheckout}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
                      ) : (
                        'Pay Now →'
                      )}
                    </Button>
                  </div>

                  {/* Card 2 — Pay by Check or Wire */}
                  <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="text-sm font-semibold">Pay by Check or Wire</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      We'll generate an invoice and send you payment instructions.
                    </p>
                    <Button
                      className="w-full mt-auto"
                      variant="outline"
                      onClick={handleRequestInvoice}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Requesting…</>
                      ) : (
                        'Request Invoice →'
                      )}
                    </Button>
                  </div>

                </div>

              )}
            </CardContent>
          </Card>
        )}

        {/* ── Paid sessions ────────────────────────────────────────────── */}
        {paidSessions.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Paid Sessions
              </h2>
            </div>

            {paidSessions.map((session) => {
              const av = session.avSelection;
              return (
                <Card key={session.id} className="border-green-500/30 bg-green-500/5">
                  <CardContent className="flex items-center justify-between gap-3 p-4 flex-wrap">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-semibold truncate">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {av?.packageName ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {av && (
                        <span className="text-sm font-medium tabular-nums">
                          {formatPrice(av.orderTotal)}
                        </span>
                      )}
                      <Badge className="border-green-500/50 bg-green-500/10 text-green-700">
                        Paid
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}


      </div>
    </AppLayout>
  );
}
