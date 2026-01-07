import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, UserRole, UserStatus, Company } from '../types';
import { createCompany, getCompany } from './companyService';
import { findReferrerByCode, createReferral } from './affiliateService';

// Mock users for Demo Mode
const MOCK_USERS: UserProfile[] = [
  { id: '1', email: 'owner@demo.com', name: 'Admin User', role: 'owner' },
  { id: '2', email: 'dispatch@demo.com', name: 'John Dispatcher', role: 'dispatcher' },
  { id: '3', email: 'driver@demo.com', name: 'Mike Driver', role: 'driver' },
];

export const signIn = async (email: string, password: string): Promise<{ user: UserProfile | null, error: string | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    // Demo Mode Logic
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network
    const user = MOCK_USERS.find(u => u.email === email);
    if (user) {
      if (password === 'password') {
        localStorage.setItem('trucking_user', JSON.stringify(user));
        return { user, error: null };
      }
      return { user: null, error: 'Invalid password (use "password" for demo)' };
    }
    return { user: null, error: 'User not found' };
  }

  // Real Supabase Logic
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { user: null, error: error.message };

  if (data.user) {
    // In a real app, we would fetch the 'role' from a 'profiles' table here.
    // For this prototype, we'll derive it from metadata or default to 'owner'
    // You should create a 'profiles' table in Supabase linked to auth.users
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // If profile doesn't exist, return a special marker object
    if (profileError && profileError.code === 'PGRST116') {
      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata.name || data.user.email!.split('@')[0],
          role: (data.user.user_metadata.role as UserRole) || 'owner',
          status: 'active' as UserStatus,
          _profileMissing: true, // Special flag to indicate profile needs to be created
        } as UserProfile & { _profileMissing?: boolean },
        error: null
      };
    }

    const userProfile: UserProfile = {
      id: data.user.id,
      email: data.user.email!,
      name: profile?.name || data.user.email!.split('@')[0],
      role: profile?.role || 'owner', // Default to owner if no profile found
      status: (profile?.status as UserStatus) || 'active',
      feePercentage: profile?.fee_percentage,
      companyId: profile?.company_id,
    };

    return { user: userProfile, error: null };
  }

  return { user: null, error: 'Unknown error' };
};

