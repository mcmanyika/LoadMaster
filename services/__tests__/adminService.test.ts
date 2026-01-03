import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabaseClient before importing the service
vi.mock('../supabaseClient', () => {
  const mockSupabaseClient = {
    from: vi.fn(() => mockSupabaseClient),
    select: vi.fn(() => mockSupabaseClient),
    insert: vi.fn(() => mockSupabaseClient),
    update: vi.fn(() => mockSupabaseClient),
    delete: vi.fn(() => mockSupabaseClient),
    eq: vi.fn(() => mockSupabaseClient),
    order: vi.fn(() => mockSupabaseClient),
    then: vi.fn((resolve) => resolve({ data: null, error: null })),
  };

  return {
    supabase: {
      auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      },
      from: vi.fn(() => mockSupabaseClient),
    },
    isSupabaseConfigured: true,
  };
});

import { getAllCompanies } from '../adminService';

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllCompanies', () => {
    it('should return array structure', async () => {
      // This is a basic test structure - will need proper mock setup for full functionality
      const result = await getAllCompanies();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
