import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, UserRole } from '../types';

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
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const userProfile: UserProfile = {
      id: data.user.id,
      email: data.user.email!,
      name: profile?.name || data.user.email!.split('@')[0],
      role: profile?.role || 'owner', // Default to owner if no profile found
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
    // Create profile entry
    await supabase.from('profiles').insert([{ id: data.user.id, name, role }]);
    
    return {
      user: { id: data.user.id, email: data.user.email!, name, role },
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
  const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

  return {
    id: session.user.id,
    email: session.user.email!,
    name: profile?.name || session.user.user_metadata.name || 'User',
    role: profile?.role || session.user.user_metadata.role || 'owner',
    feePercentage: profile?.fee_percentage || session.user.user_metadata.feePercentage,
  };
};

// Create dispatcher account (only for owners)
// Note: In production, this should be done via a backend API or Supabase Edge Function
// to properly handle user creation without requiring email confirmation
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
  // Use signUp - in production, you'd want a backend function to auto-confirm
  // For now, the dispatcher will need to confirm their email
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role: 'dispatcher', feePercentage }
    }
  });

  if (error) return { user: null, error: error.message };

  if (data.user) {
    // Create profile entry with fee percentage
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{ id: data.user.id, name, role: 'dispatcher', email, fee_percentage: feePercentage }]);

    if (profileError) {
      console.error("Error creating profile:", profileError);
      return { user: null, error: 'Account created but profile setup failed' };
    }

    return {
      user: { id: data.user.id, email: data.user.email!, name, role: 'dispatcher', feePercentage },
      error: null
    };
  }

  return { user: null, error: 'Account created. Dispatcher will need to confirm their email to sign in.' };
};