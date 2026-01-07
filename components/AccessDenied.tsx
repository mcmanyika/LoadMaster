import React from 'react';
import { CreditCard, Lock } from 'lucide-react';

interface AccessDeniedProps {
  onNavigateToPricing?: () => void;
  message?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  onNavigateToPricing,
  message = 'This feature requires an active subscription',
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Access Restricted
        </h2>
        
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          {message}
        </p>
        
        {onNavigateToPricing && (
          <button
            onClick={onNavigateToPricing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            View Subscription Plans
          </button>
        )}
      </div>
    </div>
  );
};

