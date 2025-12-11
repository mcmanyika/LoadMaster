import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Company } from '../types';
import { getActiveCompanies } from './dispatcherAssociationService';

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

export const getCompany = async (currentCompanyId?: string): Promise<Company | null> => {
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

    // Step 1: Get profile with company_id and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('[getCompany] Error fetching profile:', profileError);
      return null;
    }

    // For dispatchers: Check junction table first if currentCompanyId is provided
    if (profile?.role === 'dispatcher' && currentCompanyId) {
      console.log('[getCompany] Dispatcher with currentCompanyId, checking association');
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', currentCompanyId)
        .single();

      if (!companyError && company) {
        // Verify association exists
        const { data: association } = await supabase
          .from('dispatcher_company_associations')
          .select('id')
          .eq('dispatcher_id', session.user.id)
          .eq('company_id', currentCompanyId)
          .eq('status', 'active')
          .single();

        if (association) {
          return {
            id: company.id,
            name: company.name,
            ownerId: company.owner_id,
            address: company.address || undefined,
            website: company.website || undefined,
            phone: company.phone || undefined,
            numberOfTrucks: company.number_of_trucks || undefined,
            createdAt: company.created_at,
            updatedAt: company.updated_at
          };
        }
      }
    }

    // For dispatchers without currentCompanyId: Get first active company from associations
    if (profile?.role === 'dispatcher') {
      console.log('[getCompany] Dispatcher, checking associations');
      const activeCompanies = await getActiveCompanies(session.user.id);
      if (activeCompanies.length > 0) {
        // Use first active company or check localStorage for saved preference
        const savedCompanyId = typeof window !== 'undefined' 
          ? localStorage.getItem('currentCompanyId') 
          : null;
        
        const selectedCompany = savedCompanyId 
          ? activeCompanies.find(c => c.id === savedCompanyId) || activeCompanies[0]
          : activeCompanies[0];

        if (selectedCompany) {
          return selectedCompany;
        }
      }
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
      address: company.address || undefined,
      website: company.website || undefined,
      phone: company.phone || undefined,
      email: company.email || undefined,
      contactPerson: company.contact_person || undefined,
      numberOfTrucks: company.number_of_trucks || undefined,
      createdAt: company.created_at,
      updatedAt: company.updated_at
    };
  } catch (error) {
    console.error('[getCompany] Unexpected error:', error);
    return null;
  }
};

export const createCompany = async (
  name: string, 
  ownerId: string,
  companyData?: Partial<Omit<Company, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>
): Promise<Company> => {
  if (!isSupabaseConfigured || !supabase) {
    const newCompany: Company = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      ownerId,
      address: companyData?.address,
      website: companyData?.website,
      phone: companyData?.phone,
      email: companyData?.email,
      contactPerson: companyData?.contactPerson,
      numberOfTrucks: companyData?.numberOfTrucks,
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
      owner_id: ownerId,
      address: companyData?.address || null,
      website: companyData?.website || null,
      phone: companyData?.phone || null,
      email: companyData?.email || null,
      contact_person: companyData?.contactPerson || null,
      number_of_trucks: companyData?.numberOfTrucks || null,
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
    address: data.address || undefined,
    website: data.website || undefined,
    phone: data.phone || undefined,
    numberOfTrucks: data.number_of_trucks || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

export const updateCompany = async (
  id: string, 
  updates: Partial<Omit<Company, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>
): Promise<Company> => {
  if (!isSupabaseConfigured || !supabase) {
    const company = MOCK_COMPANIES.find(c => c.id === id);
    if (!company) throw new Error('Company not found');
    Object.assign(company, updates, { updatedAt: new Date().toISOString() });
    return company;
  }

  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.address !== undefined) updateData.address = updates.address || null;
  if (updates.website !== undefined) updateData.website = updates.website || null;
  if (updates.phone !== undefined) updateData.phone = updates.phone || null;
  if (updates.email !== undefined) updateData.email = updates.email || null;
  if (updates.contactPerson !== undefined) updateData.contact_person = updates.contactPerson || null;
  if (updates.numberOfTrucks !== undefined) updateData.number_of_trucks = updates.numberOfTrucks || null;

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
    address: data.address || undefined,
    website: data.website || undefined,
    phone: data.phone || undefined,
    numberOfTrucks: data.number_of_trucks || undefined,
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

/**
 * Get all companies associated with a dispatcher
 */
export const getDispatcherCompanies = async (dispatcherId: string): Promise<Company[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    return await getActiveCompanies(dispatcherId);
  } catch (error) {
    console.error('Error fetching dispatcher companies:', error);
    return [];
  }
};

