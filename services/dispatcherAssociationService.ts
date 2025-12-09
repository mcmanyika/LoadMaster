import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DispatcherCompanyAssociation, Company, UserProfile } from '../types';
import { generateUniqueInviteCode, normalizeInviteCode } from './inviteCodeService';

/**
 * Get all company associations for a dispatcher
 */
export const getDispatcherAssociations = async (
  dispatcherId: string
): Promise<DispatcherCompanyAssociation[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('dispatcher_company_associations')
      .select(`
        *,
        company:companies(*),
        dispatcher:profiles!dispatcher_id(*)
      `)
      .eq('dispatcher_id', dispatcherId)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching dispatcher associations:', error);
      return [];
    }

    return (data || []).map(mapAssociation);
  } catch (error) {
    console.error('Error fetching dispatcher associations:', error);
    return [];
  }
};

/**
 * Get all dispatchers associated with a company
 */
export const getCompanyDispatchers = async (
  companyId: string
): Promise<DispatcherCompanyAssociation[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('dispatcher_company_associations')
      .select(`
        *,
        company:companies(*),
        dispatcher:profiles!dispatcher_id(*)
      `)
      .eq('company_id', companyId)
      .eq('status', 'active') // Only get active dispatchers
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching company dispatchers:', error);
      return [];
    }

    return (data || []).map(mapAssociation);
  } catch (error) {
    console.error('Error fetching company dispatchers:', error);
    return [];
  }
};

/**
 * Generate an invite code for a company
 * Creates a pending association with a unique code that dispatchers can use to join
 */
export const generateInviteCode = async (
  companyId: string,
  feePercentage: number,
  expiresInDays: number = 30
): Promise<{ success: boolean; error?: string; code?: string; association?: DispatcherCompanyAssociation }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Get current user (inviter)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Generate unique invite code
    const inviteCode = await generateUniqueInviteCode(8);
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create new association with pending status and invite code
    // dispatcher_id is NULL until code is used
    const { data: newAssociation, error: insertError } = await supabase
      .from('dispatcher_company_associations')
      .insert([{
        dispatcher_id: null, // Will be set when code is used
        company_id: companyId,
        fee_percentage: feePercentage,
        status: 'pending',
        invite_code: inviteCode,
        expires_at: expiresAt.toISOString(),
        invited_by: session.user.id
      }])
      .select(`
        *,
        company:companies(*)
      `)
      .single();

    if (insertError) {
      console.error('Error creating invite code:', insertError);
      return { success: false, error: insertError.message };
    }

    return {
      success: true,
      code: inviteCode,
      association: mapAssociation(newAssociation)
    };
  } catch (error: any) {
    console.error('Error generating invite code:', error);
    return { success: false, error: error?.message || 'Failed to generate invite code' };
  }
};

/**
 * Get invite code details (for preview before joining)
 */
export const getInviteCodeDetails = async (
  code: string
): Promise<{ success: boolean; error?: string; company?: Company; feePercentage?: number; expiresAt?: string; isExpired?: boolean }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const normalizedCode = normalizeInviteCode(code);

    const { data: association, error } = await supabase
      .from('dispatcher_company_associations')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('invite_code', normalizedCode)
      .eq('status', 'pending')
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!association) {
      return { success: false, error: 'Invalid invite code' };
    }

    // Check if expired
    const isExpired = association.expires_at 
      ? new Date(association.expires_at) < new Date()
      : false;

    if (isExpired) {
      return { success: false, error: 'This invite code has expired' };
    }

    // Check if already used
    if (association.dispatcher_id) {
      return { success: false, error: 'This invite code has already been used' };
    }

    return {
      success: true,
      company: association.company ? {
        id: association.company.id,
        name: association.company.name,
        ownerId: association.company.owner_id,
        createdAt: association.company.created_at,
        updatedAt: association.company.updated_at
      } : undefined,
      feePercentage: parseFloat(association.fee_percentage) || 12.00,
      expiresAt: association.expires_at,
      isExpired: false
    };
  } catch (error: any) {
    console.error('Error getting invite code details:', error);
    return { success: false, error: error?.message || 'Failed to get invite code details' };
  }
};

/**
 * Join a company using an invite code
 */
