import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface SubscriptionPlan {
  id: string;
  planId: 'essential' | 'professional' | 'enterprise';
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  annualTotal: number;
  isActive: boolean;
}

/**
 * Get all active subscription plans from database
 */
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  if (!isSupabaseConfigured || !supabase) {
    console.error('⚠️ Supabase not configured - cannot fetch pricing');
    throw new Error('Pricing service not available - Supabase not configured');
  }

  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('monthly_price', { ascending: true });

    if (error) {
      console.error('Error fetching subscription plans:', error);
      throw new Error(`Failed to fetch pricing from database: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.error('No subscription plans found in database');
      throw new Error('No pricing plans available. Please contact support.');
    }

    return data.map(plan => ({
      id: plan.id,
      planId: plan.plan_id as 'essential' | 'professional' | 'enterprise',
      name: plan.name,
      monthlyPrice: parseFloat(plan.monthly_price),
      annualPrice: parseFloat(plan.annual_price),
      annualTotal: parseFloat(plan.annual_total),
      isActive: plan.is_active,
    }));
  } catch (error: any) {
    console.error('Error fetching subscription plans:', error);
    throw error; // Re-throw to let calling code handle it
  }
};

/**
 * Get a specific subscription plan by plan_id
 */
export const getSubscriptionPlan = async (
  planId: 'essential' | 'professional' | 'enterprise',
  interval: 'month' | 'year'
): Promise<number> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Pricing service not available - Supabase not configured');
  }

  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('plan_id', planId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('Error fetching subscription plan:', error);
      throw new Error(`Failed to fetch pricing for ${planId} ${interval} plan: ${error?.message || 'Plan not found'}`);
    }

    if (interval === 'month') {
      return parseFloat(data.monthly_price);
    } else {
      return parseFloat(data.annual_price);
    }
  } catch (error: any) {
    console.error('Error fetching subscription plan:', error);
    throw error; // Re-throw to let calling code handle it
  }
};

/**
 * Get all plans as a price map (for backward compatibility)
 */
export const getPlanPrices = async (): Promise<Record<string, Record<'month' | 'year', number>>> => {
  const plans = await getSubscriptionPlans();
  
  const prices: Record<string, Record<'month' | 'year', number>> = {};
  
  plans.forEach(plan => {
    prices[plan.planId] = {
      month: plan.monthlyPrice,
      year: plan.annualPrice,
    };
  });

  return prices;
};


