// Supabase Edge Function: Create Subscription Intent
// This replaces the need for a separate backend server!

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Parse request body
    const { planId, interval, userId } = await req.json();

    // Validate input
    if (!planId || !interval) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: planId and interval',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get prices from database - REQUIRED, no fallback
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase not configured - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
      return new Response(
        JSON.stringify({
          error: 'Server configuration error: Pricing service not available',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    let amount = 0;
    
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: plan, error } = await supabase
        .from('subscription_plans')
        .select('monthly_price, annual_price, annual_total')
        .eq('plan_id', planId)
        .eq('is_active', true)
        .single();
      
      if (error || !plan) {
        console.error('Failed to fetch price from database:', error);
        return new Response(
          JSON.stringify({
            error: `Pricing not found for plan: ${planId}. Please contact support.`,
            details: error?.message,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // For monthly: use monthly_price
      // For annual: use annual_total (total amount for the year, not monthly equivalent)
      const price = interval === 'month' 
        ? parseFloat(plan.monthly_price) 
        : parseFloat(plan.annual_total); // Use annual_total for the full year amount
      
      if (isNaN(price) || price <= 0) {
        console.error('Invalid price from database:', price);
        return new Response(
          JSON.stringify({
            error: `Invalid pricing for ${planId} ${interval} plan. Please contact support.`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      amount = Math.round(price * 100); // Convert to cents
    } catch (error: any) {
      console.error('Error fetching price from database:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch pricing from database. Please try again later.',
          details: error?.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    if (!amount) {
      return new Response(
        JSON.stringify({
          error: `Invalid plan or interval: ${planId}/${interval}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build metadata - all values must be strings for Stripe
    const metadata = {
      planId: String(planId),
      interval: String(interval),
      type: 'subscription',
      userId: userId || 'anonymous',
    };

    // Get frontend URL from environment or request
    // For local dev, check if request has origin header, otherwise use env var or default
    const requestOrigin = req.headers.get('origin') || req.headers.get('referer');
    const frontendUrl = Deno.env.get('FRONTEND_URL') ||
      (requestOrigin ? new URL(requestOrigin).origin : 'http://localhost:3000');

    // Stripe automatically replaces {CHECKOUT_SESSION_ID} with the actual session ID
    const successUrl = `${frontendUrl}/?payment=success&plan=${planId}&interval=${interval}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/?payment=cancelled`;

    console.log('Creating checkout session with redirect URLs:', {
      frontendUrl,
      successUrl,
      cancelUrl,
      planId,
      interval,
    });

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `LoadMaster ${planId} subscription`,
              description: `${interval === 'month' ? 'Monthly' : 'Annual'} billing`,
            },
            unit_amount: amount, // Amount in cents
            recurring: interval === 'month'
              ? {
                interval: 'month',
              }
              : {
                interval: 'year',
              },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      metadata: metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId || undefined,
    });

    console.log('Subscription checkout session created:', session.id);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
        amount: amount / 100, // Return in dollars for display
        planId,
        interval,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error creating subscription intent:', error);
    return new Response(
      JSON.stringify({
        error: 'Error creating checkout session',
        message: error.message || 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

