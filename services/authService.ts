import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, UserRole, UserStatus, Company } from '../types';
import { createCompany, getCompany } from './companyService';

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

export const signUp = async (email: string, password: string, name: string, role: UserRole): Promise<{ user: UserProfile | null, error: string | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    await new Promise(resolve => setTimeout(resolve, 800));
    const newUser = { id: Math.random().toString(), email, name, role };
    MOCK_USERS.push(newUser);
    localStorage.setItem('trucking_user', JSON.stringify(newUser));
    return { user: newUser, error: null };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role } // Storing in metadata for simplicity, ideally use a trigger to copy to profiles table
    }
  });

  if (error) return { user: null, error: error.message };

  // If auto-confirm is on in Supabase
  if (data.user) {
    // Create profile entry with default status 'active'
    await supabase.from('profiles').insert([{ id: data.user.id, name, role, status: 'active' }]);
    
    // If user is an owner, create a company for them
    if (role === 'owner') {
      try {
        const company = await createCompany(`${name}'s Company`, data.user.id);
        // Profile company_id will be set by createCompany function
      } catch (error) {
        console.error('Error creating company for owner:', error);
        // Continue anyway - company can be created later
      }
    }
    
    // Fetch profile again to get company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', data.user.id)
      .single();
    
    return {
      user: { 
        id: data.user.id, 
        email: data.user.email!, 
        name, 
        role,
        companyId: profile?.company_id
      },
      error: null
    };
  }

  return { user: null, error: 'Check email for confirmation link' };
};

export const signOut = async () => {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem('trucking_user');
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
      .select('*')
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