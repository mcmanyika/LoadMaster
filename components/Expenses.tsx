import React, { useState, useEffect, useMemo } from 'react';
import { Expense, ExpenseCategory, UserProfile, Transporter, Driver } from '../types';
import { getExpenses, getExpenseCategories, getExpenseSummary, createExpense, updateExpense, deleteExpense } from '../services/expenseService';
import { getTransporters } from '../services/loadService';
import { getCompanyDrivers } from '../services/driverAssociationService';
import { supabase } from '../services/supabaseClient';
import { ExpenseForm } from './ExpenseForm';
import { StatsCard } from './StatsCard';
import { ErrorModal } from './ErrorModal';
import { exportToCSV, exportExpensesToPDF } from '../services/reports/reportService';
import { Plus, DollarSign, TrendingUp, Calendar, Filter, X, Search, Edit, Trash2, FileText, Receipt, Download, FileDown } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

interface ExpensesProps {
  user: UserProfile;
  companyId: string;
}

export const Expenses: React.FC<ExpensesProps> = ({ user, companyId }) => {
  const { theme } = useTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | undefined>();
  const [summary, setSummary] = useState<any>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('');
  const [driverFilter, setDriverFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

  useEffect(() => {
    fetchData();
  }, [companyId, startDate, endDate, categoryFilter, vehicleFilter, driverFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (categoryFilter) filters.categoryId = categoryFilter;
      if (vehicleFilter) filters.vehicleId = vehicleFilter;
      if (driverFilter) filters.driverId = driverFilter;

      const [expensesData, categoriesData, transportersData, summaryData] = await Promise.all([
        getExpenses(companyId, filters),
        getExpenseCategories(),
        getTransporters(),
        getExpenseSummary(companyId, startDate || undefined, endDate || undefined)
      ]);

      // Fetch drivers from associations to avoid duplicates
      const driverAssociations = await getCompanyDrivers(companyId);
      const activeDriverAssociations = driverAssociations.filter(a => a.status === 'active' && a.driverId && a.driver);
      
      // Get unique drivers by profile_id and fetch/create driver records
      const profileIdSet = new Set<string>();
      const driversData: Driver[] = [];
      
      for (const association of activeDriverAssociations) {
        if (!association.driverId || !association.driver) continue;
        
        const profileId = association.driverId;
        // Skip if we've already processed this profile
        if (profileIdSet.has(profileId)) continue;
        profileIdSet.add(profileId);
        
        // Check if driver record exists
        const { data: existingDriver } = await supabase
          .from('drivers')
          .select('id, name, phone, email, transporter_id, company_id')
          .eq('profile_id', profileId)
          .eq('company_id', companyId)
          .maybeSingle();
        
        if (existingDriver) {
          driversData.push({
            id: existingDriver.id,
            name: existingDriver.name,
            email: existingDriver.email || association.driver.email || '',
            phone: existingDriver.phone || association.driver.phone || '',
            transporterId: existingDriver.transporter_id || '',
            companyId: existingDriver.company_id
          });
        } else {
          // Create driver record if it doesn't exist
          const { data: newDriver } = await supabase
            .from('drivers')
            .insert([{
              name: association.driver.name || association.driver.email || 'Unknown',
              phone: association.driver.phone || null,
              email: association.driver.email || null,
              profile_id: profileId,
              company_id: companyId,
              transporter_id: null
            }])
            .select('id, name, phone, email, transporter_id, company_id')
            .single();
          
          if (newDriver) {
            driversData.push({
              id: newDriver.id,
              name: newDriver.name,
              email: newDriver.email || association.driver.email || '',
              phone: newDriver.phone || association.driver.phone || '',
              transporterId: newDriver.transporter_id || '',
              companyId: newDriver.company_id
            });
          }
        }
      }
      
      // Deduplicate by name as well (in case of any remaining duplicates)
      const driversByName = new Map<string, Driver>();
      driversData.forEach(driver => {
        const key = driver.name.toLowerCase().trim();
        if (!driversByName.has(key)) {
          driversByName.set(key, driver);
        }
      });
      const finalDrivers = Array.from(driversByName.values());

      setExpenses(expensesData);
      setCategories(categoriesData);
      setTransporters(transportersData);
      setDrivers(finalDrivers);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = () => {
    setExpenseToEdit(undefined);
    setIsFormOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense);
    setIsFormOpen(true);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    const result = await deleteExpense(id);
    if (result.error) {
      setErrorModal({ isOpen: true, message: 'Failed to delete expense: ' + result.error.message });
      return;
    }
    fetchData();
  };

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'category' | 'vehicleName' | 'driverName' | 'loadCompany'>) => {
    if (expenseToEdit) {
      const result = await updateExpense(expenseToEdit.id, expenseData);
      if (result.error) {
        setErrorModal({ isOpen: true, message: 'Failed to update expense: ' + result.error.message });
        return;
      }
    } else {
      const result = await createExpense(expenseData);
      if (result.error) {
        setErrorModal({ isOpen: true, message: 'Failed to create expense: ' + result.error.message });
        return;
      }
    }
    setIsFormOpen(false);
    setExpenseToEdit(undefined);
    fetchData();
  };

  // Filter expenses by search query
  const filteredExpenses = useMemo(() => {
    if (!searchQuery) return expenses;
    const query = searchQuery.toLowerCase();
    return expenses.filter(exp => 
      exp.description?.toLowerCase().includes(query) ||
      exp.vendor?.toLowerCase().includes(query) ||
      exp.category?.name.toLowerCase().includes(query)
    );
  }, [expenses, searchQuery]);

  // Calculate this month's expenses
  const thisMonthExpenses = useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return expenses
      .filter(exp => new Date(exp.expenseDate) >= firstDay)
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  // Chart data for expenses by category
  const categoryChartData = useMemo(() => {
    if (!summary?.expensesByCategory) return [];
    return summary.expensesByCategory.slice(0, 5).map((item: any) => ({
      name: item.categoryName,
      value: item.total
    }));
  }, [summary]);

  // Chart data for monthly trends
  const monthlyChartData = useMemo(() => {
    if (!summary?.expensesByMonth) return [];
    return summary.expensesByMonth.slice(-6).map((item: any) => ({
      month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      total: item.total
    }));
  }, [summary]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  // Export functions
  const handleExportCSV = () => {
    const csvData = filteredExpenses.map(exp => ({
      'Date': new Date(exp.expenseDate).toLocaleDateString(),
      'Category': exp.category?.name || 'N/A',
      'Description': exp.description || 'N/A',
      'Vendor': exp.vendor || 'N/A',
      'Amount': exp.amount.toFixed(2),
      'Vehicle': exp.vehicleName || 'N/A',
      'Driver': exp.driverName || 'N/A',
      'Load': exp.loadCompany || 'N/A',
      'Payment Method': exp.paymentMethod ? exp.paymentMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A',
      'Payment Status': exp.paymentStatus ? exp.paymentStatus.charAt(0).toUpperCase() + exp.paymentStatus.slice(1) : 'N/A',
      'Recurring': exp.recurringFrequency || 'N/A'
    }));
    const result = exportToCSV(csvData, `expenses-${new Date().toISOString().split('T')[0]}`);
    if (!result.success && result.error) {
      setErrorModal({ isOpen: true, message: result.error });
    }
  };

  const handleExportPDF = () => {
    const result = exportExpensesToPDF(filteredExpenses, `expenses-${new Date().toISOString().split('T')[0]}`);
    if (!result.success && result.error) {
      setErrorModal({ isOpen: true, message: result.error });
    }
  };

  if (loading && expenses.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-12">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Expenses"
          value={`$${summary?.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
          subValue={startDate || endDate ? 'Filtered period' : 'All time'}
          icon={<DollarSign className="w-6 h-6 text-slate-900" />}
          colorClass="bg-slate-100"
        />
        <StatsCard
          title="This Month"
          value={`$${thisMonthExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue="Current month"
          icon={<Calendar className="w-6 h-6 text-slate-900" />}
          colorClass="bg-slate-100"
        />
        <StatsCard
          title="Average Expense"
          value={`$${summary?.averageExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
          subValue={`${expenses.length} expenses`}
          icon={<TrendingUp className="w-6 h-6 text-slate-900" />}
          colorClass="bg-slate-100"
        />
        <StatsCard
          title="Largest Expense"
          value={summary?.largestExpense ? `$${summary.largestExpense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
          subValue={summary?.largestExpense?.category?.name || 'N/A'}
          icon={<Receipt className="w-6 h-6 text-slate-900" />}
          colorClass="bg-slate-100"
        />
      </div>

      {/* Charts */}
      {(categoryChartData.length > 0 || monthlyChartData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categoryChartData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Top Categories</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryChartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#ffffff' }}
                    labelStyle={{ color: '#ffffff' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {monthlyChartData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Monthly Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={theme === 'dark' ? '#475569' : '#cbd5e1'} 
                  />
                  <XAxis 
                    dataKey="month" 
                    stroke={theme === 'dark' ? '#cbd5e1' : '#64748b'}
                    tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke={theme === 'dark' ? '#cbd5e1' : '#64748b'}
                    tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', 
                      border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0', 
                      color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
                      borderRadius: '8px'
                    }}
                    cursor={{ fill: theme === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                  />
                  <Bar dataKey="total" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Filter size={16} />
            Filters
          </h3>
          {(startDate || endDate || categoryFilter || vehicleFilter || driverFilter || searchQuery) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setCategoryFilter('');
                setVehicleFilter('');
                setDriverFilter('');
                setSearchQuery('');
              }}
              className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <X size={14} />
              Clear All
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expenses..."
                className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Vehicle</label>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Vehicles</option>
              {transporters.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Driver</label>
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Drivers</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Expenses</h3>
          <div className="flex items-center gap-2">
            {filteredExpenses.length > 0 && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  title="Export to CSV"
                >
                  <FileDown size={16} />
                  CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  title="Export to PDF"
                >
                  <FileText size={16} />
                  PDF
                </button>
              </>
            )}
            <button
              onClick={handleAddExpense}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus size={18} />
              Add Expense
            </button>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No expenses found</p>
            <button
              onClick={handleAddExpense}
              className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Add your first expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Receipt</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredExpenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {expense.category?.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: expense.category.color }}
                          />
                        )}
                        <span className="text-sm text-slate-800 dark:text-slate-100">{expense.category?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {expense.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {expense.vendor || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-slate-800 dark:text-slate-100">
                      ${expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">{expense.paymentMethod || '-'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full inline-block w-fit ${
                          expense.paymentStatus === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                          expense.paymentStatus === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        }`}>
                          {expense.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {expense.receiptUrl ? (
                        <a
                          href={expense.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          <FileText size={16} className="inline" />
                        </a>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditExpense(expense)}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expense Form Modal */}
      {isFormOpen && (
        <ExpenseForm
          onClose={() => {
            setIsFormOpen(false);
            setExpenseToEdit(undefined);
          }}
          onSave={handleSaveExpense}
          currentUser={user}
          expenseToEdit={expenseToEdit}
          companyId={companyId}
        />
      )}
      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />
    </div>
  );
};

