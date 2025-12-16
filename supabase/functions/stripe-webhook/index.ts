// Supabase Edge Function: Stripe Webhook Handler
// This handles Stripe webhook events and auto-saves subscriptions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get Stripe secret key and webhook secret
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY not configured');
        }

        if (!webhookSecret) {
            console.warn('STRIPE_WEBHOOK_SECRET not configured - webhook signature verification will fail');
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        });

        // Get the raw body for signature verification
        const body = await req.text();
        const signature = req.headers.get('stripe-signature');

        if (!signature && webhookSecret) {
            return new Response(
                JSON.stringify({ error: 'No signature header' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verify webhook signature
        let event: Stripe.Event;
        try {
            if (webhookSecret && signature) {
                event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
            } else {
                // For development, parse without verification (not recommended for production)
                event = JSON.parse(body) as Stripe.Event;
                console.warn('⚠️ Webhook signature verification skipped - not secure for production!');
            }
        } catch (err: any) {
            console.error('Webhook signature verification failed:', err.message);
            return new Response(
                JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Supabase credentials not configured');
            return new Response(
                JSON.stringify({ error: 'Supabase not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Handle the event
        console.log('Received Stripe webhook event:', event.type);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;

            // Extract metadata
            const { planId, interval, userId } = session.metadata || {};

            if (!planId || !interval) {
                console.error('Missing planId or interval in session metadata:', session.metadata);
                return new Response(
                    JSON.stringify({ error: 'Missing metadata in checkout session' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Get the actual amount from Stripe session (more reliable than hardcoded prices)
            let amount = 0;

            // Try to get amount from session line items
            if (session.amount_total !== null && session.amount_total !== undefined) {
                amount = session.amount_total / 100; // Convert from cents to dollars
            } else if (session.amount_subtotal !== null && session.amount_subtotal !== undefined) {
                amount = session.amount_subtotal / 100; // Convert from cents to dollars
            } else {
                // Fallback to hardcoded prices if Stripe doesn't provide amount
                const PLAN_PRICES: Record<string, Record<string, number>> = {
                    essential: {
                        month: 2499, // $24.99/month
                        year: 25490, // $254.90/year = $21.24/month (15% discount)
                    },
                    professional: {
                        month: 4499, // $44.99/month
                        year: 45890, // $458.90/year = $38.24/month (15% discount)
                    },
                    enterprise: {
                        month: 49900, // $499/month
                        year: 510000, // $5,100/year = $425/month
                    },
                };

                const amountInCents = PLAN_PRICES[planId]?.[interval];
                if (!amountInCents) {
                    console.error(`Invalid plan/interval: ${planId}/${interval}`);
                    return new Response(
                        JSON.stringify({ error: `Invalid plan/interval: ${planId}/${interval}` }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
                amount = amountInCents / 100; // Convert to dollars
            }

            // Calculate next billing date
            const nextBillingDate = new Date();
            if (interval === 'month') {
                nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            } else {
                nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
            }

            // Save subscription to Supabase
            if (userId && userId !== 'anonymous') {
                try {
                    const { data: subscription, error: insertError } = await supabase
                        .from('subscriptions')
                        .insert([
                            {
                                user_id: userId,
                                plan: planId,
                                interval: interval,
                                status: 'active',
                                amount: amount,
                                currency: 'usd',
                                stripe_customer_id: session.customer as string || null,
                                stripe_subscription_id: session.subscription as string || null,
                                stripe_session_id: session.id,
                                next_billing_date: nextBillingDate.toISOString(),
                            },
                        ])
                        .select()
                        .single();

                    if (insertError) {
                        console.error('Error saving subscription:', insertError);
                        return new Response(
                            JSON.stringify({
                                error: 'Failed to save subscription',
                                details: insertError.message
                            }),
                            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                        );
                    }

                    // Update user profile with subscription info
                    await supabase
                        .from('profiles')
                        .update({
                            subscription_plan: planId,
                            subscription_status: 'active',
                            stripe_customer_id: session.customer as string || null,
                            stripe_subscription_id: session.subscription as string || null,
                        })
                        .eq('id', userId);

                    console.log('✅ Subscription saved successfully via webhook:', {
                        subscriptionId: subscription.id,
                        userId,
                        planId,
                        interval,
                        amount,
                    });

                    return new Response(
                        JSON.stringify({
                            received: true,
                            subscriptionId: subscription.id
                        }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                } catch (error: any) {
                    console.error('Error processing subscription:', error);
                    return new Response(
                        JSON.stringify({
                            error: 'Error processing subscription',
                            message: error.message
                        }),
                        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
            } else {
                console.warn('User ID is anonymous or missing, cannot save subscription');
                return new Response(
                    JSON.stringify({
                        received: true,
                        message: 'User ID missing, subscription not saved'
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        // Return success for other event types
        return new Response(
            JSON.stringify({ received: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error: any) {
        console.error('Webhook error:', error);
        return new Response(
            JSON.stringify({
                error: 'Webhook handler error',
                message: error.message || 'An unexpected error occurred',
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});

