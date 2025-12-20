import { supabase, isSupabaseConfigured } from './supabaseClient';
import { createClient } from '@supabase/supabase-js';

export interface ContactSubmission {
  id?: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message: string;
  status?: 'new' | 'read' | 'replied' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

// Mock data for demo mode
const MOCK_CONTACTS: ContactSubmission[] = [];

/**
 * Submit a contact form from the landing page
 */
export const submitContactForm = async (contact: Omit<ContactSubmission, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ContactSubmission> => {
  if (!isSupabaseConfigured || !supabase) {
    // Demo mode - store in mock data
    const newContact: ContactSubmission = {
      ...contact,
      id: Math.random().toString(36).substr(2, 9),
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    MOCK_CONTACTS.push(newContact);
    console.log('Contact form submitted (demo mode):', newContact);
    return newContact;
  }

  try {
    // Create a fresh anonymous client to ensure we're using anon role
    // This bypasses any potential session issues
    const supabaseUrl = supabase.supabaseUrl;
    const supabaseKey = supabase.supabaseKey;
    
    // Create a new client instance with no session
    const anonClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    
    // Explicitly sign out to ensure anonymous role
    await anonClient.auth.signOut();
    
    console.log('Using anonymous Supabase client for contact form submission');

    const insertData = {
      name: contact.name,
      email: contact.email,
      company: contact.company || null,
      phone: contact.phone || null,
      message: contact.message,
      status: 'new'
    };
    
    console.log('Inserting contact data:', insertData);

    const { data, error } = await anonClient
      .from('contact_us')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error submitting contact form:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      company: data.company || undefined,
      phone: data.phone || undefined,
      message: data.message,
      status: data.status as 'new' | 'read' | 'replied' | 'archived',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error: any) {
    console.error('Error in submitContactForm:', error);
    throw error;
  }
};

/**
 * Get all contact submissions (for admin/owner view)
 */
export const getContactSubmissions = async (): Promise<ContactSubmission[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return MOCK_CONTACTS;
  }

  try {
    const { data, error } = await supabase
      .from('contact_us')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contact submissions:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      company: item.company || undefined,
      phone: item.phone || undefined,
      message: item.message,
      status: item.status as 'new' | 'read' | 'replied' | 'archived',
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error: any) {
    console.error('Error in getContactSubmissions:', error);
    throw error;
  }
};

/**
 * Update contact submission status
 */
export const updateContactStatus = async (
  id: string,
  status: 'new' | 'read' | 'replied' | 'archived'
): Promise<ContactSubmission> => {
  if (!isSupabaseConfigured || !supabase) {
    const contact = MOCK_CONTACTS.find(c => c.id === id);
    if (!contact) throw new Error('Contact submission not found');
    contact.status = status;
    contact.updatedAt = new Date().toISOString();
    return contact;
  }

  try {
    const { data, error } = await supabase
      .from('contact_us')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact status:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      company: data.company || undefined,
      phone: data.phone || undefined,
      message: data.message,
      status: data.status as 'new' | 'read' | 'replied' | 'archived',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error: any) {
    console.error('Error in updateContactStatus:', error);
    throw error;
  }
};

