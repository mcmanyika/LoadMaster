import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_BUCKET = 'rate-confirmations';

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
      return { url: null, error };
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

