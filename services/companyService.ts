import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Company } from '../types';

// Mock data for demo mode
const MOCK_COMPANIES: Company[] = [
  {
    id: 'c1',
    name: 'Demo Company',
    ownerId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// --- COMPANY OPERATIONS ---

export const getCompany = async (): Promise<Company | null> => {
  if (!isSupabaseConfigured || !supabase) {
    return MOCK_COMPANIES[0] || null;
  }

  try {
    // Get current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('[getCompany] No session found');
      return null;
    }

    console.log('[getCompany] User ID:', session.user.id);

    // Step 1: Get profile with company_id (like your SQL: FROM profiles p)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('[getCompany] Error fetching profile:', profileError);
      return null;
    }

    if (!profile?.company_id) {
      console.log('[getCompany] No company_id in profile');
      
      // For owners: try to find company by owner_id as fallback
      if (profile?.role === 'owner') {
        console.log('[getCompany] Owner with no company_id, trying owner_id lookup');
        const { data: companyByOwner, error: ownerError } = await supabase
          .from('companies')
          .select('*')
          .eq('owner_id', session.user.id)
          .single();

        if (!ownerError && companyByOwner) {
          console.log('[getCompany] Found company by owner_id, updating profile');
          // Update profile with company_id
          await supabase
            .from('profiles')
            .update({ company_id: companyByOwner.id })
            .eq('id', session.user.id);

          return {
            id: companyByOwner.id,
            name: companyByOwner.name,
            ownerId: companyByOwner.owner_id,
            createdAt: companyByOwner.created_at,
            updatedAt: companyByOwner.updated_at
          };
        }
      }
      
      return null;
    }

    console.log('[getCompany] Profile company_id:', profile.company_id);

    // Step 2: Get company using company_id (like your SQL: JOIN companies c ON p.company_id = c.id)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();

    if (companyError) {
      console.error('[getCompany] Error fetching company:', companyError);
      console.error('[getCompany] Error code:', companyError.code);
      return null;
    }

    if (!company) {
      console.log('[getCompany] No company found');
      return null;
    }

    console.log('[getCompany] Found company:', company.id, company.name);

    return {
      id: company.id,
      name: company.name,
      ownerId: company.owner_id,
      createdAt: company.created_at,
      updatedAt: company.updated_at
    };
  } catch (error) {
    console.error('[getCompany] Unexpected error:', error);
    return null;
  }
};

export const createCompany = async (name: string, ownerId: string): Promise<Company> => {
  if (!isSupabaseConfigured || !supabase) {
    const newCompany: Company = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      ownerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    MOCK_COMPANIES.push(newCompany);
    return newCompany;
  }

  const { data, error } = await supabase
    .from('companies')
    .insert([{
      name,
      owner_id: ownerId
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating company:', error);
    throw error;
  }

  // Update the owner's profile to link to the company
  await supabase
    .from('profiles')
    .update({ company_id: data.id })
    .eq('id', ownerId);

  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

export const updateCompany = async (id: string, updates: Partial<Pick<Company, 'name'>>): Promise<Company> => {
  if (!isSupabaseConfigured || !supabase) {
    const company = MOCK_COMPANIES.find(c => c.id === id);
    if (!company) throw new Error('Company not found');
    Object.assign(company, updates, { updatedAt: new Date().toISOString() });
    return company;
  }

  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;

  const { data, error } = await supabase
    .from('companies')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating company:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

// Get owner email from owner_id
export const getOwnerEmail = async (ownerId: string): Promise<string | null> => {
  if (!isSupabaseConfigured || !supabase) {
    return 'owner@demo.com'; // Mock email
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', ownerId)
      .single();

    if (error) {
      console.error('Error fetching owner email:', error);
      return null;
    }

    return profile?.email || null;
  } catch (error) {
    console.error('Error in getOwnerEmail:', error);
    return null;
  }
};