export const joinCompanyByCode = async (
  code: string
): Promise<{ success: boolean; error?: string; association?: DispatcherCompanyAssociation }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Get current user (dispatcher)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'User not authenticated' };
    }

    const normalizedCode = normalizeInviteCode(code);

    // Find the association by code
    const { data: association, error: fetchError } = await supabase
      .from('dispatcher_company_associations')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('invite_code', normalizedCode)
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!association) {
      return { success: false, error: 'Invalid invite code' };
    }

    // Validate code
    // Check if expired
    if (association.expires_at) {
      const expiresAt = new Date(association.expires_at);
      if (expiresAt < new Date()) {
        return { success: false, error: 'This invite code has expired' };
      }
    }

    // Check if already used
    if (association.dispatcher_id) {
      return { success: false, error: 'This invite code has already been used' };
    }

    // Check if dispatcher is already associated with this company
    const { data: existingAssociation } = await supabase
      .from('dispatcher_company_associations')
      .select('id, status')
      .eq('dispatcher_id', session.user.id)
      .eq('company_id', association.company_id)
      .maybeSingle();

    if (existingAssociation) {
      if (existingAssociation.status === 'active') {
        return { success: false, error: 'You are already associated with this company' };
      }
      // If inactive or suspended, reactivate the existing association
      // and delete the invite code association to avoid duplicate
      const { data: reactivated, error: reactivateError } = await supabase
        .from('dispatcher_company_associations')
        .update({
          status: 'active',
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAssociation.id)
        .select(`
          *,
          company:companies(*),
          dispatcher:profiles!dispatcher_id(*)
        `)
        .single();

      if (reactivateError) {
        return { success: false, error: reactivateError.message };
      }

      // Delete the invite code association since we're using the existing one
      await supabase
        .from('dispatcher_company_associations')
        .delete()
        .eq('id', association.id);

      return {
        success: true,
        association: mapAssociation(reactivated)
      };
    }

    // No existing association - update the invite code association
    // Update association: set dispatcher_id, change status to active, set joined_at
    const { data: updated, error: updateError } = await supabase
      .from('dispatcher_company_associations')
      .update({
        dispatcher_id: session.user.id,
        status: 'active',
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', association.id)
      .select(`
        *,
        company:companies(*),
        dispatcher:profiles!dispatcher_id(*)
      `)
      .single();

    if (updateError) {
      // If update fails due to unique constraint, it means another association was created
      // between the check and update - try to find and use that one
      const { data: newExisting } = await supabase
        .from('dispatcher_company_associations')
        .select('id, status')
        .eq('dispatcher_id', session.user.id)
        .eq('company_id', association.company_id)
        .maybeSingle();

      if (newExisting) {
        // Update the existing one and delete the invite code one
        const { data: finalAssociation } = await supabase
          .from('dispatcher_company_associations')
          .update({
            status: 'active',
            joined_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', newExisting.id)
          .select(`
            *,
            company:companies(*),
            dispatcher:profiles!dispatcher_id(*)
          `)
          .single();

        await supabase
          .from('dispatcher_company_associations')
          .delete()
          .eq('id', association.id);

        if (finalAssociation) {
          return {
            success: true,
            association: mapAssociation(finalAssociation)
          };
        }
      }

      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      association: mapAssociation(updated)
    };
  } catch (error: any) {
    console.error('Error joining company by code:', error);
    return { success: false, error: error?.message || 'Failed to join company' };
  }
};

/**
 * Accept an invitation (dispatcher accepts)
 */
export const acceptInvitation = async (
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

    // Verify the association belongs to the current user
    const { data: association, error: fetchError } = await supabase
      .from('dispatcher_company_associations')
      .select('dispatcher_id, status')
      .eq('id', associationId)
      .single();

    if (fetchError || !association) {
      return { success: false, error: 'Invitation not found' };
    }

    if (association.dispatcher_id !== session.user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    if (association.status !== 'pending') {
      return { success: false, error: 'Invitation is not pending' };
    }

    const { error: updateError } = await supabase
      .from('dispatcher_company_associations')
      .update({
        status: 'active',
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', associationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return { success: false, error: error?.message || 'Failed to accept invitation' };
  }
};

/**
 * Reject an invitation (dispatcher rejects)
 */
export const rejectInvitation = async (
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

    // Verify the association belongs to the current user
    const { data: association, error: fetchError } = await supabase
      .from('dispatcher_company_associations')
      .select('dispatcher_id, status')
      .eq('id', associationId)
      .single();

    if (fetchError || !association) {
      return { success: false, error: 'Invitation not found' };
    }

    if (association.dispatcher_id !== session.user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Delete the association (or set to inactive)
    const { error: deleteError } = await supabase
      .from('dispatcher_company_associations')
      .delete()
      .eq('id', associationId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting invitation:', error);
    return { success: false, error: error?.message || 'Failed to reject invitation' };
  }
};

/**
 * Update association fee percentage (owner only)
 */
export const updateAssociationFee = async (
  associationId: string,
  feePercentage: number
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error: updateError } = await supabase
      .from('dispatcher_company_associations')
      .update({
        fee_percentage: feePercentage,
        updated_at: new Date().toISOString()
      })
      .eq('id', associationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating association fee:', error);
    return { success: false, error: error?.message || 'Failed to update fee' };
  }
};

/**
 * Remove dispatcher from company (set status to inactive)
 */
export const removeDispatcher = async (
  associationId: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error: updateError } = await supabase
      .from('dispatcher_company_associations')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', associationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error removing dispatcher:', error);
    return { success: false, error: error?.message || 'Failed to remove dispatcher' };
  }
};

/**
 * Get pending invitations for a dispatcher
 * Note: With invite code system, this may not be used as dispatchers enter codes directly
 * Keeping for backward compatibility
 */
export const getPendingInvitations = async (
  dispatcherId: string
): Promise<DispatcherCompanyAssociation[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('dispatcher_company_associations')
      .select(`
        *,
        company:companies(*),
        dispatcher:profiles!dispatcher_id(*)
      `)
      .eq('dispatcher_id', dispatcherId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending invitations:', error);
      return [];
    }

    return (data || []).map(mapAssociation);
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    return [];
  }
};

/**
 * Get unused invite codes for a company (for owner view)
 */
export const getUnusedInviteCodes = async (
  companyId: string
): Promise<DispatcherCompanyAssociation[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('dispatcher_company_associations')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .is('dispatcher_id', null) // Only unused codes
      .not('invite_code', 'is', null) // Must have a code
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unused invite codes:', error);
      return [];
    }

    // Filter out expired codes
    const now = new Date();
    return (data || [])
      .filter((item: any) => {
        if (!item.expires_at) return true; // No expiration
        return new Date(item.expires_at) > now;
      })
      .map(mapAssociation);
  } catch (error) {
    console.error('Error fetching unused invite codes:', error);
    return [];
  }
};