export const signUp = async (email: string, password: string, name: string, role: UserRole, referralCode?: string): Promise<{ user: UserProfile | null, error: string | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    await new Promise(resolve => setTimeout(resolve, 800));
    const newUser = { id: Math.random().toString(), email, name, role };
    MOCK_USERS.push(newUser);
    localStorage.setItem('trucking_user', JSON.stringify(newUser));
    return { user: newUser, error: null };
  }

  // Check if user already exists before attempting signup
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();
  
  if (existingUser) {
    return { user: null, error: 'An account with this email already exists. Please sign in instead.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role } // Storing in metadata for simplicity, ideally use a trigger to copy to profiles table
    }
  });

  if (error) {
    // Check for duplicate email error
    if (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('User already registered')) {
      return { user: null, error: 'An account with this email already exists. Please sign in instead.' };
    }
    return { user: null, error: error.message };
  }

  // If auto-confirm is on in Supabase
  if (data.user) {
    // Check if profile already exists (might be created by trigger)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle();
    
    // Only create profile if it doesn't exist (trigger might have already created it)
    if (!existingProfile) {
      // Use upsert to handle race conditions (in case trigger creates it between check and insert)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{ id: data.user.id, name, role, status: 'active' }], {
          onConflict: 'id'
        });
      
      if (profileError) {
        console.error('Error creating/updating profile:', profileError);
        // Continue anyway - profile might have been created by trigger
      }
    } else {
      // Profile exists, but update it with correct name and role (in case trigger used defaults)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ name, role })
        .eq('id', data.user.id);
      
      if (updateError) {
        console.error('Error updating profile:', updateError);
      }
    }

    // If user is an owner or dispatch_company, create a company for them
    if (role === 'owner' || role === 'dispatch_company') {
      try {
        const company = await createCompany(`${name}'s Company`, data.user.id);
        // Profile company_id will be set by createCompany function

        // Create sample data for new owner accounts (not for dispatch companies)
        if (role === 'owner' && company && isSupabaseConfigured && supabase) {
          try {
            // Wait a moment to ensure company is fully set up
            await new Promise(resolve => setTimeout(resolve, 300));

            // Create sample dispatcher
            const { data: sampleDispatcher, error: dispatcherError } = await supabase
              .from('dispatchers')
              .insert([{
                name: 'Sample Dispatcher',
                email: `sample-dispatcher-${company.id.substring(0, 8)}@example.com`,
                phone: '555-0100',
                fee_percentage: 12,
                company_id: company.id
              }])
              .select()
              .single();

            if (dispatcherError) {
              console.error('Error creating sample dispatcher:', dispatcherError);
            }

            // Create sample vehicle/transporter
            const { data: sampleVehicle, error: vehicleError } = await supabase
              .from('transporters')
              .insert([{
                name: 'Sample Vehicle',
                registration_number: 'SAMPLE-001',
                mc_number: 'MC-SAMPLE-001',
                contact_phone: '555-0200',
                company_id: company.id
              }])
              .select()
              .single();

            if (vehicleError) {
              console.error('Error creating sample vehicle:', vehicleError);
            }

            // Create sample driver (only if vehicle was created successfully)
            if (sampleVehicle) {
              const { error: driverError } = await supabase
                .from('drivers')
                .insert([{
                  name: 'Sample Driver',
                  phone: '555-0300',
                  email: `sample-driver-${company.id.substring(0, 8)}@example.com`,
                  transporter_id: sampleVehicle.id,
                  company_id: company.id,
                  pay_type: 'percentage_of_net',
                  pay_percentage: 50
                }]);

              if (driverError) {
                console.error('Error creating sample driver:', driverError);
              } else {
                console.log('✅ Sample data created for new owner account');
              }
            }
          } catch (sampleError) {
            console.error('Error creating sample data:', sampleError);
            // Don't fail the signup if sample data creation fails
          }
        }
      } catch (error) {
        console.error('Error creating company for owner:', error);
        // Continue anyway - company can be created later
      }
    }

    // Handle referral if referral code was provided
    if (referralCode && referralCode.trim()) {
      console.log('Processing referral code:', referralCode.trim());
      try {
        const referrer = await findReferrerByCode(referralCode.trim());
        console.log('Referrer found:', referrer);
        
        if (referrer) {
          console.log('Updating profile with referred_by:', referrer.id);
          // Update new user's profile to set referred_by
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ referred_by: referrer.id })
            .eq('id', data.user.id);
          
          if (updateError) {
            console.error('Error updating referred_by:', updateError);
            // Check if column doesn't exist (migration not run)
            if (updateError.code === '42703' || updateError.message?.includes('column') || updateError.message?.includes('does not exist')) {
              console.warn('referred_by column not found. Please run migration 062_add_affiliate_program.sql');
            }
            // Continue - column might not exist if migration hasn't been run
          } else {
            console.log('Successfully updated referred_by');
          }
          
          // Create referral record
          console.log('Creating referral record...');
          const { referral, error: referralError } = await createReferral(referrer.id, data.user.id, referralCode.trim());
          
          if (referralError) {
            console.error('Error creating referral record:', referralError);
            // Check if table doesn't exist (migration not run)
            if (referralError.includes('not found') || referralError.includes('does not exist')) {
              console.warn('Referrals table not found. Please run migration 062_add_affiliate_program.sql');
            }
            // Continue - table might not exist if migration hasn't been run
          } else if (referral) {
            console.log('Successfully created referral record:', referral.id);
          }
        } else {
          console.warn('Referrer not found for code:', referralCode.trim());
        }
      } catch (referralError: any) {
        console.error('Error processing referral:', referralError);
        // Don't fail signup if referral processing fails - migration might not be run yet
      }
    } else {
      console.log('No referral code provided');
    }

    // Fetch profile again to get company_id and referral_code
    // Try to select all columns first, then fallback to basic columns if affiliate columns don't exist
    let profile: any = null;
    let profileFetchError: any = null;
    
    // First try with affiliate columns
    const { data: profileWithAffiliate, error: affiliateError } = await supabase
      .from('profiles')
      .select('company_id, referral_code, referred_by')
      .eq('id', data.user.id)
      .single();
    
    if (affiliateError) {
      // If columns don't exist (migration not run), try without them
      if (affiliateError.code === '42703' || affiliateError.message?.includes('column') || affiliateError.message?.includes('does not exist')) {
        console.warn('Affiliate columns not found. Please run migration 062_add_affiliate_program.sql');
        // Fallback: select without affiliate columns
        const { data: profileBasic, error: basicError } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', data.user.id)
          .single();
        
        if (basicError) {
          profileFetchError = basicError;
        } else {
          profile = profileBasic;
        }
      } else {
        profileFetchError = affiliateError;
      }
    } else {
      profile = profileWithAffiliate;
    }
    
    if (profileFetchError && profileFetchError.code !== 'PGRST116') {
      console.error('Error fetching profile after signup:', profileFetchError);
      // Continue anyway - profile should exist
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        name,
        role,
        companyId: profile?.company_id,
        referralCode: profile?.referral_code || undefined,
        referredBy: profile?.referred_by || undefined
      },
      error: null
    };
  }

  return { user: null, error: 'Check email for confirmation link' };
};

