import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DriverCompanyAssociation, Company, UserProfile } from '../types';
import { generateUniqueInviteCode, normalizeInviteCode } from './inviteCodeService';

/**
 * Get all company associations for a driver
 */
export const getDriverAssociations = async (
  driverId: string
): Promise<DriverCompanyAssociation[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('driver_company_associations')
      .select(`
        *,
        company:companies(*),
        driver:profiles!driver_id(*)
      `)
      .eq('driver_id', driverId)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching driver associations:', error);
      return [];
    }

    return (data || []).map(mapAssociation);
  } catch (error) {
    console.error('Error fetching driver associations:', error);
    return [];
  }
};

/**
 * Get all drivers associated with a company
 */
export const getCompanyDrivers = async (
  companyId: string
): Promise<DriverCompanyAssociation[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    console.log('[getCompanyDrivers] Fetching drivers for companyId:', companyId);
    const { data, error } = await supabase
      .from('driver_company_associations')
      .select(`
        *,
        company:companies(*),
        driver:profiles!driver_id(*)
      `)
      .eq('company_id', companyId)
      .eq('status', 'active') // Only get active drivers
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('[getCompanyDrivers] Error fetching company drivers:', error);
      return [];
    }

    console.log('[getCompanyDrivers] Found', data?.length || 0, 'driver associations for company', companyId);
    return (data || []).map(mapAssociation);
  } catch (error) {
    console.error('Error fetching company drivers:', error);
    return [];
  }
};

/**
 * Generate an invite code for a company for a driver
 */
