import React, { useEffect } from 'react';
import { CheckCircle, Truck, ArrowRight } from 'lucide-react';

interface RegistrationSuccessProps {
  userName: string;
  userRole: string;
  onContinue: () => void;
}

export const RegistrationSuccess: React.FC<RegistrationSuccessProps> = ({ 
  userName, 
  userRole,
  onContinue 
}) => {
  useEffect(() => {
    // Auto-redirect after 15 seconds
    const timer = setTimeout(() => {
      onContinue();
    }, 15000);

    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Success Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-emerald-700 z-0"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-sm border border-white/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Account Created!</h1>
            <p className="text-emerald-100 text-sm">
              Welcome to LoadMaster
            </p>
          </div>
        </div>

        {/* Success Content */}
        <div className="p-8 text-center space-y-6">
          <div className="space-y-2">
            <p className="text-slate-300 text-lg">
              Hi <span className="font-semibold text-white">{userName}</span>!
            </p>
            <p className="text-slate-400 text-sm">
              Your {userRole} account has been successfully created.
            </p>
          </div>

          {userRole === 'owner' && (
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white mb-1">Sample Data Added</p>
                  <p className="text-xs text-slate-400">
                    We've added sample dispatcher, driver, and vehicle to help you get started. You can manage them in Fleet Management.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={onContinue}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 group"
            >
              Continue to Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-xs text-slate-500 mt-3">
              Redirecting automatically in a few seconds...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

