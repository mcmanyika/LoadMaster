import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile } from '../types';

export interface AdminFilters {
  companyId?: string;
  startDate?: string;
  endDate?: string;
}

export interface UserStatistics {
  totalUsers: number;
  usersByRole: {
    owner: number;
    dispatcher: number;
    driver: number;
    dispatch_company: number;
  };
  activeUsers: number;
  inactiveUsers: number;
  recentSignups: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
  }>;
  usersBySubscriptionPlan: {
    essential: number;
    professional: number;
    enterprise: number;
    none: number;
  };
}

export interface CompanyStatistics {
  totalCompanies: number;
  activeCompanies: number;
  newCompanies: number;
  companiesByOwner: Array<{
    id: string;
    name: string;
    ownerId: string;
    ownerEmail: string;
    ownerName: string;
    createdAt: string;
  }>;
}

export interface LoadStatistics {
  totalLoads: number;
  totalGrossRevenue: number;
  averageRatePerMile: number;
  loadsByStatus: {
    factored: number;
    notYetFactored: number;
  };
  recentLoads: Array<{
    id: string;
    company: string;
    gross: number;
    miles: number;
    status: string;
    dropDate: string;
    createdAt: string;
  }>;
  loadsByMonth: Array<{
    month: string;
    count: number;
    revenue: number;
  }>;
}

export interface SubscriptionStatistics {
  activeSubscriptions: number;
  totalSubscriptions: number;
  revenueByPlan: {
    essential: number;
    professional: number;
    enterprise: number;
  };
  monthlyRecurringRevenue: number;
  churnRate: number;
  statusBreakdown: {
    active: number;
    canceled: number;
    completed: number;
    past_due: number;
  };
}

export interface FinancialStatistics {
  totalRevenue: number;
  totalDispatchFees: number;
  totalDriverPay: number;
  netProfit: number;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
}

export interface SystemHealth {
  contactSubmissions: number;
  recentContacts: Array<{
    id: string;
    name: string;
    email: string;
    message: string;
    createdAt: string;
  }>;
  databaseHealth: {
    profilesCount: number;
    companiesCount: number;
    loadsCount: number;
    subscriptionsCount: number;
  };
}

/**
 * Get all companies for admin filtering
 */
export const getAllCompanies = async (): Promise<Array<{ id: string; name: string; ownerId: string }>> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, owner_id')
      .order('name', { ascending: true });

    if (error) throw error;

    return (companies || []).map(c => ({
      id: c.id,
      name: c.name,
      ownerId: c.owner_id,
    }));
  } catch (error) {
    console.error('Error fetching all companies:', error);
    return [];
  }
};

/**
 * Get user statistics
 */