export const signOut = async () => {
  if (isSupabaseConfigured && supabase) {
    // Sign out from Supabase - this clears the session
    await supabase.auth.signOut();
  }
  // Clear local storage
  localStorage.removeItem('trucking_user');
  // Clear all Supabase-related localStorage items to ensure complete sign out
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token')) {
      localStorage.removeItem(key);
    }
  });
  // Also clear sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  if (!isSupabaseConfigured || !supabase) {
    const stored = localStorage.getItem('trucking_user');
    return stored ? JSON.parse(stored) : null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, referral_code, referred_by')
    .eq('id', session.user.id)
    .single();

  // If profile doesn't exist, return a special marker object
  // The App component will detect this and show the ProfileSetup component
  if (profileError && profileError.code === 'PGRST116') {
    // Profile doesn't exist - return a special object that indicates profile is missing
    return {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.user_metadata.name || session.user.email!.split('@')[0],
      role: (session.user.user_metadata.role as UserRole) || 'owner',
      feePercentage: session.user.user_metadata.feePercentage,
      companyId: undefined,
      _profileMissing: true, // Special flag to indicate profile needs to be created
    } as UserProfile & { _profileMissing?: boolean };
  }

  return {
    id: session.user.id,
    email: session.user.email!,
    name: profile?.name || session.user.user_metadata.name || 'User',
    role: profile?.role || session.user.user_metadata.role || 'owner',
    status: (profile?.status as UserStatus) || 'active',
    feePercentage: profile?.fee_percentage || session.user.user_metadata.feePercentage,
    companyId: profile?.company_id,
    referralCode: profile?.referral_code,
    referredBy: profile?.referred_by,
  };
};

