import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Referral, AffiliateStats } from '../types';

/**
 * Get user's referral code
 */
export const getReferralCode = async (userId: string): Promise<string | null> => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured');
    return null;
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching referral code:', error);
    return null;
  }
  
  return data?.referral_code || null;
};

/**
 * Get affiliate statistics for a user
 */
export const getAffiliateStats = async (userId: string): Promise<AffiliateStats | null> => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured');
    return null;
  }
  
  // Get referral code
  const referralCode = await getReferralCode(userId);
  if (!referralCode) {
    return null;
  }
  
  // Get referral stats
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', userId);
  
  if (error) {
    console.error('Error fetching affiliate stats:', error);
    return null;
  }
  
  const totalReferrals = referrals?.length || 0;
  const completedReferrals = referrals?.filter(r => r.status === 'completed' || r.status === 'rewarded').length || 0;
  const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0;
  const totalRewards = referrals?.reduce((sum, r) => sum + (parseFloat(r.reward_amount) || 0), 0) || 0;
  
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  return {
    totalReferrals,
    completedReferrals,
    pendingReferrals,
    totalRewards,
    referralCode,
    referralLink: `${baseUrl}/signup?ref=${referralCode}`
  };
};

/**
 * Create a referral record
 */
export const createReferral = async (
  referrerId: string,
  referredUserId: string,
  referralCode: string
): Promise<{ referral: Referral | null; error: string | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { referral: null, error: 'Database not configured' };
  }
  
  // Prevent self-referrals
  if (referrerId === referredUserId) {
    console.warn('Self-referral prevented:', referrerId);
    return { referral: null, error: 'Cannot refer yourself' };
  }
  
  console.log('Creating referral record:', { referrerId, referredUserId, referralCode });
  
  try {
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_user_id: referredUserId,
        referral_code: referralCode,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) {
      // Check if table doesn't exist (migration not run)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Referrals table does not exist. Please run migration 062_add_affiliate_program.sql');
        return { referral: null, error: 'Referrals table not found. Migration may not be run.' };
      }
      // Check for unique constraint violation (user already referred)
      if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
        console.warn('Referral already exists for this user');
        return { referral: null, error: 'User already has a referral record' };
      }
      console.error('Error creating referral:', error);
      return { referral: null, error: error.message };
    }
    
    console.log('Successfully created referral record:', data.id);
    
    return { 
      referral: {
        id: data.id,
        referrerId: data.referrer_id,
        referredUserId: data.referred_user_id,
        referralCode: data.referral_code,
        status: data.status,
        rewardAmount: parseFloat(data.reward_amount) || 0,
        rewardType: data.reward_type,
        createdAt: data.created_at,
        completedAt: data.completed_at,
        rewardedAt: data.rewarded_at
      }, 
      error: null 
    };
  } catch (err: any) {
    console.error('Unexpected error creating referral:', err);
    return { referral: null, error: err.message || 'Failed to create referral' };
  }
};

/**
 * Get all referrals for a user
 */
export const getReferrals = async (userId: string): Promise<Referral[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('referrals')
    .select(`
      *,
      referrer:profiles!referrals_referrer_id_fkey(name, email),
      referred_user:profiles!referrals_referred_user_id_fkey(name, email)
    `)
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching referrals:', error);
    return [];
  }
  
  // Map the referrals and try to get names even if RLS blocks the join
  const referrals = await Promise.all((data || []).map(async (r: any) => {
    let referredUserName = r.referred_user?.name;
    let referredUserEmail = r.referred_user?.email;
    
    // If RLS blocked the profile access, try to get the name/email using RPC function
    if (!referredUserName && !referredUserEmail) {
      try {
        // Try using the RPC function that bypasses RLS
        const { data: userInfo, error: rpcError } = await supabase
          .rpc('get_referred_user_info', { referred_user_id: r.referred_user_id });
        
        if (!rpcError && userInfo && userInfo.length > 0) {
          referredUserName = userInfo[0].name;
          referredUserEmail = userInfo[0].email;
          console.log('Got referred user info from RPC:', { name: referredUserName, email: referredUserEmail });
        } else {
          // Fallback: Try direct query (might still be blocked by RLS)
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', r.referred_user_id)
            .single();
          
          if (!profileError && userProfile) {
            referredUserName = userProfile.name;
            referredUserEmail = userProfile.email;
          }
        }
      } catch (err) {
        console.log('Could not fetch referred user profile:', err);
      }
    }
    
    // Use name if available, otherwise use email prefix, otherwise use a generic label
    const displayName = referredUserName || 
                       (referredUserEmail ? referredUserEmail.split('@')[0] : null) ||
                       `User ${r.referred_user_id.substring(0, 8)}`;
    
    return {
      id: r.id,
      referrerId: r.referrer_id,
      referredUserId: r.referred_user_id,
      referralCode: r.referral_code,
      status: r.status,
      rewardAmount: parseFloat(r.reward_amount) || 0,
      rewardType: r.reward_type,
      createdAt: r.created_at,
      completedAt: r.completed_at,
      rewardedAt: r.rewarded_at,
      referrerName: r.referrer?.name,
      referredUserName: displayName
    };
  }));
  
  return referrals;
};

