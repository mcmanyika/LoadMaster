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

// Plan pricing
const PLAN_PRICES: Record<string, Record<'month' | 'year', number>> = {
  essential: {
    month: 24.98,
    year: 21.24, // per month, billed annually (15% discount on monthly price)
  },
  professional: {
    month: 44.98,
    year: 38.24, // per month, billed annually (15% discount on monthly price)
  },
  enterprise: {
    month: 499,
    year: 425, // per month, billed annually (15% discount on monthly price)
  },
};

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
    // Calculate amount if not provided
    const amount = subscriptionData.amount ||
      PLAN_PRICES[subscriptionData.plan]?.[subscriptionData.interval] || 0;

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