// Create dispatcher account (only for owners)
// Note: In production, this should be done via a backend API or Supabase Edge Function
// to properly handle user creation without requiring email confirmation
// DEPRECATED: createDispatcher has been moved to loadService.ts
// Dispatchers are now simple table records, not auth users
// This function is kept for backward compatibility but should not be used
export const createDispatcher = async (email: string, password: string, name: string, feePercentage: number = 12): Promise<{ user: UserProfile | null, error: string | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    // Demo Mode Logic
    await new Promise(resolve => setTimeout(resolve, 800));
    const existingUser = MOCK_USERS.find(u => u.email === email);
    if (existingUser) {
      return { user: null, error: 'A user with this email already exists' };
    }
    const newDispatcher = { id: Math.random().toString(), email, name, role: 'dispatcher' as UserRole, feePercentage };
    MOCK_USERS.push(newDispatcher);
    return { user: newDispatcher, error: null };
  }

  // Real Supabase Logic
  // IMPORTANT: Get owner's session info and company BEFORE signUp, because signUp() automatically signs in the new user
  const { data: { session: ownerSession } } = await supabase.auth.getSession();
  if (!ownerSession?.user) {
    return { user: null, error: 'Owner must be logged in to create dispatcher' };
  }
  const ownerUserId = ownerSession.user.id;

  // Get owner's company BEFORE signUp changes the session
  // We'll use the owner's user ID directly to find the company
  let ownerCompany = null;
  if (isSupabaseConfigured && supabase) {
    // Find company by owner_id directly (most reliable)
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', ownerUserId)
      .single();

    if (companyData) {
      ownerCompany = {
        id: companyData.id,
        name: companyData.name,
        ownerId: companyData.owner_id,
        createdAt: companyData.created_at,
        updatedAt: companyData.updated_at
      };
    }
  }

  if (!ownerCompany) {
    return { user: null, error: 'Owner does not have a company assigned. Please create a company first in Settings.' };
  }

  // Use signUp - in production, you'd want a backend function to auto-confirm
  // For now, the dispatcher will need to confirm their email
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role: 'dispatcher', feePercentage },
      emailRedirectTo: undefined // Don't send confirmation email redirect
    }
  });

  if (error) {
    // Handle specific error cases
    if (error.message.includes('rate limit') || error.message.includes('rate_limit')) {
      return {
        user: null,
        error: 'Email rate limit exceeded. Please wait a few minutes before creating another dispatcher, or disable email confirmation in Supabase Dashboard > Authentication > Settings.'
      };
    }
    if (error.message.includes('already registered') || error.message.includes('already exists')) {
      return {
        user: null,
        error: 'A user with this email already exists. Please use a different email address.'
      };
    }
    return { user: null, error: error.message };
  }

  if (data.user) {
    // IMPORTANT: signUp() automatically signs in the new dispatcher user
    // We need to sign out the dispatcher immediately to prevent auto-login
    await supabase.auth.signOut();

    // Note: The owner will need to log in again after creating a dispatcher
    // In production, use Supabase Admin API with service role key to create users
    // without auto-signing them in

    if (!ownerCompany) {
      return { user: null, error: 'Owner does not have a company assigned. Please create a company first in Settings.' };
    }

    // Wait a brief moment for the trigger to create the profile (if it exists)
    // Then use upsert to handle both insert and update cases
    await new Promise(resolve => setTimeout(resolve, 100));

    // Use upsert with array syntax - this will insert if doesn't exist, or update if it does
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([{
        id: data.user.id,
        name,
        role: 'dispatcher',
        email,
        fee_percentage: feePercentage,
        company_id: ownerCompany.id
      }], {
        onConflict: 'id' // Use id as the conflict column
      });

    if (profileError) {
      console.error("Error upserting profile:", profileError);
      // Return the actual error message for debugging
      return { user: null, error: profileError.message || 'Account created but profile setup failed. Please check console for details.' };
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        name,
        role: 'dispatcher',
        feePercentage,
        companyId: ownerCompany.id
      },
      error: null
    };
  }

  return { user: null, error: 'Account created. Dispatcher will need to confirm their email to sign in.' };
};

// DEPRECATED: updateDispatcher has been moved to loadService.ts
// Dispatchers are now simple table records, not auth users
// This function is kept for backward compatibility but should not be used
export const updateDispatcher = async (dispatcherId: string, updates: { name?: string; email?: string; feePercentage?: number }): Promise<UserProfile> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured');
  }

  const updatePayload: any = {};
  if (updates.name !== undefined) updatePayload.name = updates.name;
  if (updates.email !== undefined) updatePayload.email = updates.email;
  if (updates.feePercentage !== undefined) updatePayload.fee_percentage = updates.feePercentage;

  // First update the profile
  const { error: updateError, data: updatedData } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', dispatcherId)
    .select();

  if (updateError) {
    console.error('Error updating dispatcher:', updateError);
    throw updateError;
  }

  // If update returned data, use it
  if (updatedData && updatedData.length > 0) {
    const data = updatedData[0];
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      feePercentage: data.fee_percentage || 12,
      companyId: data.company_id
    };
  }

  // Then fetch the updated profile (fallback if select didn't return data)
  const { data, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', dispatcherId)
    .single();

  if (fetchError) {
    console.error('Error fetching updated dispatcher:', fetchError);
    throw fetchError;
  }

  if (!data) {
    throw new Error('Dispatcher not found after update');
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    feePercentage: data.fee_percentage || 12,
    companyId: data.company_id
  };
};