export const getUserStatistics = async (filters?: AdminFilters): Promise<UserStatistics> => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      totalUsers: 0,
      usersByRole: { owner: 0, dispatcher: 0, driver: 0, dispatch_company: 0 },
      activeUsers: 0,
      inactiveUsers: 0,
      recentSignups: [],
      usersBySubscriptionPlan: { essential: 0, professional: 0, enterprise: 0, none: 0 },
    };
  }

  try {
    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, name, role, status, subscription_plan, company_id, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    let users = profiles || [];
    
    // Apply company filter if provided
    if (filters?.companyId) {
      // Get all user IDs associated with this company through various means:
      // 1. Direct company_id in profiles
      // 2. Dispatcher associations
      // 3. Driver associations
      // 4. Company owner
      
      const associatedUserIds = new Set<string>();
      
      // 1. Users with direct company_id
      const directUsers = users.filter(u => u.company_id === filters.companyId);
      directUsers.forEach(u => associatedUserIds.add(u.id));
      
      // 2. Get company owner
      const { data: company } = await supabase
        .from('companies')
        .select('owner_id')
        .eq('id', filters.companyId)
        .single();
      
      if (company?.owner_id) {
        associatedUserIds.add(company.owner_id);
      }
      
      // 3. Get dispatchers associated with this company
      const { data: dispatcherAssociations, error: dispatcherError } = await supabase
        .from('dispatcher_company_associations')
        .select('dispatcher_id')
        .eq('company_id', filters.companyId)
        .eq('status', 'active');
      
      if (dispatcherError) {
        console.error('[getUserStatistics] Error fetching dispatcher associations:', dispatcherError);
      } else if (dispatcherAssociations) {
        dispatcherAssociations.forEach(a => {
          if (a.dispatcher_id) associatedUserIds.add(a.dispatcher_id);
        });
      }
      
      // 4. Get drivers associated with this company
      const { data: driverAssociations, error: driverError } = await supabase
        .from('driver_company_associations')
        .select('driver_id')
        .eq('company_id', filters.companyId)
        .eq('status', 'active');
      
      if (driverError) {
        console.error('[getUserStatistics] Error fetching driver associations:', driverError);
      } else if (driverAssociations) {
        driverAssociations.forEach(a => {
          if (a.driver_id) associatedUserIds.add(a.driver_id);
        });
      }
      
      // Filter users to only those associated with the company
      users = users.filter(u => associatedUserIds.has(u.id));
      
      // Debug logging
      console.log('[getUserStatistics] Company filter applied:', {
        companyId: filters.companyId,
        associatedUserIds: Array.from(associatedUserIds),
        filteredUsersCount: users.length,
        directUsersCount: directUsers.length,
        dispatcherAssociationsCount: dispatcherAssociations?.length || 0,
        driverAssociationsCount: driverAssociations?.length || 0,
        ownerId: company?.owner_id,
      });
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usersByRole = {
      owner: users.filter(u => u.role === 'owner').length,
      dispatcher: users.filter(u => u.role === 'dispatcher').length,
      driver: users.filter(u => u.role === 'driver').length,
      dispatch_company: users.filter(u => u.role === 'dispatch_company').length,
    };

    const activeUsers = users.filter(u => u.status === 'active' || !u.status).length;
    const inactiveUsers = users.filter(u => u.status === 'inactive').length;

    const recentSignups = users
      .filter(u => new Date(u.created_at) >= thirtyDaysAgo)
      .slice(0, 10)
      .map(u => ({
        id: u.id,
        email: u.email || '',
        name: u.name || 'Unknown',
        role: u.role || 'unknown',
        createdAt: u.created_at,
      }));

    const usersBySubscriptionPlan = {
      essential: users.filter(u => u.subscription_plan === 'essential').length,
      professional: users.filter(u => u.subscription_plan === 'professional').length,
      enterprise: users.filter(u => u.subscription_plan === 'enterprise').length,
      none: users.filter(u => !u.subscription_plan).length,
    };

    return {
      totalUsers: users.length,
      usersByRole,
      activeUsers,
      inactiveUsers,
      recentSignups,
      usersBySubscriptionPlan,
    };
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw error;
  }
};

/**
 * Get company statistics
 */
export const getCompanyStatistics = async (filters?: AdminFilters): Promise<CompanyStatistics> => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      totalCompanies: 0,
      activeCompanies: 0,
      newCompanies: 0,
      companiesByOwner: [],
    };
  }

  try {
    // Get all companies with owner info
    let query = supabase
      .from('companies')
      .select('id, name, owner_id, created_at')
      .order('created_at', { ascending: false });

    // Apply company filter if provided
    if (filters?.companyId) {
      query = query.eq('id', filters.companyId);
    }

    const { data: companies, error: companiesError } = await query;

    if (companiesError) throw companiesError;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newCompanies = (companies || []).filter(
      c => new Date(c.created_at) >= thirtyDaysAgo
    ).length;

    // Get active companies (with loads in last 30 days)
    const { data: recentLoads } = await supabase
      .from('loads')
      .select('company_id')
      .gte('drop_date', thirtyDaysAgo.toISOString().split('T')[0]);

    const activeCompanyIds = new Set((recentLoads || []).map(l => l.company_id));
    const activeCompanies = (companies || []).filter(c => activeCompanyIds.has(c.id)).length;

    // Get owner details for each company
    const companiesByOwner = await Promise.all(
      (companies || []).slice(0, 50).map(async (company) => {
        const { data: owner } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('id', company.owner_id)
          .single();

        return {
          id: company.id,
          name: company.name,
          ownerId: company.owner_id,
          ownerEmail: owner?.email || 'Unknown',
          ownerName: owner?.name || 'Unknown',
          createdAt: company.created_at,
        };
      })
    );

    return {
      totalCompanies: (companies || []).length,
      activeCompanies,
      newCompanies,
      companiesByOwner,
    };
  } catch (error) {
    console.error('Error fetching company statistics:', error);
    throw error;
  }
};

/**
 * Get load statistics
 */
