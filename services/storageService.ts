import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_BUCKET = 'rate-confirmations';
const EXPENSE_RECEIPTS_BUCKET = 'expense-receipts';

/**
 * Upload a Rate Confirmation PDF to Supabase Storage
 */
export const uploadRateConfirmationPdf = async (
  file: File,
  loadId: string
): Promise<{ url: string | null; error: Error | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { url: null, error: new Error('Supabase not configured') };
  }

  try {
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${loadId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload the file
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading PDF:', error);
      // Provide more helpful error messages
      let errorMessage = error.message || 'Unknown error';
      if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
        errorMessage = `Storage bucket '${STORAGE_BUCKET}' does not exist. Please create it in your Supabase Dashboard or run: node scripts/create-storage-bucket.js`;
      } else if (error.message?.includes('new row violates row-level security')) {
        errorMessage = 'Permission denied. Please check your storage bucket policies.';
      }
      return { url: null, error: new Error(errorMessage) };
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('Error in uploadRateConfirmationPdf:', error);
    return { url: null, error: error as Error };
  }
};

/**
 * Delete a Rate Confirmation PDF from Supabase Storage
 */
export const deleteRateConfirmationPdf = async (
  fileUrl: string
): Promise<{ error: Error | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    // Extract the file path from the URL
    const urlParts = fileUrl.split('/');
    const filePath = urlParts[urlParts.length - 1];

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting PDF:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Error in deleteRateConfirmationPdf:', error);
    return { error: error as Error };
  }
};

/**
 * Upload an Expense Receipt (PDF or image) to Supabase Storage
 */
export const uploadExpenseReceipt = async (
  file: File,
  expenseId: string
): Promise<{ url: string | null; error: Error | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { url: null, error: new Error('Supabase not configured') };
  }

  try {
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${expenseId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload the file
    const { data, error } = await supabase.storage
      .from(EXPENSE_RECEIPTS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading expense receipt:', error);
      // Provide more helpful error messages
      let errorMessage = error.message || 'Unknown error';
      if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
        errorMessage = `Storage bucket '${EXPENSE_RECEIPTS_BUCKET}' does not exist. Please create it in your Supabase Dashboard.`;
      } else if (error.message?.includes('new row violates row-level security')) {
        errorMessage = 'Permission denied. Please check your storage bucket policies.';
      }
      return { url: null, error: new Error(errorMessage) };
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(EXPENSE_RECEIPTS_BUCKET)
      .getPublicUrl(filePath);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('Error in uploadExpenseReceipt:', error);
    return { url: null, error: error as Error };
  }
};

/**
 * Delete an Expense Receipt from Supabase Storage
 */
export const deleteExpenseReceipt = async (
  fileUrl: string
): Promise<{ error: Error | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    // Extract the file path from the URL
    const urlParts = fileUrl.split('/');
    const filePath = urlParts[urlParts.length - 1];

    const { error } = await supabase.storage
      .from(EXPENSE_RECEIPTS_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting expense receipt:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Error in deleteExpenseReceipt:', error);
    return { error: error as Error };
  }
};