/**
 * Revoke an invite code (set status to inactive or delete)
 */
export const revokeInviteCode = async (
  associationId: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Check if code is already used
    const { data: association } = await supabase
      .from('dispatcher_company_associations')
      .select('dispatcher_id, status')
      .eq('id', associationId)
      .single();

    if (!association) {
      return { success: false, error: 'Invite code not found' };
    }

    // If already used, set to inactive instead of deleting
    if (association.dispatcher_id) {
      const { error: updateError } = await supabase
        .from('dispatcher_company_associations')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', associationId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      // If not used, delete the association
      const { error: deleteError } = await supabase
        .from('dispatcher_company_associations')
        .delete()
        .eq('id', associationId);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error revoking invite code:', error);
    return { success: false, error: error?.message || 'Failed to revoke invite code' };
  }
};

/**
 * Get active companies for a dispatcher with association details
 */
export const getActiveCompanies = async (
  dispatcherId: string
): Promise<Company[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('dispatcher_company_associations')
      .select(`
        company:companies(*)
      `)
      .eq('dispatcher_id', dispatcherId)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching active companies:', error);
      return [];
    }

    return (data || [])
      .map((item: any) => item.company)
      .filter((company: any) => company !== null)
      .map((company: any) => ({
        id: company.id,
        name: company.name,
        ownerId: company.owner_id,
        createdAt: company.created_at,
        updatedAt: company.updated_at
      }));
  } catch (error) {
    console.error('Error fetching active companies:', error);
    return [];
  }
};

/**
 * Get dispatcher's active associations with company details
 */
export const getDispatcherAssociationsWithCompanies = async (
  dispatcherId: string
): Promise<DispatcherCompanyAssociation[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('dispatcher_company_associations')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('dispatcher_id', dispatcherId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching dispatcher associations with companies:', error);
      return [];
    }

    return (data || []).map(mapAssociation);
  } catch (error) {
    console.error('Error fetching dispatcher associations with companies:', error);
    return [];
  }
};

/**
 * Helper function to map database record to DispatcherCompanyAssociation
 */
function mapAssociation(item: any): DispatcherCompanyAssociation {
  return {
    id: item.id,
    dispatcherId: item.dispatcher_id || undefined,
    companyId: item.company_id,
    feePercentage: parseFloat(item.fee_percentage) || 12.00,
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
    dispatcher: item.dispatcher ? {
      id: item.dispatcher.id,
      email: item.dispatcher.email,
      name: item.dispatcher.name,
      role: item.dispatcher.role,
      status: item.dispatcher.status,
      companyId: item.dispatcher.company_id
    } : undefined
  };
}

