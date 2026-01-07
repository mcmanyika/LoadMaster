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

            // For annual subscriptions, Stripe charges the full year amount upfront
            // But we want to store the monthly equivalent in our database
            // For monthly subscriptions, we store the actual monthly price

            if (interval === 'year') {
                // For annual: always use the monthly equivalent from database
                try {
                    const { data: plan, error: planError } = await supabase
                        .from('subscription_plans')
                        .select('annual_price')
                        .eq('plan_id', planId)
                        .eq('is_active', true)
                        .single();

                    if (!planError && plan) {
                        amount = parseFloat(plan.annual_price); // Monthly equivalent for annual billing
                    } else {
                        console.error('Failed to fetch annual_price from database:', planError);
                        return new Response(
                            JSON.stringify({
                                error: 'Failed to fetch pricing from database',
                                details: planError?.message
                            }),
                            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                        );
                    }
                } catch (error: any) {
                    console.error('Error fetching annual_price from database:', error);
                    return new Response(
                        JSON.stringify({
                            error: 'Failed to fetch pricing from database',
                            details: error?.message
                        }),
                        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
            } else {
                // For monthly: use amount from Stripe session or database
                if (session.amount_total !== null && session.amount_total !== undefined) {
                    amount = session.amount_total / 100; // Convert from cents to dollars
                } else if (session.amount_subtotal !== null && session.amount_subtotal !== undefined) {
                    amount = session.amount_subtotal / 100; // Convert from cents to dollars
                } else {
                    // Fallback: Get monthly price from database
                    try {
                        const { data: plan, error: planError } = await supabase
                            .from('subscription_plans')
                            .select('monthly_price')
                            .eq('plan_id', planId)
                            .eq('is_active', true)
                            .single();

                        if (!planError && plan) {
                            amount = parseFloat(plan.monthly_price);
                        } else {
                            console.error('Failed to fetch monthly_price from database:', planError);
                            return new Response(
                                JSON.stringify({
                                    error: 'Failed to fetch pricing from database',
                                    details: planError?.message
                                }),
                                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                            );
                        }
                    } catch (error: any) {
                        console.error('Error fetching monthly_price from database:', error);
                        return new Response(
                            JSON.stringify({
                                error: 'Failed to fetch pricing from database',
                                details: error?.message
                            }),
                            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                        );
                    }
                }
            }

            // No fallback prices - must get from database
            // If database fetch fails, log error and use 0 (will be caught by validation below)

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
                    // Check for existing subscription by stripe_session_id to prevent duplicates
                    const { data: existing } = await supabase
                        .from('subscriptions')
                        .select('id, plan, interval, status')
                        .eq('stripe_session_id', session.id)
                        .maybeSingle();

                    if (existing) {
                        console.log('⚠️ Subscription already exists for this session ID, skipping duplicate save:', {
                            subscriptionId: existing.id,
                            sessionId: session.id,
                            plan: existing.plan,
                            interval: existing.interval,
                        });
                        return new Response(
                            JSON.stringify({
                                received: true,
                                subscriptionId: existing.id,
                                message: 'Subscription already exists'
                            }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                        );
                    }

                    // Mark referral as completed if user was referred
                    if (amount && userId) {
                        try {
                            // Dynamic import to avoid circular dependencies
                            const { markReferralCompleted } = await import('../../services/affiliateService');
                            await markReferralCompleted(userId, amount);
                        } catch (referralError) {
                            console.error('Error processing referral completion in webhook:', referralError);
                            // Don't fail subscription save if referral processing fails
                        }
                    }

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
                        // Check if it's a duplicate key error (unique constraint violation)
                        if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
                            console.log('⚠️ Duplicate subscription detected, fetching existing:', insertError.message);
                            // Fetch the existing subscription
                            const { data: existingSub } = await supabase
                                .from('subscriptions')
                                .select('id')
                                .eq('stripe_session_id', session.id)
                                .single();

                            if (existingSub) {
                                return new Response(
                                    JSON.stringify({
                                        received: true,
                                        subscriptionId: existingSub.id,
                                        message: 'Subscription already exists'
                                    }),
                                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                                );
                            }
                        }

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

                    // Mark referral as completed if user was referred
                    if (amount && userId) {
                        try {
                            // Find pending referral for this user
                            const { data: referral } = await supabase
                                .from('referrals')
                                .select('*')
                                .eq('referred_user_id', userId)
                                .eq('status', 'pending')
                                .maybeSingle();

                            if (referral) {
                                // Calculate commission (30% of first payment)
                                const commissionRate = 0.30;
                                const rewardAmount = amount * commissionRate;

                                // Update referral status
                                await supabase
                                    .from('referrals')
                                    .update({
                                        status: 'completed',
                                        reward_amount: rewardAmount,
                                        completed_at: new Date().toISOString()
                                    })
                                    .eq('id', referral.id);

                                console.log('✅ Referral marked as completed:', {
                                    referralId: referral.id,
                                    referrerId: referral.referrer_id,
                                    rewardAmount
                                });
                            }
                        } catch (referralError) {
                            console.error('Error processing referral completion in webhook:', referralError);
                            // Don't fail subscription save if referral processing fails
                        }
                    }

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

