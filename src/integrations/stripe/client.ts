/**
 * Stripe Client
 * 
 * Initializes and exports the Stripe client for client-side operations.
 * For server-side operations, use Supabase Edge Functions.
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { stripeConfig, isStripeConfigured } from './config';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get or create Stripe instance
 * Returns null if Stripe is not configured
 */
export const getStripe = async (): Promise<Stripe | null> => {
  if (!isStripeConfigured()) {
    console.warn('Stripe no está configurado. Por favor, configura VITE_STRIPE_PUBLISHABLE_KEY');
    return null;
  }

  if (!stripePromise) {
    stripePromise = loadStripe(stripeConfig.publishableKey);
  }

  return stripePromise;
};

/**
 * Initialize Stripe (call this once at app startup if needed)
 */
export const initStripe = (): void => {
  if (isStripeConfigured()) {
    getStripe();
  }
};

