import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Expense, ExpenseCategory, ExpenseSummary } from '../types';

// Mock Data for Demo Mode
const MOCK_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'c1', name: 'Repairs & Maintenance', description: 'Vehicle repairs and maintenance', icon: 'wrench', color: '#EF4444', createdAt: new Date().toISOString() },
  { id: 'c2', name: 'Fuel', description: 'Fuel expenses', icon: 'fuel', color: '#F59E0B', createdAt: new Date().toISOString() },
  { id: 'c3', name: 'Insurance', description: 'Insurance expenses', icon: 'shield', color: '#3B82F6', createdAt: new Date().toISOString() },
];

const MOCK_EXPENSES: Expense[] = [];

/**
 * Get all expense categories
 */
export const getExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn("Supabase not configured. Using Mock Data.");
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...MOCK_EXPENSE_CATEGORIES];
  }

  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching expense categories:', error);
      return [];
    }

    return data.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      createdAt: cat.created_at,
    }));
  } catch (error) {
    console.error('Error in getExpenseCategories:', error);
    return [];
  }
};

/**
 * Get expenses with optional filters
 */
export const getExpenses = async (
  companyId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    vehicleId?: string;
    driverId?: string;
  }
): Promise<Expense[]> => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn("Supabase not configured. Using Mock Data.");
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...MOCK_EXPENSES];
  }

  try {
    let query = supabase
      .from('expenses')
      .select(`
        *,
        expense_categories (
          id,
          name,
          description,
          icon,
          color
        ),
        transporters:vehicle_id (
          name
        ),
        drivers:driver_id (
          name
        ),
        loads:load_id (
          company
        )
      `)
      .eq('company_id', companyId)
      .order('expense_date', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('expense_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('expense_date', filters.endDate);
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters?.vehicleId) {
      query = query.eq('vehicle_id', filters.vehicleId);
    }
    if (filters?.driverId) {
      query = query.eq('driver_id', filters.driverId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }

    return data.map(exp => ({
      id: exp.id,
      companyId: exp.company_id,
      categoryId: exp.category_id,
      amount: parseFloat(exp.amount),
      description: exp.description,
      expenseDate: exp.expense_date,
      vendor: exp.vendor,
      receiptUrl: exp.receipt_url,
      vehicleId: exp.vehicle_id,
      driverId: exp.driver_id,
      loadId: exp.load_id,
      paymentMethod: exp.payment_method,
      paymentStatus: exp.payment_status,
      recurringFrequency: exp.recurring_frequency,
      createdBy: exp.created_by,
      createdAt: exp.created_at,
      updatedAt: exp.updated_at,
      category: exp.expense_categories ? {
        id: exp.expense_categories.id,
        name: exp.expense_categories.name,
        description: exp.expense_categories.description,
        icon: exp.expense_categories.icon,
        color: exp.expense_categories.color,
        createdAt: '',
      } : undefined,
      vehicleName: exp.transporters?.name,
      driverName: exp.drivers?.name,
      loadCompany: exp.loads?.company,
    }));
  } catch (error) {
    console.error('Error in getExpenses:', error);
    return [];
  }
};

/**
 * Create a new expense
 */
export const createExpense = async (
  expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'category' | 'vehicleName' | 'driverName' | 'loadCompany'>
): Promise<{ data: Expense | null; error: Error | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        company_id: expense.companyId,
        category_id: expense.categoryId,
        amount: expense.amount,
        description: expense.description,
        expense_date: expense.expenseDate,
        vendor: expense.vendor,
        receipt_url: expense.receiptUrl,
        vehicle_id: expense.vehicleId,
        driver_id: expense.driverId,
        load_id: expense.loadId,
        payment_method: expense.paymentMethod,
        payment_status: expense.paymentStatus,
        recurring_frequency: expense.recurringFrequency,
        created_by: expense.createdBy,
      }])
      .select(`
        *,
        expense_categories (
          id,
          name,
          description,
          icon,
          color
        ),
        transporters:vehicle_id (
          name
        ),
        drivers:driver_id (
          name
        ),
        loads:load_id (
          company
        )
      `)
      .single();

    if (error) {
      console.error('Error creating expense:', error);
      return { data: null, error };
    }

    const mappedExpense: Expense = {
      id: data.id,
      companyId: data.company_id,
      categoryId: data.category_id,
      amount: parseFloat(data.amount),
      description: data.description,
      expenseDate: data.expense_date,
      vendor: data.vendor,
      receiptUrl: data.receipt_url,
      vehicleId: data.vehicle_id,
      driverId: data.driver_id,
      loadId: data.load_id,
      paymentMethod: data.payment_method,
      paymentStatus: data.payment_status,
      recurringFrequency: data.recurring_frequency,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      category: data.expense_categories ? {
        id: data.expense_categories.id,
        name: data.expense_categories.name,
        description: data.expense_categories.description,
        icon: data.expense_categories.icon,
        color: data.expense_categories.color,
        createdAt: '',
      } : undefined,
      vehicleName: data.transporters?.name,
      driverName: data.drivers?.name,
      loadCompany: data.loads?.company,
    };

    // Sync gas_amount if this is a Fuel expense linked to a load
    if (mappedExpense.loadId && mappedExpense.category?.name === 'Fuel') {
      syncLoadGasAmount(mappedExpense.loadId).catch(err => {
        console.error('Error syncing gas amount after expense creation:', err);
      });
    }

    return { data: mappedExpense, error: null };
  } catch (error) {
    console.error('Error in createExpense:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * Update an existing expense
 */
export const updateExpense = async (
  id: string,
  expense: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'category' | 'vehicleName' | 'driverName' | 'loadCompany'>>
): Promise<{ data: Expense | null; error: Error | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  try {
    // Fetch old expense to check if we need to sync old load
    let oldLoadId: string | null = null;
    let oldCategoryId: string | null = null;
    let oldCategoryName: string | null = null;
    
    if (expense.loadId !== undefined || expense.categoryId !== undefined || expense.amount !== undefined) {
      const { data: oldExpense } = await supabase
        .from('expenses')
        .select(`
          load_id,
          category_id,
          expense_categories (
            name
          )
        `)
        .eq('id', id)
        .single();
      
      if (oldExpense) {
        oldLoadId = oldExpense.load_id;
        oldCategoryId = oldExpense.category_id;
        oldCategoryName = oldExpense.expense_categories?.name || null;
      }
    }

    const updateData: any = {};
    if (expense.categoryId !== undefined) updateData.category_id = expense.categoryId;
    if (expense.amount !== undefined) updateData.amount = expense.amount;
    if (expense.description !== undefined) updateData.description = expense.description;
    if (expense.expenseDate !== undefined) updateData.expense_date = expense.expenseDate;
    if (expense.vendor !== undefined) updateData.vendor = expense.vendor;
    if (expense.receiptUrl !== undefined) updateData.receipt_url = expense.receiptUrl;
    if (expense.vehicleId !== undefined) updateData.vehicle_id = expense.vehicleId;
    if (expense.driverId !== undefined) updateData.driver_id = expense.driverId;
    if (expense.loadId !== undefined) updateData.load_id = expense.loadId;
    if (expense.paymentMethod !== undefined) updateData.payment_method = expense.paymentMethod;
    if (expense.paymentStatus !== undefined) updateData.payment_status = expense.paymentStatus;
    if (expense.recurringFrequency !== undefined) updateData.recurring_frequency = expense.recurringFrequency;

    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        expense_categories (
          id,
          name,
          description,
          icon,
          color
        ),
        transporters:vehicle_id (
          name
        ),
        drivers:driver_id (
          name
        ),
        loads:load_id (
          company
        )
      `)
      .single();

    if (error) {
      console.error('Error updating expense:', error);
      return { data: null, error };
    }

    const mappedExpense: Expense = {
      id: data.id,
      companyId: data.company_id,
      categoryId: data.category_id,
      amount: parseFloat(data.amount),
      description: data.description,
      expenseDate: data.expense_date,
      vendor: data.vendor,
      receiptUrl: data.receipt_url,
      vehicleId: data.vehicle_id,
      driverId: data.driver_id,
      loadId: data.load_id,
      paymentMethod: data.payment_method,
      paymentStatus: data.payment_status,
      recurringFrequency: data.recurring_frequency,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      category: data.expense_categories ? {
        id: data.expense_categories.id,
        name: data.expense_categories.name,
        description: data.expense_categories.description,
        icon: data.expense_categories.icon,
        color: data.expense_categories.color,
        createdAt: '',
      } : undefined,
      vehicleName: data.transporters?.name,
      driverName: data.drivers?.name,
      loadCompany: data.loads?.company,
    };

    // Sync gas_amount if this expense affects Fuel expenses for loads
    const newLoadId = mappedExpense.loadId;
    const newCategoryName = mappedExpense.category?.name;
    const loadIdChanged = expense.loadId !== undefined && oldLoadId !== newLoadId;
    const categoryChanged = expense.categoryId !== undefined && oldCategoryId !== mappedExpense.categoryId;
    const amountChanged = expense.amount !== undefined;

    // If loadId or category changed, or amount changed, we need to sync
    if (loadIdChanged || categoryChanged || amountChanged) {
      // Sync old load if it was a Fuel expense
      if (oldLoadId && oldCategoryName === 'Fuel' && oldLoadId !== newLoadId) {
        syncLoadGasAmount(oldLoadId).catch(err => {
          console.error('Error syncing old load gas amount after expense update:', err);
        });
      }

      // Sync new load if it's a Fuel expense
      if (newLoadId && newCategoryName === 'Fuel') {
        syncLoadGasAmount(newLoadId).catch(err => {
          console.error('Error syncing new load gas amount after expense update:', err);
        });
      }
    }

    return { data: mappedExpense, error: null };
  } catch (error) {
    console.error('Error in updateExpense:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * Delete an expense
 */
export const deleteExpense = async (id: string): Promise<{ error: Error | null }> => {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    // Fetch expense before deleting to check if we need to sync load
    const { data: expenseToDelete } = await supabase
      .from('expenses')
      .select(`
        load_id,
        category_id,
        expense_categories (
          name
        )
      `)
      .eq('id', id)
      .single();

    const loadIdToSync = expenseToDelete?.load_id;
    const categoryName = expenseToDelete?.expense_categories?.name;

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting expense:', error);
      return { error };
    }

    // Sync gas_amount if this was a Fuel expense linked to a load
    if (loadIdToSync && categoryName === 'Fuel') {
      syncLoadGasAmount(loadIdToSync).catch(err => {
        console.error('Error syncing gas amount after expense deletion:', err);
      });
    }

    return { error: null };
  } catch (error) {
    console.error('Error in deleteExpense:', error);
    return { error: error as Error };
  }
};

/**
 * Get expense summary/aggregated statistics
 */
export const getExpenseSummary = async (
  companyId: string,
  startDate?: string,
  endDate?: string
): Promise<ExpenseSummary> => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      totalExpenses: 0,
      expensesByCategory: [],
      expensesByMonth: [],
      averageExpense: 0,
      largestExpense: null,
    };
  }

  try {
    let query = supabase
      .from('expenses')
      .select('*, expense_categories(name)')
      .eq('company_id', companyId);

    if (startDate) {
      query = query.gte('expense_date', startDate);
    }
    if (endDate) {
      query = query.lte('expense_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching expense summary:', error);
      return {
        totalExpenses: 0,
        expensesByCategory: [],
        expensesByMonth: [],
        averageExpense: 0,
        largestExpense: null,
      };
    }

    if (!data || data.length === 0) {
      return {
        totalExpenses: 0,
        expensesByCategory: [],
        expensesByMonth: [],
        averageExpense: 0,
        largestExpense: null,
      };
    }

    // Calculate totals
    const totalExpenses = data.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const averageExpense = totalExpenses / data.length;

    // Group by category
    const categoryMap = new Map<string, { total: number; count: number; name: string }>();
    data.forEach(exp => {
      const categoryId = exp.category_id;
      const categoryName = exp.expense_categories?.name || 'Unknown';
      const amount = parseFloat(exp.amount);
      
      if (categoryMap.has(categoryId)) {
        const existing = categoryMap.get(categoryId)!;
        existing.total += amount;
        existing.count += 1;
      } else {
        categoryMap.set(categoryId, { total: amount, count: 1, name: categoryName });
      }
    });

    const expensesByCategory = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      total: data.total,
      count: data.count,
    }));

    // Group by month
    const monthMap = new Map<string, { total: number; count: number }>();
    data.forEach(exp => {
      const date = new Date(exp.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = parseFloat(exp.amount);
      
      if (monthMap.has(monthKey)) {
        const existing = monthMap.get(monthKey)!;
        existing.total += amount;
        existing.count += 1;
      } else {
        monthMap.set(monthKey, { total: amount, count: 1 });
      }
    });

    const expensesByMonth = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Find largest expense
    const largestExpenseData = data.reduce((max, exp) => {
      const amount = parseFloat(exp.amount);
      return amount > parseFloat(max.amount) ? exp : max;
    }, data[0]);

    // Map to Expense type (simplified)
    const largestExpense: Expense = {
      id: largestExpenseData.id,
      companyId: largestExpenseData.company_id,
      categoryId: largestExpenseData.category_id,
      amount: parseFloat(largestExpenseData.amount),
      description: largestExpenseData.description,
      expenseDate: largestExpenseData.expense_date,
      vendor: largestExpenseData.vendor,
      receiptUrl: largestExpenseData.receipt_url,
      vehicleId: largestExpenseData.vehicle_id,
      driverId: largestExpenseData.driver_id,
      loadId: largestExpenseData.load_id,
      paymentMethod: largestExpenseData.payment_method,
      paymentStatus: largestExpenseData.payment_status,
      recurringFrequency: largestExpenseData.recurring_frequency,
      createdBy: largestExpenseData.created_by,
      createdAt: largestExpenseData.created_at,
      updatedAt: largestExpenseData.updated_at,
      category: largestExpenseData.expense_categories ? {
        id: largestExpenseData.expense_categories.id || '',
        name: largestExpenseData.expense_categories.name,
        description: largestExpenseData.expense_categories.description,
        icon: largestExpenseData.expense_categories.icon,
        color: largestExpenseData.expense_categories.color,
        createdAt: '',
      } : undefined,
    };

    return {
      totalExpenses,
      expensesByCategory,
      expensesByMonth,
      averageExpense,
      largestExpense,
    };
  } catch (error) {
    console.error('Error in getExpenseSummary:', error);
    return {
      totalExpenses: 0,
      expensesByCategory: [],
      expensesByMonth: [],
      averageExpense: 0,
      largestExpense: null,
    };
  }
};

/**
 * Get the Fuel category ID from expense_categories
 */
const getFuelCategoryId = async (): Promise<string | null> => {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('name', 'Fuel')
      .single();

    if (error) {
      console.error('Error fetching Fuel category ID:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error in getFuelCategoryId:', error);
    return null;
  }
};

/**
 * Sync the gas_amount field in loads table based on Fuel expenses
 */
const syncLoadGasAmount = async (loadId: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase || !loadId) {
    return;
  }

  try {
    // Get Fuel category ID
    const fuelCategoryId = await getFuelCategoryId();
    if (!fuelCategoryId) {
      console.warn('Fuel category not found, skipping gas amount sync');
      return;
    }

    // Query all Fuel expenses for this load
    const { data: fuelExpenses, error: queryError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('load_id', loadId)
      .eq('category_id', fuelCategoryId);

    if (queryError) {
      console.error('Error querying Fuel expenses for load:', queryError);
      return;
    }

    // Sum all amounts
    const totalGasAmount = fuelExpenses?.reduce((sum, exp) => {
      return sum + parseFloat(exp.amount || '0');
    }, 0) || 0;

    // Update the load's gas_amount
    const { error: updateError } = await supabase
      .from('loads')
      .update({ gas_amount: totalGasAmount })
      .eq('id', loadId);

    if (updateError) {
      console.error('Error updating load gas_amount:', updateError);
    }
  } catch (error) {
    console.error('Error in syncLoadGasAmount:', error);
  }
};

/**
 * Get all Fuel expenses linked to a specific load
 */
export const getFuelExpensesForLoad = async (loadId: string): Promise<Expense[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    // Get Fuel category ID
    const fuelCategoryId = await getFuelCategoryId();
    if (!fuelCategoryId) {
      return [];
    }

    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        expense_categories (
          id,
          name,
          description,
          icon,
          color
        ),
        transporters:vehicle_id (
          name
        ),
        drivers:driver_id (
          name
        ),
        loads:load_id (
          company
        )
      `)
      .eq('load_id', loadId)
      .eq('category_id', fuelCategoryId)
      .order('expense_date', { ascending: false });

    if (error) {
      console.error('Error fetching Fuel expenses for load:', error);
      return [];
    }

    return data.map(exp => ({
      id: exp.id,
      companyId: exp.company_id,
      categoryId: exp.category_id,
      amount: parseFloat(exp.amount),
      description: exp.description,
      expenseDate: exp.expense_date,
      vendor: exp.vendor,
      receiptUrl: exp.receipt_url,
      vehicleId: exp.vehicle_id,
      driverId: exp.driver_id,
      loadId: exp.load_id,
      paymentMethod: exp.payment_method,
      paymentStatus: exp.payment_status,
      recurringFrequency: exp.recurring_frequency,
      createdBy: exp.created_by,
      createdAt: exp.created_at,
      updatedAt: exp.updated_at,
      category: exp.expense_categories ? {
        id: exp.expense_categories.id,
        name: exp.expense_categories.name,
        description: exp.expense_categories.description,
        icon: exp.expense_categories.icon,
        color: exp.expense_categories.color,
        createdAt: '',
      } : undefined,
      vehicleName: exp.transporters?.name,
      driverName: exp.drivers?.name,
      loadCompany: exp.loads?.company,
    }));
  } catch (error) {
    console.error('Error in getFuelExpensesForLoad:', error);
    return [];
  }
};

/**
 * Get all expenses linked to a specific load
 */
export const getExpensesForLoad = async (loadId: string): Promise<Expense[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        expense_categories (
          id,
          name,
          description,
          icon,
          color
        ),
        transporters:vehicle_id (
          name
        ),
        drivers:driver_id (
          name
        ),
        loads:load_id (
          company
        )
      `)
      .eq('load_id', loadId)
      .order('expense_date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses for load:', error);
      return [];
    }

    return data.map(exp => ({
      id: exp.id,
      companyId: exp.company_id,
      categoryId: exp.category_id,
      amount: parseFloat(exp.amount),
      description: exp.description,
      expenseDate: exp.expense_date,
      vendor: exp.vendor,
      receiptUrl: exp.receipt_url,
      vehicleId: exp.vehicle_id,
      driverId: exp.driver_id,
      loadId: exp.load_id,
      paymentMethod: exp.payment_method,
      paymentStatus: exp.payment_status,
      recurringFrequency: exp.recurring_frequency,
      createdBy: exp.created_by,
      createdAt: exp.created_at,
      updatedAt: exp.updated_at,
      category: exp.expense_categories ? {
        id: exp.expense_categories.id,
        name: exp.expense_categories.name,
        description: exp.expense_categories.description,
        icon: exp.expense_categories.icon,
        color: exp.expense_categories.color,
        createdAt: '',
      } : undefined,
      vehicleName: exp.transporters?.name,
      driverName: exp.drivers?.name,
      loadCompany: exp.loads?.company,
    }));
  } catch (error) {
    console.error('Error in getExpensesForLoad:', error);
    return [];
  }
};

