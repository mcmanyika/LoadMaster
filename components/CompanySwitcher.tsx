import React, { useState, useRef, useEffect } from 'react';
import { Company } from '../types';
import { Building2, ChevronDown, Check, Bell } from 'lucide-react';

interface CompanySwitcherProps {
  companies: Company[];
  currentCompanyId: string | null;
  pendingInvitationsCount: number;
  onSwitchCompany: (companyId: string) => void;
}

export const CompanySwitcher: React.FC<CompanySwitcherProps> = ({
  companies,
  currentCompanyId,
  pendingInvitationsCount,
  onSwitchCompany
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Don't show if only one company or no companies
  if (companies.length <= 1) {
    return null;
  }

  const currentCompany = companies.find(c => c.id === currentCompanyId) || companies[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
      >
        <Building2 size={16} className="text-slate-500" />
        <span className="max-w-[200px] truncate">{currentCompany?.name || 'Select Company'}</span>
        <ChevronDown size={16} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        {pendingInvitationsCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {pendingInvitationsCount > 9 ? '9+' : pendingInvitationsCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
              <Building2 size={12} />
              Your Companies
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => {
                  onSwitchCompany(company.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between ${
                  company.id === currentCompanyId ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Building2 size={16} className={`flex-shrink-0 ${company.id === currentCompanyId ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium truncate ${company.id === currentCompanyId ? 'text-blue-900' : 'text-slate-700'}`}>
                    {company.name}
                  </span>
                </div>
                {company.id === currentCompanyId && (
                  <Check size={16} className="text-blue-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
          {pendingInvitationsCount > 0 && (
            <div className="p-2 border-t border-slate-200 bg-amber-50">
              <div className="flex items-center gap-2 text-xs text-amber-800">
                <Bell size={12} />
                <span>{pendingInvitationsCount} pending invitation{pendingInvitationsCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

