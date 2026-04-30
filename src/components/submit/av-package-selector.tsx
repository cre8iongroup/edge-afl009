'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Submission, AVSelection } from '@/lib/types';
import {
  getPackagesForSessionType,
  getAddOnsForSessionType,
  getPricingTier,
  applyMultiplier,
  formatPrice,
  type AVPackage,
} from '@/lib/av-packages';
import { useSubmissions } from '@/components/submissions-provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertTriangle, Lock, Check } from 'lucide-react';
import AVCheckoutButton from './av-checkout-button';

const tierBadgeConfig: Record<string, { className: string; icon: React.ElementType }> = {
  Standard: { className: 'border-blue-500/50   text-blue-600   bg-blue-500/10',   icon: Clock          },
  Late:     { className: 'border-amber-500/50  text-amber-600  bg-amber-500/10',  icon: AlertTriangle  },
  Final:    { className: 'border-orange-500/50 text-orange-600 bg-orange-500/10', icon: AlertTriangle  },
  Closed:   { className: 'border-red-500/50    text-red-600    bg-red-500/10',    icon: Lock           },
};

const sessionTypeLabel: Record<Submission['sessionType'], string> = {
  workshop: 'Workshop',
  reception: 'Reception',
  'info-session': 'Info Session',
};

// ─── Locked read-only view ────────────────────────────────────────────────────

function AVLockedView({ avSelection }: { avSelection: AVSelection }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <div>
          <p className="font-semibold text-green-700">AV Package Confirmed</p>
          <p className="text-xs text-muted-foreground">
            Locked {new Date(avSelection.lockedAt).toLocaleDateString('en-US', { dateStyle: 'long' })}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Package</p>
          <p className="text-sm font-semibold">{avSelection.packageName}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pricing Tier</p>
          <p className="text-sm">{avSelection.pricingTier}</p>
        </div>
        {avSelection.addOns.length > 0 && (
          <div className="space-y-1 sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Add-ons</p>
            <p className="text-sm">{avSelection.addOns.join(', ')}</p>
          </div>
        )}
        <div className="space-y-1 sm:col-span-2 border-t pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Order Total</p>
          <p className="text-lg font-bold">{formatPrice(avSelection.orderTotal)}</p>
        </div>

        {/* ─── Stripe payment reference — renders only after Block 2 webhook writes these fields ─── */}
        {avSelection.stripePaymentIntentId && (
          <div className="space-y-1 sm:col-span-2 border-t pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment Reference</p>
            <p className="text-sm font-mono text-muted-foreground">{avSelection.stripePaymentIntentId}</p>
            {avSelection.stripeReceiptUrl && (
              <a
                href={avSelection.stripeReceiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View receipt ↗
              </a>
            )}
          </div>
        )}
      </div>

      {/* Always visible — regardless of Stripe fields */}
      <p className="text-xs text-muted-foreground">
        Need to update your order?{' '}
        <a
          href="mailto:connect@cre8iongroup.com"
          className="font-medium text-primary hover:underline"
        >
          Contact our team at connect@cre8iongroup.com
        </a>
      </p>
    </div>
  );
}

// ─── Main selector ────────────────────────────────────────────────────────────

type AVPackageSelectorProps = {
  submission: Submission;
};

