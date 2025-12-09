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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (associations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Building2 size={20} className="text-blue-600" />
          My Companies
        </h3>
        <div className="text-center py-8">
          <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-2">You're not associated with any companies yet.</p>
          <p className="text-sm text-slate-400">Use an invite code to join a company.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />

      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Building2 size={20} className="text-blue-600" />
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
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-md bg-white'
              }`}
              onClick={() => onSwitchCompany(association.companyId)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    isCurrentCompany ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Building2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-slate-800 truncate ${
                      isCurrentCompany ? 'text-blue-900' : ''
                    }`}>
                      {association.company?.name || 'Unknown Company'}
                    </h4>
                    {isCurrentCompany && (
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle size={14} className="text-blue-600" />
                        <span className="text-xs text-blue-600 font-medium">Current</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600 mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-slate-400" />
                  <span>Fee: <strong>{association.feePercentage}%</strong></span>
                </div>
                {association.joinedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
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

