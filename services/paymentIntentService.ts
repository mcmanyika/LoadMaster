/**
 * Payment Intent Service
 * 
 * Creates Stripe Payment Intents for subscriptions via Supabase Edge Function
 * No separate backend server needed!
 */

import { supabase } from './supabaseClient';

interface CreateSubscriptionIntentParams {
  planId: 'essential' | 'professional' | 'enterprise';
  interval: 'month' | 'year';
  userId?: string;
}

interface PaymentIntentResponse {
  sessionId: string;
  url: string;
  amount: number;
  planId: string;
  interval: string;
}

/**
 * Create a subscription payment intent using Supabase Edge Function
 * This replaces the need for a separate backend server!
 */
export const createSubscriptionIntent = async (
  params: CreateSubscriptionIntentParams
): Promise<{ data: PaymentIntentResponse | null; error: string | null }> => {
  // Option 1: Use Supabase Edge Function (recommended - no separate backend!)
  const useEdgeFunction = import.meta.env.VITE_USE_EDGE_FUNCTION !== 'false';
  
  if (useEdgeFunction && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-intent', {
        body: {
          planId: params.planId,
          interval: params.interval,
          userId: params.userId,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        return {
          data: null,
          error: error.message || 'Failed to create payment intent',
        };
      }

      return { data: data as PaymentIntentResponse, error: null };
    } catch (error: any) {
      console.error('Error calling edge function:', error);
      return {
        data: null,
        error: error.message || 'Network error creating payment intent',
      };
    }
  }

  // Option 2: Fallback to separate backend server (if needed)
  const API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${API_URL}/api/create-subscription-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId: params.planId,
        interval: params.interval,
        userId: params.userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        data: null,
        error: errorData.error || errorData.message || 'Failed to create payment intent',
      };
    }

    const data: PaymentIntentResponse = await response.json();
    return { data, error: null };
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return {
      data: null,
      error: error.message || 'Network error creating payment intent',
    };
  }
};