export const getLoadStatistics = async (filters?: AdminFilters): Promise<LoadStatistics> => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      totalLoads: 0,
      totalGrossRevenue: 0,
      averageRatePerMile: 0,
      loadsByStatus: { factored: 0, notYetFactored: 0 },
      recentLoads: [],
      loadsByMonth: [],
    };
  }

  try {
    let query = supabase
      .from('loads')
      .select('id, company, gross, miles, status, drop_date, created_at, company_id')
      .order('created_at', { ascending: false });

    // Apply company filter if provided
    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }

    // Apply date filter if provided
    if (filters?.startDate) {
      query = query.gte('drop_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('drop_date', filters.endDate);
    }

    const { data: loads, error } = await query;

    if (error) throw error;

    const allLoads = loads || [];
    const totalGrossRevenue = allLoads.reduce((sum, l) => sum + (l.gross || 0), 0);
    const totalMiles = allLoads.reduce((sum, l) => sum + (l.miles || 0), 0);
    const averageRatePerMile = totalMiles > 0 ? totalGrossRevenue / totalMiles : 0;

    const loadsByStatus = {
      factored: allLoads.filter(l => l.status === 'Factored').length,
      notYetFactored: allLoads.filter(l => l.status === 'Not yet Factored').length,
    };

    const recentLoads = allLoads.slice(0, 20).map(l => ({
      id: l.id,
      company: l.company || 'Unknown',
      gross: l.gross || 0,
      miles: l.miles || 0,
      status: l.status || 'Unknown',
      dropDate: l.drop_date,
      createdAt: l.created_at,
    }));

    // Group by month
    const loadsByMonthMap = new Map<string, { count: number; revenue: number }>();
    allLoads.forEach(load => {
      const date = new Date(load.drop_date || load.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = loadsByMonthMap.get(monthKey) || { count: 0, revenue: 0 };
      loadsByMonthMap.set(monthKey, {
        count: current.count + 1,
        revenue: current.revenue + (load.gross || 0),
      });
    });

    const loadsByMonth = Array.from(loadsByMonthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months

    return {
      totalLoads: allLoads.length,
      totalGrossRevenue,
      averageRatePerMile,
      loadsByStatus,
      recentLoads,
      loadsByMonth,
    };
  } catch (error) {
    console.error('Error fetching load statistics:', error);
    throw error;
  }
};

/**
 * Get subscription statistics
 */
export const getSubscriptionStatistics = async (filters?: AdminFilters): Promise<SubscriptionStatistics> => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      activeSubscriptions: 0,
      totalSubscriptions: 0,
      revenueByPlan: { essential: 0, professional: 0, enterprise: 0 },
      monthlyRecurringRevenue: 0,
      churnRate: 0,
      statusBreakdown: { active: 0, canceled: 0, completed: 0, past_due: 0 },
    };
  }

  try {
    let query = supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply date filter if provided
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    // Apply company filter if provided (filter by user's company)
    if (filters?.companyId) {
      // Get all user IDs for this company
      const { data: companyUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', filters.companyId);
      
      if (companyUsers && companyUsers.length > 0) {
        const userIds = companyUsers.map(u => u.id);
        query = query.in('user_id', userIds);
      } else {
        // No users in this company, return empty stats
        return {
          activeSubscriptions: 0,
          totalSubscriptions: 0,
          revenueByPlan: { essential: 0, professional: 0, enterprise: 0 },
          monthlyRecurringRevenue: 0,
          churnRate: 0,
          statusBreakdown: { active: 0, canceled: 0, completed: 0, past_due: 0 },
        };
      }
    }

    const { data: subscriptions, error } = await query;

    if (error) throw error;

    const allSubs = subscriptions || [];
    const activeSubs = allSubs.filter(s => s.status === 'active');

    const revenueByPlan = {
      essential: activeSubs
        .filter(s => s.plan === 'essential')
        .reduce((sum, s) => {
          const amount = parseFloat(s.amount || 0);
          return sum + (s.interval === 'year' ? amount / 12 : amount);
        }, 0),
      professional: activeSubs
        .filter(s => s.plan === 'professional')
        .reduce((sum, s) => {
          const amount = parseFloat(s.amount || 0);
          return sum + (s.interval === 'year' ? amount / 12 : amount);
        }, 0),
      enterprise: activeSubs
        .filter(s => s.plan === 'enterprise')
        .reduce((sum, s) => {
          const amount = parseFloat(s.amount || 0);
          return sum + (s.interval === 'year' ? amount / 12 : amount);
        }, 0),
    };

    const monthlyRecurringRevenue = Object.values(revenueByPlan).reduce((a, b) => a + b, 0);

    const statusBreakdown = {
      active: allSubs.filter(s => s.status === 'active').length,
      canceled: allSubs.filter(s => s.status === 'canceled').length,
      completed: allSubs.filter(s => s.status === 'completed').length,
      past_due: allSubs.filter(s => s.status === 'past_due').length,
    };

    const churnRate = allSubs.length > 0 
      ? (statusBreakdown.canceled / allSubs.length) * 100 
      : 0;

    return {
      activeSubscriptions: activeSubs.length,
      totalSubscriptions: allSubs.length,
      revenueByPlan,
      monthlyRecurringRevenue,
      churnRate,
      statusBreakdown,
    };
  } catch (error) {
    console.error('Error fetching subscription statistics:', error);
    throw error;
  }
};