/**
 * Mark a referral as completed when subscription happens
 */
export const markReferralCompleted = async (
  referredUserId: string,
  subscriptionAmount: number
): Promise<{ success: boolean; error: string | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Database not configured' };
  }
  
  // Find pending referral for this user
  const { data: referral, error: findError } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_user_id', referredUserId)
    .eq('status', 'pending')
    .single();
  
  if (findError || !referral) {
    // No referral found, that's okay - user wasn't referred
    return { success: true, error: null };
  }
  
  // Calculate commission (30% of first payment)
  const commissionRate = 0.30;
  const rewardAmount = subscriptionAmount * commissionRate;
  
  // Update referral status
  const { error: updateError } = await supabase
    .from('referrals')
    .update({
      status: 'completed',
      reward_amount: rewardAmount,
      completed_at: new Date().toISOString()
    })
    .eq('id', referral.id);
  
  if (updateError) {
    console.error('Error marking referral as completed:', updateError);
    return { success: false, error: updateError.message };
  }
  
  return { success: true, error: null };
};

/**
 * Calculate commission amount
 */
export const calculateCommission = (subscriptionAmount: number, rate: number = 0.30): number => {
  return subscriptionAmount * rate;
};

/**
 * Save a referral code manually (for users who weren't referred during signup)
 */
export const saveReferralCode = async (
  userId: string,
  referralCode: string
): Promise<{ success: boolean; error: string | null; referrerName?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Database not configured' };
  }
  
  // Check if user already has a referrer
  const { data: profile } = await supabase
    .from('profiles')
    .select('referred_by')
    .eq('id', userId)
    .single();
  
  if (profile?.referred_by) {
    return { success: false, error: 'You already have a referrer and cannot change it' };
  }
  
  // Check if user already has a referral record
  const { data: existingReferral } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_user_id', userId)
    .maybeSingle();
  
  if (existingReferral) {
    return { success: false, error: 'You already have a referral record' };
  }
  
  // Normalize the referral code
  const normalizedCode = referralCode.toUpperCase().trim();
  console.log('Looking up referrer for manual save with code:', normalizedCode);
  
  // Find the referrer
  const referrer = await findReferrerByCode(normalizedCode);
  if (!referrer) {
    console.error('Referrer not found for code:', normalizedCode);
    return { success: false, error: 'Invalid referral code. Please check and try again. Make sure the code exists and is spelled correctly.' };
  }
  
  console.log('Referrer found for manual save:', referrer);
  
  // Prevent self-referrals
  if (referrer.id === userId) {
    return { success: false, error: 'You cannot refer yourself' };
  }
  
  // Update user's profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ referred_by: referrer.id })
    .eq('id', userId);
  
  if (updateError) {
    console.error('Error updating referred_by:', updateError);
    return { success: false, error: updateError.message };
  }
  
  // Create referral record
  const { referral, error: referralError } = await createReferral(referrer.id, userId, normalizedCode);
  
  if (referralError || !referral) {
    console.error('Error creating referral record:', referralError);
    // Rollback the profile update
    await supabase
      .from('profiles')
      .update({ referred_by: null })
      .eq('id', userId);
    return { success: false, error: referralError || 'Failed to create referral record' };
  }
  
  return { success: true, error: null, referrerName: referrer.name };
};

/**
 * Get referrer information for current user
 */
