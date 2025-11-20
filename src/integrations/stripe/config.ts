/**
 * Stripe Configuration
 * 
 * This file handles Stripe client-side configuration.
 * Server-side Stripe operations should be done in Supabase Edge Functions.
 */

// Get Stripe publishable key from environment variables
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Validate that the key is set
if (!STRIPE_PUBLISHABLE_KEY) {
  console.warn(
    '⚠️ VITE_STRIPE_PUBLISHABLE_KEY no está definida.\n\n' +
    'Para desarrollo local, crea un archivo .env.local con:\n' +
    'VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...\n\n' +
    'Obtén tu clave en: https://dashboard.stripe.com/test/apikeys'
  );
}

// Stripe configuration
export const stripeConfig = {
  publishableKey: STRIPE_PUBLISHABLE_KEY || '',
  // You can add more configuration here
  // currency: 'eur',
  // locale: 'es',
};

// Check if Stripe is properly configured
export const isStripeConfigured = (): boolean => {
  return !!STRIPE_PUBLISHABLE_KEY && !STRIPE_PUBLISHABLE_KEY.includes('your_');
};

