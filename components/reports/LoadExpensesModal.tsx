import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Expense } from '../../types';
import { getExpensesForLoad } from '../../services/expenseService';
import { X, DollarSign, Calendar, FileText, Receipt } from 'lucide-react';

interface LoadExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadId: string;
  loadInfo?: {
    origin: string;
    destination: string;
    dropDate: string;
  };
}

export const LoadExpensesModal: React.FC<LoadExpensesModalProps> = ({
  isOpen,
  onClose,
  loadId,
  loadInfo
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('LoadExpensesModal useEffect:', { isOpen, loadId });
    if (isOpen && loadId) {
      console.log('Loading expenses for load:', loadId);
      fetchExpenses();
    } else {
      // Reset expenses when modal closes
      setExpenses([]);
      setError(null);
    }
  }, [isOpen, loadId]);

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExpensesForLoad(loadId);
      setExpenses(data);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed bg-black bg-opacity-50 z-[100]" 
        style={{ 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          margin: 0, 
          padding: 0
        }}
        onClick={onClose}
      />
      {/* Modal Content */}
      <div 
        className="fixed bg-white dark:bg-slate-800 z-[110] flex flex-col rounded-lg shadow-2xl overflow-hidden" 
        style={{ 
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          margin: 0, 
          padding: 0
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Load Expenses
              </h2>
              {loadInfo && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {loadInfo.origin} → {loadInfo.destination} • {new Date(loadInfo.dropDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchExpenses}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Receipt className="w-16 h-16 text-slate-400 dark:text-slate-500 mb-4" />
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">No Expenses Found</p>
              <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
                There are no expenses attached to this load.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-slate-400 dark:text-slate-300" />
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total Expenses</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    ${totalExpenses.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Expenses List */}
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {expense.category && (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${expense.category.color}20` }}
                            >
                              <span className="text-xs font-semibold" style={{ color: expense.category.color }}>
                                {expense.category.icon || '💰'}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                              {expense.category?.name || 'Uncategorized'}
                            </h4>
                            {expense.description && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {expense.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-600 dark:text-slate-400">
                          {expense.vendor && (
                            <div className="flex items-center gap-1">
                              <FileText size={12} />
                              <span>{expense.vendor}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>{new Date(expense.expenseDate).toLocaleDateString()}</span>
                          </div>
                          {expense.paymentMethod && (
                            <span className="capitalize">{expense.paymentMethod}</span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                          ${expense.amount.toFixed(2)}
                        </p>
                        {expense.paymentStatus && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                            expense.paymentStatus === 'paid'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                              : expense.paymentStatus === 'pending'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                          }`}>
                            {expense.paymentStatus.charAt(0).toUpperCase() + expense.paymentStatus.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    {expense.receiptUrl && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                        <a
                          href={expense.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <Receipt size={14} />
                          View Receipt
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );

  // Render modal using portal to ensure it appears above everything
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }
  
  return createPortal(modalContent, document.body);
};