export default function AVPackageSelector({ submission }: AVPackageSelectorProps) {
  const { updateSubmission } = useSubmissions();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Derive locked state reactively from the submission prop.
  // Using useState + useEffect ensures the component re-renders when Firestore
  // pushes the updated document even if the parent's object reference is stale.
  const [isLocked, setIsLocked] = useState(
    !!(submission.avSelected && submission.avSelection)
  );

  useEffect(() => {
    if (submission.avSelected && submission.avSelection) {
      setIsLocked(true);
    }
  }, [submission.avSelected, submission.avSelection]);

  const pricingTier = useMemo(() => getPricingTier(), []);
  const packages = useMemo(() => getPackagesForSessionType(submission.sessionType), [submission.sessionType]);
  const addOns = useMemo(() => getAddOnsForSessionType(submission.sessionType), [submission.sessionType]);

  const [selectedPackageId, setSelectedPackageId] = useState<string>(packages[0]?.id ?? '');
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);

  // Show locked read-only view once confirmed
  if (isLocked && submission.avSelection) {
    return <AVLockedView avSelection={submission.avSelection} />;
  }

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);

  const packageFinalPrice = selectedPackage
    ? applyMultiplier(selectedPackage.basePrice, pricingTier.multiplier)
    : 0;

  const addOnItems = addOns.filter((a) => selectedAddOnIds.includes(a.id));
  const addOnsTotal = addOnItems.reduce(
    (sum, a) => sum + applyMultiplier(a.price, pricingTier.multiplier),
    0
  );
  const orderTotal = packageFinalPrice + addOnsTotal;

  const toggleAddOn = (id: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (!selectedPackage) return;
    setIsLoading(true);

    const avSelection: AVSelection = {
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
      basePrice: selectedPackage.basePrice,
      pricingTier: pricingTier.name,
      multiplier: pricingTier.multiplier,
      finalPrice: packageFinalPrice,
      addOns: addOnItems.map((a) => a.label),
      addOnsTotal,
      orderTotal,
      lockedAt: new Date().toISOString(),
      sessionType: submission.sessionType,
    };

    try {
      await updateSubmission({ ...submission, avSelected: true, paymentComplete: true, avSelection });
      toast({
        title: 'AV Package Confirmed',
        description: `${selectedPackage.name} has been locked in. Total: ${formatPrice(orderTotal)}`,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Something went wrong',
        description: 'Could not save your AV selection. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const TierIcon = tierBadgeConfig[pricingTier.name]?.icon ?? Clock;
  const tierClassName = tierBadgeConfig[pricingTier.name]?.className ?? '';

  return (
    <div className="space-y-6">

      {/* Session type context */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Packages for:</span>
        <Badge variant="secondary">{sessionTypeLabel[submission.sessionType]}</Badge>
      </div>

      {/* Pricing tier urgency banner */}
      <div className={cn('flex items-start gap-3 rounded-lg border p-4', tierClassName)}>
        <TierIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold text-sm">{pricingTier.label}</p>
          <p className="text-xs mt-0.5">{pricingTier.description}</p>
        </div>
      </div>

      {pricingTier.isClosed ? (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-center gap-3 p-5">
            <Lock className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-600 font-medium">
              AV package registration is closed. Please contact the ALPFA team for assistance.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Package selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Select a Package
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {packages.map((pkg) => {
                const finalPrice = applyMultiplier(pkg.basePrice, pricingTier.multiplier);
                const isSelected = pkg.id === selectedPackageId;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => {
                      setSelectedPackageId(pkg.id);
                      // Auto-deselect any add-ons that are already included in the newly selected package
                      setSelectedAddOnIds((prev) =>
                        prev.filter((addOnId) => {
                          const addOn = addOns.find((a) => a.id === addOnId);
                          return !(addOn?.includedInPackages?.includes(pkg.id) ?? false);
                        })
                      );
                    }}
                    className={cn(
                      'relative flex flex-col gap-3 rounded-lg border p-4 text-left transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                        : 'border-border bg-background hover:border-primary/40 hover:bg-accent/50'
                    )}
                  >
                    {isSelected && (
                      <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <div>
                      <p className="font-semibold">{pkg.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{pkg.description}</p>
                    </div>
                    <ul className="space-y-1">
                      {pkg.includes.map((item) => (
                        <li key={item} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/60" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-2 border-t">
                      <p className="font-bold text-base">
                        {pkg.basePrice === 0 ? 'Free' : formatPrice(finalPrice)}
                      </p>
                      {pricingTier.multiplier > 1 && pkg.basePrice > 0 && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatPrice(pkg.basePrice)} base
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add-ons */}
          {addOns.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Add-ons <span className="font-normal normal-case">(Optional)</span>
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {addOns.map((addon) => {
                  const isIncludedInPackage = addon.includedInPackages?.includes(selectedPackage?.id ?? '') ?? false;
                  const isChecked = !isIncludedInPackage && selectedAddOnIds.includes(addon.id);
                  const addonPrice = applyMultiplier(addon.price, pricingTier.multiplier);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => { if (!isIncludedInPackage) toggleAddOn(addon.id); }}
                      disabled={isIncludedInPackage}
                      className={cn(
                        'flex items-center gap-3 rounded-md border p-3 text-left text-sm transition-all',
                        isIncludedInPackage
                          ? 'cursor-default border-border bg-muted/40 opacity-60'
                          : isChecked
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border bg-background hover:border-primary/40 hover:bg-accent/50'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          isIncludedInPackage
                            ? 'border-muted-foreground/40 bg-muted'
                            : isChecked
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground'
                        )}
                      >
                        {isChecked && <Check className="h-3 w-3" />}
                      </span>
                      <span className="flex-1">{addon.label}</span>
                      {isIncludedInPackage ? (
                        <span className="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700">
                          Included in your package
                        </span>
                      ) : (
                        <span className="shrink-0 font-medium tabular-nums">
                          +{formatPrice(addonPrice)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Order summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{selectedPackage?.name ?? '—'}</span>
                <span className="tabular-nums font-medium">
                  {selectedPackage?.basePrice === 0 ? 'Free' : formatPrice(packageFinalPrice)}
                </span>
              </div>
              {addOnItems.map((a) => (
                <div key={a.id} className="flex justify-between text-muted-foreground">
                  <span>{a.label}</span>
                  <span className="tabular-nums">+{formatPrice(applyMultiplier(a.price, pricingTier.multiplier))}</span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2 font-bold text-base">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(orderTotal)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Checkout button — isolated for Stripe swap */}
          <AVCheckoutButton
            onConfirm={handleConfirm}
            disabled={!selectedPackage}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
}
