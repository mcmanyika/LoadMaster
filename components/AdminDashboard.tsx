import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Truck,
  CreditCard,
  DollarSign,
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Filter,
  X,
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import {
  getAllAdminStatistics,
  getAllCompanies,
  UserStatistics,
  CompanyStatistics,
  LoadStatistics,
  SubscriptionStatistics,
  FinancialStatistics,
  SystemHealth,
  AdminFilters,
} from '../services/adminService';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

export const AdminDashboard: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStatistics | null>(null);
  const [companyStats, setCompanyStats] = useState<CompanyStatistics | null>(null);
  const [loadStats, setLoadStats] = useState<LoadStatistics | null>(null);
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStatistics | null>(null);
  const [financialStats, setFinancialStats] = useState<FinancialStatistics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; ownerId: string }>>([]);
  const [filters, setFilters] = useState<AdminFilters>({});

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const allCompanies = await getAllCompanies();
        setCompanies(allCompanies);
      } catch (err) {
        console.error('Error loading companies:', err);
      }
    };
    loadCompanies();
  }, []);

  const loadData = async (currentFilters?: AdminFilters) => {
    setLoading(true);
    setError(null);
    try {
      const filtersToUse = currentFilters !== undefined ? currentFilters : filters;
      const data = await getAllAdminStatistics(filtersToUse);
      setUserStats(data.userStats);
      setCompanyStats(data.companyStats);
      setLoadStats(data.loadStats);
      setSubscriptionStats(data.subscriptionStats);
      setFinancialStats(data.financialStats);
      setSystemHealth(data.systemHealth);
    } catch (err: any) {
      console.error('Error loading admin statistics:', err);
      setError(err.message || 'Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading admin statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Admin Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">System-wide overview and statistics</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Filter size={20} className="text-slate-600 dark:text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Filters</h2>
          {(filters.companyId || filters.startDate || filters.endDate) && (
            <button
              onClick={() => setFilters({})}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={16} />
              Clear Filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Company
            </label>
            <select
              value={filters.companyId || ''}
              onChange={(e) => setFilters({ ...filters, companyId: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={formatNumber(userStats?.totalUsers || 0)}
          icon={<Users size={24} className="text-blue-600" />}
          colorClass="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatsCard
          title="Total Companies"
          value={formatNumber(companyStats?.totalCompanies || 0)}
          icon={<Building2 size={24} className="text-green-600" />}
          colorClass="bg-green-100 dark:bg-green-900/30"
        />
        <StatsCard
          title="Total Loads"
          value={formatNumber(loadStats?.totalLoads || 0)}
          icon={<Truck size={24} className="text-purple-600" />}
          colorClass="bg-purple-100 dark:bg-purple-900/30"
        />
        <StatsCard
          title="Active Subscriptions"
          value={formatNumber(subscriptionStats?.activeSubscriptions || 0)}
          icon={<CreditCard size={24} className="text-orange-600" />}
          colorClass="bg-orange-100 dark:bg-orange-900/30"
        />
      </div>

      {/* Revenue and MRR Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(loadStats?.totalGrossRevenue || 0)}
          icon={<DollarSign size={24} className="text-emerald-600" />}
          colorClass="bg-emerald-100 dark:bg-emerald-900/30"
        />
        <StatsCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(subscriptionStats?.monthlyRecurringRevenue || 0)}
          icon={<TrendingUp size={24} className="text-blue-600" />}
          colorClass="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatsCard
          title="Net Profit (Est.)"
          value={formatCurrency(financialStats?.netProfit || 0)}
          icon={<Activity size={24} className="text-green-600" />}
          colorClass="bg-green-100 dark:bg-green-900/30"
        />
      </div>

      {/* User Management Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">User Management</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{userStats?.usersByRole.owner || 0}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Owners</p>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{userStats?.usersByRole.dispatcher || 0}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Dispatchers</p>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{userStats?.usersByRole.driver || 0}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Drivers</p>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{userStats?.usersByRole.dispatch_company || 0}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Dispatch Cos.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Users by Subscription Plan</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Essential</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{userStats?.usersBySubscriptionPlan.essential || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Professional</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{userStats?.usersBySubscriptionPlan.professional || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Enterprise</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{userStats?.usersBySubscriptionPlan.enterprise || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">No Plan</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{userStats?.usersBySubscriptionPlan.none || 0}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Recent Signups (Last 30 Days)</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {userStats?.recentSignups.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-sm">No recent signups</p>
              ) : (
                userStats?.recentSignups.map((user) => (
                  <div key={user.id} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email} • {user.role}</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Company Statistics Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Company Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{companyStats?.totalCompanies || 0}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Total Companies</p>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{companyStats?.activeCompanies || 0}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Active Companies</p>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{companyStats?.newCompanies || 0}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">New (Last 30 Days)</p>
          </div>
        </div>
      </div>

      {/* Load Analytics Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Load Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(loadStats?.averageRatePerMile || 0)}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Avg Rate/Mile</p>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{loadStats?.loadsByStatus.factored || 0}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Factored</p>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{loadStats?.loadsByStatus.notYetFactored || 0}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Not Yet Factored</p>
          </div>
        </div>
        {loadStats && loadStats.loadsByMonth.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Loads by Month</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={loadStats.loadsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#475569' : '#e2e8f0'} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#64748b', fontSize: 12 }}
                />
                <YAxis tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#64748b', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                    border: theme === 'dark' ? '1px solid #334155' : 'none',
                    color: theme === 'dark' ? '#ffffff' : '#1e293b',
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" name="Loads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Subscription Metrics Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Subscription Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Revenue by Plan (MRR)</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Essential</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(subscriptionStats?.revenueByPlan.essential || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Professional</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(subscriptionStats?.revenueByPlan.professional || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Enterprise</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(subscriptionStats?.revenueByPlan.enterprise || 0)}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Status Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Active</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{subscriptionStats?.statusBreakdown.active || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Canceled</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{subscriptionStats?.statusBreakdown.canceled || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Completed</span>
                <span className="font-semibold text-slate-600 dark:text-slate-400">{subscriptionStats?.statusBreakdown.completed || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Past Due</span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">{subscriptionStats?.statusBreakdown.past_due || 0}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400">Churn Rate</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{subscriptionStats?.churnRate.toFixed(1) || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview Section */}
      {financialStats && financialStats.monthlyRevenue.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Financial Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(financialStats.totalDispatchFees)}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Dispatch Fees</p>
            </div>
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(financialStats.totalDriverPay)}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Driver Pay</p>
            </div>
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(financialStats.netProfit)}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Net Profit (Est.)</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Monthly Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={financialStats.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#475569' : '#e2e8f0'} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#64748b', fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                    border: theme === 'dark' ? '1px solid #334155' : 'none',
                    color: theme === 'dark' ? '#ffffff' : '#1e293b',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* System Health Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Database Health</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Profiles</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatNumber(systemHealth?.databaseHealth.profilesCount || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Companies</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatNumber(systemHealth?.databaseHealth.companiesCount || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Loads</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatNumber(systemHealth?.databaseHealth.loadsCount || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Subscriptions</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{formatNumber(systemHealth?.databaseHealth.subscriptionsCount || 0)}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Contact Submissions ({systemHealth?.contactSubmissions || 0})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {systemHealth?.recentContacts.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-sm">No contact submissions</p>
              ) : (
                systemHealth?.recentContacts.map((contact) => (
                  <div key={contact.id} className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{contact.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{contact.email}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{contact.message}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

