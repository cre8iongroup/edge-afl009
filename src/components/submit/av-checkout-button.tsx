'use client';

import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

type AVCheckoutButtonProps = {
  onConfirm: () => void;
  disabled?: boolean;
  isLoading?: boolean;
};

/**
 * STRIPE INTEGRATION POINT
 *
 * This component is intentionally isolated so the mock implementation
 * can be swapped for a real Stripe Checkout Session call without touching
 * any surrounding UI. When integrating Stripe:
 *
 *   1. Replace `onConfirm` call with a Server Action that creates a
 *      Stripe Checkout Session and redirects to session.url.
 *   2. Pass avSelection data to that action so you can attach metadata.
 *   3. On Stripe redirect success, the webhook handler should set
 *      avSelected: true and write avSelection to Firestore.
 *
 * Until then, `onConfirm` directly sets avSelected: true as a mock.
 */
export default function AVCheckoutButton({ onConfirm, disabled, isLoading }: AVCheckoutButtonProps) {
  return (
    <Button
      className="w-full"
      size="lg"
      onClick={onConfirm}
      disabled={disabled || isLoading}
    >
      <ShoppingCart className="mr-2 h-5 w-5" />
      {isLoading ? 'Processing…' : 'Confirm AV Package'}
    </Button>
  );
}