export const generateDriverInviteCode = async (
  companyId: string,
  expiresInDays: number = 30
): Promise<{ success: boolean; error?: string; code?: string; association?: DriverCompanyAssociation }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'User not authenticated' };
    }

    const inviteCode = await generateUniqueInviteCode(8);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { data, error } = await supabase
      .from('driver_company_associations')
      .insert([{
        company_id: companyId,
        invite_code: inviteCode,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        invited_by: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select(`
        *,
        company:companies(*)
      `)
      .single();

    if (error) {
      console.error('Error generating driver invite code:', error);
      return { success: false, error: error.message };
    }

    return { success: true, code: inviteCode, association: mapAssociation(data) };
  } catch (error: any) {
    console.error('Error generating driver invite code:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get details of an invite code for preview
 */
export const getDriverInviteCodeDetails = async (
  code: string
): Promise<{ success: boolean; error?: string; company?: Company; expiresAt?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  const normalizedCode = normalizeInviteCode(code);

  try {
    const { data, error } = await supabase
      .from('driver_company_associations')
      .select(`
        company:companies(*),
        expires_at
      `)
      .eq('invite_code', normalizedCode)
      .eq('status', 'pending')
      .is('driver_id', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return { success: false, error: 'Invite code not found or already used/expired.' };
      }
      console.error('Error fetching driver invite code details:', error);
      return { success: false, error: error.message };
    }

    if (data && data.expires_at && new Date(data.expires_at) < new Date()) {
      return { success: false, error: 'Invite code has expired.' };
    }

    return { 
      success: true, 
      company: data.company ? {
        id: data.company.id,
        name: data.company.name,
        ownerId: data.company.owner_id,
        createdAt: data.company.created_at,
        updatedAt: data.company.updated_at
      } : undefined, 
      expiresAt: data.expires_at 
    };
  } catch (error: any) {
    console.error('Error fetching driver invite code details:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Allow a driver to join a company using an invite code
 */
export const joinCompanyByDriverCode = async (
  code: string
): Promise<{ success: boolean; error?: string; association?: DriverCompanyAssociation }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  const normalizedCode = normalizeInviteCode(code);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'User not authenticated' };
    }

    const driverId = session.user.id;

    // Start a transaction-like operation
    // 1. Find the pending invite code
    const { data: inviteData, error: inviteError } = await supabase
      .from('driver_company_associations')
      .select('*, company:companies(*)')
      .eq('invite_code', normalizedCode)
      .eq('status', 'pending')
      .is('driver_id', null)
      .single();

    if (inviteError || !inviteData) {
      if (inviteError?.code === 'PGRST116') {
        return { success: false, error: 'Invite code not found, already used, or expired.' };
      }
      console.error('Error finding invite code:', inviteError);
      return { success: false, error: inviteError?.message || 'Failed to find invite code.' };
    }

    if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
      return { success: false, error: 'Invite code has expired.' };
    }

    const companyId = inviteData.company_id;

    // 2. Check if the driver is already actively associated with this company
    const { data: existingActiveAssociation, error: existingActiveError } = await supabase
      .from('driver_company_associations')
      .select('*')
      .eq('driver_id', driverId)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingActiveError) {
      console.error('Error checking existing active association:', existingActiveError);
      return { success: false, error: existingActiveError.message };
    }

    if (existingActiveAssociation) {
      return { success: false, error: `You are already an active driver for ${inviteData.company?.name || 'this company'}.` };
    }

    // 3. Check for inactive/suspended associations
    const { data: existingInactiveAssociation, error: existingInactiveError } = await supabase
      .from('driver_company_associations')
      .select('*')
      .eq('driver_id', driverId)
      .eq('company_id', companyId)
      .in('status', ['inactive', 'suspended'])
      .maybeSingle();

    if (existingInactiveError) {
      console.error('Error checking existing inactive association:', existingInactiveError);
      return { success: false, error: existingInactiveError.message };
    }

    if (existingInactiveAssociation) {
      // Reactivate the existing association and delete the invite code association
      const { error: updateError } = await supabase
        .from('driver_company_associations')
        .update({ status: 'active', joined_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', existingInactiveAssociation.id);

      if (updateError) {
        console.error('Error reactivating existing association:', updateError);
        return { success: false, error: updateError.message };
      }

      const { error: deleteError } = await supabase
        .from('driver_company_associations')
        .delete()
        .eq('id', inviteData.id);

      if (deleteError) {
        console.error('Error deleting invite code association after reactivation:', deleteError);
        // This is a non-critical error, but log it. The user has joined.
      }
      return { success: true, association: mapAssociation({ ...existingInactiveAssociation, status: 'active', company: inviteData.company }) };
    }

    // 4. Update the invite code association to active
    // Use a more specific WHERE clause to prevent race conditions
    // Only update if status is still 'pending' and driver_id is still null
    const { data: updatedAssociation, error: updateError } = await supabase
      .from('driver_company_associations')
      .update({
        driver_id: driverId,
        status: 'active',
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        invite_code: null, // Clear the invite code once used
        expires_at: null,  // Clear expiration once used
      })
      .eq('id', inviteData.id)
      .eq('status', 'pending') // Only update if still pending
      .is('driver_id', null) // Only update if driver_id is still null
      .select(`
        *,
        company:companies(*),
        driver:profiles!driver_id(*)
      `)
      .maybeSingle();

    if (updateError) {
      console.error('Error updating driver association:', updateError);
      return { success: false, error: updateError.message };
    }

    // Check if update actually happened (might have been updated by another request)
    if (!updatedAssociation) {
      // Double-check if we're already associated (race condition - another request succeeded)
      const { data: checkAssociation } = await supabase
        .from('driver_company_associations')
        .select('id, status, driver_id')
        .eq('id', inviteData.id)
        .maybeSingle();
      
      if (checkAssociation?.driver_id === driverId && checkAssociation?.status === 'active') {
        // We're already associated - another request succeeded first
        return { success: false, error: 'You have already joined this company.' };
      }
      
      return { success: false, error: 'Invite code was already used or is no longer valid.' };
    }

    // 5. Update the driver's profile to link to this company if they don't have one
    // This is for backward compatibility or if a driver only has one company
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', driverId)
      .single();

    if (profileError) {
      console.error('Error fetching driver profile:', profileError);
      // Non-critical, proceed
    } else if (!profileData.company_id) {
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ company_id: companyId })
        .eq('id', driverId);
      if (updateProfileError) {
        console.error('Error updating driver profile company_id:', updateProfileError);
        // Non-critical, proceed
      }
    }

    return { success: true, association: mapAssociation({ ...updatedAssociation, company: inviteData.company }) };
  } catch (error: any) {
    console.error('Error joining company by driver code:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Revoke an unused invite code
 */
export const revokeDriverInviteCode = async (
  associationId: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Ensure the user is an owner of the company associated with this invite code
    const { data: association, error: fetchError } = await supabase
      .from('driver_company_associations')
      .select('company_id')
      .eq('id', associationId)
      .single();

    if (fetchError || !association) {
      console.error('Error fetching association for revoke:', fetchError);
      return { success: false, error: fetchError?.message || 'Association not found.' };
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('owner_id')
      .eq('id', association.company_id)
      .single();

    if (companyError || company?.owner_id !== session.user.id) {
      return { success: false, error: 'Unauthorized to revoke this invite code.' };
    }

    const { error } = await supabase
      .from('driver_company_associations')
      .update({ status: 'inactive', invite_code: null, expires_at: null, updated_at: new Date().toISOString() })
      .eq('id', associationId);

    if (error) {
      console.error('Error revoking driver invite code:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error revoking driver invite code:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all unused invite codes for a specific company
 */
export const getUnusedDriverInviteCodes = async (
  companyId: string
): Promise<DriverCompanyAssociation[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('driver_company_associations')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .is('driver_id', null)
      .not('invite_code', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unused driver invite codes:', error);
      return [];
    }

    return (data || []).map(mapAssociation);
  } catch (error) {
    console.error('Error fetching unused driver invite codes:', error);
    return [];
  }
};

/**
 * Update a driver's association status (e.g., from active to inactive/suspended)
 */
export const updateDriverAssociationStatus = async (
  associationId: string,
  status: 'active' | 'inactive' | 'suspended'
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Ensure the user is an owner of the company associated with this association
    const { data: association, error: fetchError } = await supabase
      .from('driver_company_associations')
      .select('company_id')
      .eq('id', associationId)
      .single();

    if (fetchError || !association) {
      console.error('Error fetching association for status update:', fetchError);
      return { success: false, error: fetchError?.message || 'Association not found.' };
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('owner_id')
      .eq('id', association.company_id)
      .single();

    if (companyError || company?.owner_id !== session.user.id) {
      return { success: false, error: 'Unauthorized to update this association.' };
    }

    const { error } = await supabase
      .from('driver_company_associations')
      .update({ status: status, updated_at: new Date().toISOString() })
      .eq('id', associationId);

    if (error) {
      console.error('Error updating driver association status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating driver association status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove a driver from a company (sets status to inactive)
 */
export const removeDriver = async (
  associationId: string
): Promise<{ success: boolean; error?: string }> => {
  return updateDriverAssociationStatus(associationId, 'inactive');
};

/**
 * Get all active associations for a driver, including company details
 */
export const getDriverAssociationsWithCompanies = async (
  driverId: string
): Promise<Company[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('driver_company_associations')
      .select(`
        company:companies(*)
      `)
      .eq('driver_id', driverId)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching driver companies:', error);
      return [];
    }

    return (data || []).map((item: any) => item.company).filter(Boolean).map((company: any) => ({
      id: company.id,
      name: company.name,
      ownerId: company.owner_id,
      createdAt: company.created_at,
      updatedAt: company.updated_at
    }));
  } catch (error) {
    console.error('Error fetching driver companies:', error);
    return [];
  }
};

/**
 * Helper function to map database record to DriverCompanyAssociation
 */
function mapAssociation(item: any): DriverCompanyAssociation {
  return {
    id: item.id,
    driverId: item.driver_id || undefined,
    companyId: item.company_id,
    status: item.status,
    joinedAt: item.joined_at,
    invitedBy: item.invited_by,
    inviteCode: item.invite_code || undefined,
    expiresAt: item.expires_at || undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    company: item.company ? {
      id: item.company.id,
      name: item.company.name,
      ownerId: item.company.owner_id,
      createdAt: item.company.created_at,
      updatedAt: item.company.updated_at
    } : undefined,
    driver: item.driver ? {
      id: item.driver.id,
      email: item.driver.email,
      name: item.driver.name,
      role: item.driver.role,
      status: item.driver.status,
      companyId: item.driver.company_id
    } : undefined
  };
}

