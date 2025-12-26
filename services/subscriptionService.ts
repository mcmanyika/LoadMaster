import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface Subscription {
  id: string;
  userId: string;
  plan: 'essential' | 'professional' | 'enterprise';
  interval: 'month' | 'year';
  status: 'active' | 'canceled' | 'completed' | 'past_due';
  amount: number;
  currency: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSessionId?: string;
  startedAt: string;
  endedAt?: string;
  canceledAt?: string;
  nextBillingDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionData {
  plan: 'essential' | 'professional' | 'enterprise';
  interval: 'month' | 'year';
  amount: number;
  stripeSessionId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status?: 'active' | 'canceled' | 'completed' | 'past_due';
}

import { getPlanPrices, getSubscriptionPlan } from './pricingService';

/**
 * Save subscription to Supabase
 * Called after successful payment
 */
export const saveSubscription = async (
  userId: string,
  subscriptionData: CreateSubscriptionData
): Promise<{ subscription: Subscription | null; error: string | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured, skipping subscription save');
    return { subscription: null, error: 'Supabase not configured' };
  }

  try {
    // Check for existing subscription by stripe_session_id to prevent duplicates
    if (subscriptionData.stripeSessionId) {
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id, plan, interval, status')
        .eq('stripe_session_id', subscriptionData.stripeSessionId)
        .maybeSingle();
      
      if (existing) {
        console.log('⚠️ Subscription already exists for this session ID, skipping duplicate save:', {
          subscriptionId: existing.id,
          sessionId: subscriptionData.stripeSessionId,
          plan: existing.plan,
          interval: existing.interval,
        });
        // Return the existing subscription
        const { data: fullData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', existing.id)
          .single();
        
        if (fullData) {
          return {
            subscription: {
              id: fullData.id,
              userId: fullData.user_id,
              plan: fullData.plan as 'essential' | 'professional' | 'enterprise',
              interval: fullData.interval as 'month' | 'year',
              status: fullData.status as 'active' | 'canceled' | 'completed' | 'past_due',
              amount: parseFloat(fullData.amount),
              currency: fullData.currency || 'usd',
              stripeCustomerId: fullData.stripe_customer_id,
              stripeSubscriptionId: fullData.stripe_subscription_id,
              stripeSessionId: fullData.stripe_session_id,
              startedAt: fullData.started_at,
              endedAt: fullData.ended_at,
              canceledAt: fullData.canceled_at,
              nextBillingDate: fullData.next_billing_date,
              createdAt: fullData.created_at,
              updatedAt: fullData.updated_at,
            },
            error: null,
          };
        }
      }
    }

    // Get amount from database, fallback to provided amount or hardcoded prices
    let amount = subscriptionData.amount;
    
    if (!amount) {
      // Always get from database - no fallback
      try {
        amount = await getSubscriptionPlan(subscriptionData.plan, subscriptionData.interval);
      } catch (error) {
        console.error('Failed to fetch price from database:', error);
        return {
          subscription: null,
          error: `Failed to fetch pricing for ${subscriptionData.plan} ${subscriptionData.interval} plan. Please try again.`
        };
      }
      
      if (!amount || amount === 0) {
        return {
          subscription: null,
          error: `Invalid pricing for ${subscriptionData.plan} ${subscriptionData.interval} plan. Please contact support.`
        };
      }
    }

    // Calculate next billing date
    const nextBillingDate = new Date();
    if (subscriptionData.interval === 'month') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    // Insert subscription record
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([
        {
          user_id: userId,
          plan: subscriptionData.plan,
          interval: subscriptionData.interval,
          status: subscriptionData.status || 'active',
          amount: amount,
          currency: 'usd',
          stripe_customer_id: subscriptionData.stripeCustomerId,
          stripe_subscription_id: subscriptionData.stripeSubscriptionId,
          stripe_session_id: subscriptionData.stripeSessionId,
          next_billing_date: nextBillingDate.toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate key error (unique constraint violation)
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log('⚠️ Duplicate subscription detected, fetching existing:', error.message);
        
        // Fetch the existing subscription
        if (subscriptionData.stripeSessionId) {
          const { data: existing } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('stripe_session_id', subscriptionData.stripeSessionId)
            .single();
          
          if (existing) {
            console.log('✅ Found existing subscription, returning it:', existing.id);
            return {
              subscription: {
                id: existing.id,
                userId: existing.user_id,
                plan: existing.plan as 'essential' | 'professional' | 'enterprise',
                interval: existing.interval as 'month' | 'year',
                status: existing.status as 'active' | 'canceled' | 'completed' | 'past_due',
                amount: parseFloat(existing.amount),
                currency: existing.currency || 'usd',
                stripeCustomerId: existing.stripe_customer_id,
                stripeSubscriptionId: existing.stripe_subscription_id,
                stripeSessionId: existing.stripe_session_id,
                startedAt: existing.started_at,
                endedAt: existing.ended_at,
                canceledAt: existing.canceled_at,
                nextBillingDate: existing.next_billing_date,
                createdAt: existing.created_at,
                updatedAt: existing.updated_at,
              },
              error: null,
            };
          }
        }
      }

      console.error('❌ Error saving subscription to database:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          subscription: null,
          error: 'Subscriptions table not found. Please run the database migration: supabase_migrations/003_create_subscriptions_table.sql'
        };
      }

      return { subscription: null, error: error.message };
    }

    // Also update user profile with subscription info
    await updateUserProfileSubscription(
      userId,
      subscriptionData.plan,
      subscriptionData.stripeCustomerId,
      subscriptionData.stripeSubscriptionId
    );

    // Map database fields to TypeScript interface
    const subscription: Subscription = {
      id: data.id,
      userId: data.user_id,
      plan: data.plan as 'essential' | 'professional' | 'enterprise',
      interval: data.interval as 'month' | 'year',
      status: data.status as 'active' | 'canceled' | 'completed' | 'past_due',
      amount: parseFloat(data.amount),
      currency: data.currency || 'usd',
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
      stripeSessionId: data.stripe_session_id,
      startedAt: data.started_at,
      endedAt: data.ended_at,
      canceledAt: data.canceled_at,
      nextBillingDate: data.next_billing_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { subscription, error: null };
  } catch (error: any) {
    console.error('Error saving subscription:', error);
    return { subscription: null, error: error.message || 'Failed to save subscription' };
  }
};

/**
 * Update user profile with subscription information
 */
const updateUserProfileSubscription = async (
  userId: string,
  plan: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    await supabase
      .from('profiles')
      .update({
        subscription_plan: plan,
        subscription_status: 'active',
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Error updating user profile subscription:', error);
  }
};

/**
 * Get all subscriptions for a user
 */
export const getUserSubscriptions = async (
  userId: string
): Promise<{ subscriptions: Subscription[]; error: string | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    // Demo mode - return empty array
    return { subscriptions: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return { subscriptions: [], error: error.message };
    }

    const subscriptions: Subscription[] = (data || []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      plan: item.plan,
      interval: item.interval,
      status: item.status,
      amount: parseFloat(item.amount),
      currency: item.currency || 'usd',
      stripeCustomerId: item.stripe_customer_id,
      stripeSubscriptionId: item.stripe_subscription_id,
      stripeSessionId: item.stripe_session_id,
      startedAt: item.started_at,
      endedAt: item.ended_at,
      canceledAt: item.canceled_at,
      nextBillingDate: item.next_billing_date,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return { subscriptions, error: null };
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    return { subscriptions: [], error: error.message || 'Failed to fetch subscriptions' };
  }
};

/**
 * Get active subscription for a user
 */
export const getActiveSubscription = async (
  userId: string
): Promise<{ subscription: Subscription | null; error: string | null }> => {
  const { subscriptions, error } = await getUserSubscriptions(userId);

  if (error) {
    return { subscription: null, error };
  }

  const active = subscriptions.find((sub) => sub.status === 'active');
  return { subscription: active || null, error: null };
};

/**
 * Cancel a subscription
 */
export const cancelSubscription = async (
  subscriptionId: string
): Promise<{ error: string | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to cancel subscription' };
  }
};

