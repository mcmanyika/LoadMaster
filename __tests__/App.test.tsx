import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabaseClient first
vi.mock('../services/supabaseClient', () => {
  const mockSupabaseClient = {
    from: vi.fn(() => mockSupabaseClient),
    select: vi.fn(() => mockSupabaseClient),
    insert: vi.fn(() => mockSupabaseClient),
    update: vi.fn(() => mockSupabaseClient),
    delete: vi.fn(() => mockSupabaseClient),
    eq: vi.fn(() => mockSupabaseClient),
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    then: vi.fn((resolve) => resolve({ data: [], error: null })),
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

// Mock authService
vi.mock('../services/authService', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(null)),
  signOut: vi.fn(() => Promise.resolve()),
}));

// Mock pricingService
vi.mock('../services/pricingService', () => ({
  getSubscriptionPlans: vi.fn(() => Promise.resolve({
    essential: { monthly: 100, annual: 1000 },
    professional: { monthly: 200, annual: 2000 },
  })),
}));

import { render, screen, waitFor } from '../test/utils/testUtils';
import App from '../App';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders app without crashing', async () => {
    render(<App />);
    
    // Basic smoke test - just verify the app renders
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