/**
 * Get financial statistics
 */
export const getFinancialStatistics = async (filters?: AdminFilters): Promise<FinancialStatistics> => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      totalRevenue: 0,
      totalDispatchFees: 0,
      totalDriverPay: 0,
      netProfit: 0,
      monthlyRevenue: [],
    };
  }

  try {
    const loadStats = await getLoadStatistics(filters);
    
    // For financial calculations, we need to estimate dispatch fees and driver pay
    // This is a simplified calculation - in reality, these would come from calculated loads
    const estimatedDispatchFeePercentage = 12; // 12% average
    const estimatedDriverPayPercentage = 30; // 30% average estimate
    
    const totalDispatchFees = loadStats.totalGrossRevenue * (estimatedDispatchFeePercentage / 100);
    const totalDriverPay = loadStats.totalGrossRevenue * (estimatedDriverPayPercentage / 100);
    const netProfit = loadStats.totalGrossRevenue - totalDispatchFees - totalDriverPay;

    const monthlyRevenue = loadStats.loadsByMonth.map(m => ({
      month: m.month,
      revenue: m.revenue,
    }));

    return {
      totalRevenue: loadStats.totalGrossRevenue,
      totalDispatchFees,
      totalDriverPay,
      netProfit,
      monthlyRevenue,
    };
  } catch (error) {
    console.error('Error fetching financial statistics:', error);
    throw error;
  }
};

/**
 * Get system health
 */
export const getSystemHealth = async (): Promise<SystemHealth> => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      contactSubmissions: 0,
      recentContacts: [],
      databaseHealth: {
        profilesCount: 0,
        companiesCount: 0,
        loadsCount: 0,
        subscriptionsCount: 0,
      },
    };
  }

  try {
    // Get contact submissions
    const { data: contacts } = await supabase
      .from('contact_us')
      .select('id, name, email, message, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get database counts
    const [
      { count: profilesCount },
      { count: companiesCount },
      { count: loadsCount },
      { count: subscriptionsCount },
      { count: contactCount },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('loads').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }),
      supabase.from('contact_us').select('*', { count: 'exact', head: true }),
    ]);

    return {
      contactSubmissions: contactCount || 0,
      recentContacts: (contacts || []).map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        message: c.message,
        createdAt: c.created_at,
      })),
      databaseHealth: {
        profilesCount: profilesCount || 0,
        companiesCount: companiesCount || 0,
        loadsCount: loadsCount || 0,
        subscriptionsCount: subscriptionsCount || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching system health:', error);
    throw error;
  }
};

/**
 * Get all admin statistics
 */
export const getAllAdminStatistics = async (filters?: AdminFilters) => {
  try {
    const [
      userStats,
      companyStats,
      loadStats,
      subscriptionStats,
      financialStats,
      systemHealth,
    ] = await Promise.all([
      getUserStatistics(filters),
      getCompanyStatistics(filters),
      getLoadStatistics(filters),
      getSubscriptionStatistics(filters),
      getFinancialStatistics(filters),
      getSystemHealth(),
    ]);

    return {
      userStats,
      companyStats,
      loadStats,
      subscriptionStats,
      financialStats,
      systemHealth,
    };
  } catch (error) {
    console.error('Error fetching all admin statistics:', error);
    throw error;
  }
};

