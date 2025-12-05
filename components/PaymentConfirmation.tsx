import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';

interface PaymentConfirmationProps {
  status: 'success' | 'cancel' | 'pending';
  sessionId?: string;
  planName?: string;
  onClose?: () => void;
}

export const PaymentConfirmation: React.FC<PaymentConfirmationProps> = ({ 
  status, 
  sessionId,
  planName,
  onClose 
}) => {
  const [countdown, setCountdown] = React.useState(5);

  useEffect(() => {
    if (status === 'success' && !onClose) {
      // Auto-redirect after 5 seconds if no onClose handler
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.href = '/';
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, onClose]);

  const handleContinue = () => {
    if (onClose) {
      onClose();
    } else {
      window.location.href = '/';
    }
  };

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Processing Payment</h2>
          <p className="text-slate-600">Please wait while we confirm your subscription...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
            <p className="text-slate-600 mb-4">
              {planName ? `Your ${planName} subscription is now active.` : 'Your subscription is now active.'}
            </p>
            {sessionId && (
              <p className="text-xs text-slate-500 mb-6">
                Session ID: {sessionId.substring(0, 20)}...
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-emerald-900 mb-2">What's Next?</h3>
              <ul className="text-sm text-emerald-800 space-y-1">
                <li>✓ Your subscription has been activated</li>
                <li>✓ You can now access all premium features</li>
                <li>✓ You'll receive a confirmation email shortly</li>
              </ul>
            </div>

            <button
              onClick={handleContinue}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Continue to Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>

            {!onClose && (
              <p className="text-sm text-slate-500">
                Redirecting automatically in {countdown} seconds...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Cancel status
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-12 h-12 text-amber-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Payment Cancelled</h2>
          <p className="text-slate-600 mb-6">
            No charges were made. You can try again anytime.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-slate-900 mb-2">Need Help?</h3>
            <p className="text-sm text-slate-600">
              If you experienced any issues during checkout, please contact our support team.
            </p>
          </div>

          <button
            onClick={handleContinue}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {onClose ? 'Return to Pricing' : 'Go Back'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