export const getReferrerInfo = async (userId: string): Promise<{ id: string; name: string; code: string } | null> => {
  if (!isSupabaseConfigured || !supabase) {
    console.log('Supabase not configured for getReferrerInfo');
    return null;
  }
  
  console.log('Getting referrer info for user:', userId);
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('referred_by')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching profile for referrer info:', error);
    return null;
  }
  
  console.log('Profile referred_by value:', profile?.referred_by);
  
  if (!profile?.referred_by) {
    console.log('No referred_by value found');
    return null;
  }
  
  // Get referrer's profile
  // Try direct query first
  let referrerProfile: any = null;
  let referrerError: any = null;
  
  const { data: directProfile, error: directError } = await supabase
    .from('profiles')
    .select('id, name, referral_code')
    .eq('id', profile.referred_by)
    .single();
  
  if (directError || !directProfile) {
    console.log('Direct query failed, trying to get referral code from referrals table...', directError);
    
    // If RLS is blocking the profile query, try to get the referral code from the referrals table
    // This should work because the user can view their own referral record
    const { data: referralRecord, error: referralRecordError } = await supabase
      .from('referrals')
      .select('referral_code, referrer_id')
      .eq('referred_user_id', userId)
      .maybeSingle();
    
    if (referralRecord && !referralRecordError) {
      console.log('Found referral record with code:', referralRecord.referral_code);
      // We have the referral code, but still need the name
      // Try to get name using the RPC function if available
      let referrerName = 'Referrer';
      let referrerCode = referralRecord.referral_code;
      
      // Try to get the referrer's name using the RPC function
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_profile_by_referral_code', { code: referrerCode });
        
        if (!rpcError && rpcData && rpcData.length > 0) {
          referrerName = rpcData[0].name;
          console.log('Got referrer name from RPC:', referrerName);
        }
      } catch (rpcErr) {
        console.log('RPC function not available, using placeholder name');
      }
      
      return {
        id: profile.referred_by,
        name: referrerName,
        code: referrerCode
      };
    }
    
    referrerError = directError;
  } else {
    referrerProfile = directProfile;
  }
  
  // If still no profile, try to get minimal info using a workaround
  if (!referrerProfile) {
    // Try to get referral code from referrals table as fallback
    const { data: referralRecord } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referred_user_id', userId)
      .maybeSingle();
    
    const referralCode = referralRecord?.referral_code || '';
    
    console.warn('Could not fetch full referrer profile due to RLS. Using minimal info with code from referrals table.');
    return {
      id: profile.referred_by,
      name: 'Referrer', // Placeholder - RLS is blocking full profile access
      code: referralCode
    };
  }
  
  if (referrerError) {
    console.error('Error fetching referrer profile:', referrerError);
    // Try to get code from referrals table
    const { data: referralRecord } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referred_user_id', userId)
      .maybeSingle();
    
    return {
      id: profile.referred_by,
      name: 'Referrer',
      code: referralRecord?.referral_code || ''
    };
  }
  
  console.log('Found referrer info:', referrerProfile);
  
  return {
    id: referrerProfile.id,
    name: referrerProfile.name,
    code: referrerProfile.referral_code || ''
  };
};

/**
 * Find referrer by referral code
 */
export const findReferrerByCode = async (referralCode: string): Promise<{ id: string; name: string } | null> => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured, cannot find referrer');
    return null;
  }
  
  const normalizedCode = referralCode.toUpperCase().trim();
  console.log('Looking up referrer with code:', normalizedCode);
  
  // Try using the database function first (bypasses RLS)
  try {
    const { data: functionData, error: functionError } = await supabase
      .rpc('get_profile_by_referral_code', { code: normalizedCode });
    
    if (!functionError && functionData && functionData.length > 0) {
      const profile = functionData[0];
      console.log('Found referrer via function:', { id: profile.id, name: profile.name, code: profile.referral_code });
      return { id: profile.id, name: profile.name };
    }
  } catch (rpcError: any) {
    console.log('RPC function not available or failed, trying direct query:', rpcError.message);
  }
  
  // Fallback to direct query (might be blocked by RLS)
  let { data, error } = await supabase
    .from('profiles')
    .select('id, name, referral_code')
    .eq('referral_code', normalizedCode)
    .maybeSingle();
  
  // If that fails, try without maybeSingle to see if it's a multiple results issue
  if (error || !data) {
    console.log('First query failed or no data, trying alternative query...');
    const { data: allMatches, error: altError } = await supabase
      .from('profiles')
      .select('id, name, referral_code')
      .eq('referral_code', normalizedCode);
    
    if (altError) {
      console.error('Alternative query also failed:', altError);
      console.error('Error details:', { code: altError.code, message: altError.message, details: altError.details, hint: altError.hint });
      
      // If RLS is blocking, suggest running the migration
      if (altError.code === '42501' || altError.message?.includes('permission') || altError.message?.includes('policy')) {
        console.error('RLS policy is blocking the query. Please run migration 064_allow_referral_code_lookup.sql');
      }
    } else if (allMatches && allMatches.length > 0) {
      console.log('Found matches with alternative query:', allMatches);
      data = allMatches[0];
      error = null;
    }
  }
  
  if (error) {
    // Check if column doesn't exist
    if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
      console.warn('referral_code column not found. Please run migration 062_add_affiliate_program.sql');
    } else {
      console.error('Error finding referrer by code:', error);
      console.error('Error details:', { code: error.code, message: error.message, details: error.details, hint: error.hint });
    }
    return null;
  }
  
  if (!data) {
    console.warn('No user found with referral code:', normalizedCode);
    // Try to see if any referral codes exist at all (for debugging)
    // Use a service role query if available, or check if RLS is blocking
    const { data: sampleCodes, error: sampleError } = await supabase
      .from('profiles')
      .select('referral_code')
      .not('referral_code', 'is', null)
      .limit(10);
    
    if (sampleError) {
      console.error('Error fetching sample codes (might be RLS issue):', sampleError);
      console.error('This is likely an RLS policy issue. Please run migration 064_allow_referral_code_lookup.sql');
    } else {
      console.log('Sample referral codes in database:', sampleCodes);
      console.log('Looking for code:', normalizedCode, 'in results:', sampleCodes?.some(c => c.referral_code === normalizedCode));
    }
    return null;
  }
  
  console.log('Found referrer:', { id: data.id, name: data.name, code: data.referral_code });
  return { id: data.id, name: data.name };
};

