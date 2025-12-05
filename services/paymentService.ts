import { getStripe } from './stripeClient';
import { supabase } from './supabaseClient';
import { getCurrentUser } from './authService';

export interface SubscriptionPlan {
  id: 'essential' | 'professional' | 'enterprise';
  name: string;
  priceId?: string;
  interval: 'month' | 'year';
}

// Backend API URL - configure this in your environment or settings
const getBackendApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const localUrl = localStorage.getItem('backend_api_url');
    if (localUrl) return localUrl;
  }
  return import.meta.env.VITE_BACKEND_API_URL || process.env.VITE_BACKEND_API_URL || '';
};

/**
 * Creates a Stripe Payment Intent for subscription
 * This calls your backend API to securely create payment intents
 */
export const createPaymentIntent = async (
  planId: 'essential' | 'professional',
  interval: 'month' | 'year',
  amount: number,
  customerEmail?: string
): Promise<{ clientSecret: string | null; paymentIntentId: string | null; error: string | null }> => {
  try {
    const user = await getCurrentUser();
    const email = customerEmail || user?.email;

    if (!email) {
      return { clientSecret: null, paymentIntentId: null, error: 'User email is required for checkout' };
    }

    const apiUrl = getBackendApiUrl();

    if (!apiUrl) {
      return {
        clientSecret: null,
        paymentIntentId: null,
        error: 'Backend API URL not configured. Please set VITE_BACKEND_API_URL environment variable or configure it in settings. See STRIPE_SETUP.md for details.'
      };
    }

    const response = await fetch(`${apiUrl}/api/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId,
        interval,
        amount: Math.round(amount * 100), // Convert to cents
        customerEmail: email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create payment intent' }));
      return { clientSecret: null, paymentIntentId: null, error: errorData.error || 'Failed to create payment intent' };
    }

    const { clientSecret, paymentIntentId, error } = await response.json();
    return { clientSecret: clientSecret || null, paymentIntentId: paymentIntentId || null, error: error || null };
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return { clientSecret: null, paymentIntentId: null, error: error.message || 'Failed to create payment intent' };
  }
};

/**
 * Redirects to Stripe Checkout
 */
export const redirectToCheckout = async (
  sessionId: string
): Promise<{ error: string | null }> => {
  try {
    const stripe = await getStripe();
    
    if (!stripe) {
      return { error: 'Stripe is not configured' };
    }

    const { error } = await stripe.redirectToCheckout({
      sessionId,
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error: any) {
    console.error('Error redirecting to checkout:', error);
    return { error: error.message || 'Failed to redirect to checkout' };
  }
};

/**
 * Creates a Stripe Checkout Session and redirects to checkout
 * This is the main function to use for subscriptions
 */
export const subscribeToPlan = async (
  planId: 'essential' | 'professional',
  interval: 'month' | 'year',
  customerEmail?: string
): Promise<{ error: string | null }> => {
  const { sessionId, error: sessionError } = await createCheckoutSession(planId, interval, customerEmail);

  if (sessionError || !sessionId) {
    return { error: sessionError || 'Failed to create checkout session' };
  }

  return await redirectToCheckout(sessionId);
};

/**
 * Get customer portal URL for managing subscription
 */
export const getCustomerPortalUrl = async (customerId: string): Promise<{ url: string | null; error: string | null }> => {
  try {
    // This should also be handled by your backend API
    // POST /api/create-portal-session
    // Body: { customerId: string }
    // Response: { url: string }
    
    return {
      url: null,
      error: 'Backend API endpoint not configured. Please set up a server endpoint for customer portal access.'
    };
  } catch (error: any) {
    console.error('Error getting customer portal URL:', error);
    return { url: null, error: error.message || 'Failed to get customer portal URL' };
  }
};

/**
 * Check subscription status for current user
 */
export const getSubscriptionStatus = async (): Promise<{
  plan: string | null;
  status: string | null;
  error: string | null;
}> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { plan: null, status: null, error: 'User not authenticated' };
    }

    // In production, fetch from your database or Stripe
    // This should be stored in your profiles/subscriptions table
    // For now, return null (no subscription)
    
    return { plan: null, status: null, error: null };
  } catch (error: any) {
    console.error('Error getting subscription status:', error);
    return { plan: null, status: null, error: error.message };
  }
};

