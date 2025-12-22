import React, { useState, useEffect } from 'react';
import { DispatcherCompanyAssociation, UserProfile } from '../types';
import { getDispatcherAssociationsWithCompanies } from '../services/dispatcherAssociationService';
import { Building2, DollarSign, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { ErrorModal } from './ErrorModal';

interface DispatcherCompaniesListProps {
  user: UserProfile;
  currentCompanyId: string | null;
  onSwitchCompany: (companyId: string) => void;
}

export const DispatcherCompaniesList: React.FC<DispatcherCompaniesListProps> = ({
  user,
  currentCompanyId,
  onSwitchCompany
}) => {
  const [associations, setAssociations] = useState<DispatcherCompanyAssociation[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

  useEffect(() => {
    if (user.role === 'dispatcher') {
      loadCompanies();
    }
  }, [user]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await getDispatcherAssociationsWithCompanies(user.id);
      setAssociations(data);
    } catch (error: any) {
      setErrorModal({ isOpen: true, message: error.message || 'Failed to load companies' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (associations.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Building2 size={20} className="text-slate-600 dark:text-slate-400" />
          My Companies
        </h3>
        <div className="text-center py-8">
          <AlertCircle size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 mb-2">You're not associated with any companies yet.</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">Use an invite code to join a company.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />

      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
        <Building2 size={20} className="text-slate-600 dark:text-slate-400" />
        My Companies ({associations.length})
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {associations.map((association) => {
          const isCurrentCompany = association.companyId === currentCompanyId;
          
          return (
            <div
              key={association.id}
              className={`p-4 border rounded-xl transition-all cursor-pointer ${
                isCurrentCompany
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md bg-white dark:bg-slate-800'
              }`}
              onClick={() => onSwitchCompany(association.companyId)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <Building2 size={20} className="text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-slate-800 dark:text-slate-100 truncate ${
                      isCurrentCompany ? 'text-blue-900 dark:text-blue-200' : ''
                    }`}>
                      {association.company?.name || 'Unknown Company'}
                    </h4>
                    {isCurrentCompany && (
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle size={14} className="text-slate-600 dark:text-slate-400" />
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Current</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-slate-400 dark:text-slate-500" />
                  <span>Fee: <strong>{association.feePercentage}%</strong></span>
                </div>
                {association.joinedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                    <span className="text-xs">
                      Joined {new Date(association.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {!isCurrentCompany && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwitchCompany(association.companyId);
                  }}
                  className="mt-4 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Switch to This Company
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

