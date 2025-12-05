import { loadStripe, Stripe } from '@stripe/stripe-js';

// Stripe publishable key from environment or localStorage
const getStripeKey = (): string | undefined => {
  // Check localStorage first (user can set via UI)
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('stripe_publishable_key');
    if (localKey) return localKey;
  }
  
  // Check environment variable
  return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY;
};

const stripeKey = getStripeKey();

export const isStripeConfigured = !!stripeKey;

// Initialize Stripe
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = async (): Promise<Stripe | null> => {
  if (!stripeKey) {
    console.warn('Stripe publishable key not configured');
    return null;
  }

  if (!stripePromise) {
    stripePromise = loadStripe(stripeKey);
  }

  return stripePromise;
};

// Plan IDs mapping (these should match your Stripe Product/Price IDs)
export const STRIPE_PLAN_IDS: Record<string, { monthly: string; annual: string }> = {
  essential: {
    monthly: 'price_essential_monthly', // Replace with your actual Stripe Price ID
    annual: 'price_essential_annual',
  },
  professional: {
    monthly: 'price_professional_monthly', // Replace with your actual Stripe Price ID
    annual: 'price_professional_annual',
  },
  // Enterprise is custom pricing, handled separately
};

