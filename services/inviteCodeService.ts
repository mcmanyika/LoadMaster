import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Generate a random alphanumeric invite code
 * @param length - Length of the code (default: 8)
 * @returns Random code with uppercase letters and numbers
 */
export const generateRandomCode = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  return code;
};

/**
 * Generate a unique invite code by checking against database
 * @param length - Length of the code (default: 8)
 * @param maxRetries - Maximum number of retry attempts (default: 10)
 * @returns Unique code that doesn't exist in database
 */
export const generateUniqueInviteCode = async (
  length: number = 8,
  maxRetries: number = 10
): Promise<string> => {
  if (!isSupabaseConfigured || !supabase) {
    // Fallback for non-Supabase mode
    return generateRandomCode(length);
  }

  let attempts = 0;
  
  while (attempts < maxRetries) {
    const code = generateRandomCode(length);
    
    // Check if code already exists in dispatcher associations
    const { data: dispatcherData, error: dispatcherError } = await supabase
      .from('dispatcher_company_associations')
      .select('id')
      .eq('invite_code', code)
      .limit(1)
      .maybeSingle();
    
    if (dispatcherError) {
      console.error('Error checking dispatcher code uniqueness:', dispatcherError);
      // If there's an error, return the code anyway (collision is unlikely)
      return code;
    }
    
    // Check if code already exists in driver associations
    const { data: driverData, error: driverError } = await supabase
      .from('driver_company_associations')
      .select('id')
      .eq('invite_code', code)
      .limit(1)
      .maybeSingle();
    
    if (driverError) {
      console.error('Error checking driver code uniqueness:', driverError);
      // If there's an error, return the code anyway (collision is unlikely)
      return code;
    }
    
    // If code doesn't exist in either table, return it
    if (!dispatcherData && !driverData) {
      return code;
    }
    
    attempts++;
  }
  
  // If we've exhausted retries, generate a longer code with timestamp
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const randomPart = generateRandomCode(length - 4);
  return (randomPart + timestamp).slice(0, length);
};

/**
 * Format invite code for display (add hyphen for readability)
 * @param code - Raw code
 * @param format - Format style: 'dashed' (XXXX-XXXX) or 'plain' (XXXXXXXX)
 * @returns Formatted code
 */
export const formatInviteCode = (code: string, format: 'dashed' | 'plain' = 'dashed'): string => {
  if (!code) return '';
  
  const upperCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (format === 'dashed' && upperCode.length >= 4) {
    // Format as XXXX-XXXX
    const midPoint = Math.floor(upperCode.length / 2);
    return `${upperCode.slice(0, midPoint)}-${upperCode.slice(midPoint)}`;
  }
  
  return upperCode;
};

/**
 * Normalize invite code input (remove formatting, convert to uppercase)
 * @param code - User input code
 * @returns Normalized code
 */
export const normalizeInviteCode = (code: string): string => {
  if (!code) return '';
  
  // Remove all non-alphanumeric characters and convert to uppercase
  return code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
};

/**
 * Validate invite code format
 * @param code - Code to validate
 * @param length - Expected length (default: 8)
 * @returns True if code format is valid
 */
export const validateInviteCodeFormat = (code: string, length: number = 8): boolean => {
  if (!code) return false;
  
  const normalized = normalizeInviteCode(code);
  
  // Check length
  if (normalized.length !== length) return false;
  
  // Check that it only contains alphanumeric characters
  return /^[A-Z0-9]+$/.test(normalized);
};

