import { UserProfile } from '../types';
import { getActiveSubscription } from './subscriptionService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const TRIAL_PERIOD_DAYS = 30;

/**
 * Check if a user has an active subscription
 */
export const hasActiveSubscription = async (userId: string): Promise<boolean> => {
  try {
    const { subscription, error } = await getActiveSubscription(userId);
    if (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
    return subscription !== null && subscription.status === 'active';
  } catch (error) {
    console.error('Error in hasActiveSubscription:', error);
    return false;
  }
};

/**
 * Check if a user is within their 14-day trial period
 */
export const isInTrialPeriod = async (userId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    // Fetch user's profile to get created_at date
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single();

    if (error || !profile || !profile.created_at) {
      console.error('Error fetching profile for trial check:', error);
      return false;
    }

    // Calculate trial end date (14 days from signup)
    const signupDate = new Date(profile.created_at);
    const trialEndDate = new Date(signupDate);
    trialEndDate.setDate(trialEndDate.getDate() + TRIAL_PERIOD_DAYS);

    // Check if current date is before trial end date
    const now = new Date();
    return now < trialEndDate;
  } catch (error) {
    console.error('Error in isInTrialPeriod:', error);
    return false;
  }
};

/**
 * Check if a user is a superuser
 */
export const isSuperuser = (user: UserProfile | null): boolean => {
  return user?.role === 'superuser';
};

/**
 * Main access check function - determines if user can access features
 * 
 * Access priority:
 * 1. Superusers - always have access (bypass all checks)
 * 2. Users in 14-day trial period - have full access
 * 3. Users with active subscription - have access
 * 4. All others - no access
 */
export const canAccessFeature = async (
  user: UserProfile | null,
  feature?: string
): Promise<boolean> => {
  // If no user, deny access
  if (!user) {
    return false;
  }

  // ONLY superusers bypass all subscription checks
  if (isSuperuser(user)) {
    return true;
  }

  // Check if user is within 14-day trial period
  const inTrial = await isInTrialPeriod(user.id);
  if (inTrial) {
    return true;
  }

  // For all non-superuser roles, check if user has active subscription
  const hasSubscription = await hasActiveSubscription(user.id);
  return hasSubscription;
};

/**
 * Get detailed access status for a user
 */
export const checkSubscriptionAccess = async (
  user: UserProfile | null
): Promise<{ hasAccess: boolean; reason?: string; trialDaysRemaining?: number }> => {
  if (!user) {
    return { hasAccess: false, reason: 'User not authenticated' };
  }

  // Superusers always have access
  if (isSuperuser(user)) {
    return { hasAccess: true, reason: 'Superuser - bypasses all restrictions' };
  }

  // Check if user is in trial period
  const inTrial = await isInTrialPeriod(user.id);
  if (inTrial) {
    // Calculate days remaining in trial
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', user.id)
        .single();

      if (profile?.created_at) {
        const signupDate = new Date(profile.created_at);
        const trialEndDate = new Date(signupDate);
        trialEndDate.setDate(trialEndDate.getDate() + TRIAL_PERIOD_DAYS);
        const now = new Date();
        const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { 
          hasAccess: true, 
          reason: `Trial period - ${daysRemaining} days remaining`,
          trialDaysRemaining: daysRemaining
        };
      }
    } catch (error) {
      console.error('Error calculating trial days remaining:', error);
    }
    return { hasAccess: true, reason: 'Trial period - full access' };
  }

  // Check subscription
  const hasSubscription = await hasActiveSubscription(user.id);
  if (hasSubscription) {
    return { hasAccess: true, reason: 'Active subscription' };
  }

  return { hasAccess: false, reason: 'No active subscription or trial period expired' };
};

