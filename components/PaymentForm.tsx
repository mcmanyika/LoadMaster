import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getStripe } from '../services/stripeClient';

interface PaymentFormProps {
  planId: 'essential' | 'professional';
  interval: 'month' | 'year';
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  customerEmail?: string;
}

// Card Element options
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

// Inner component that uses Stripe hooks
const CheckoutForm: React.FC<{
  planId: 'essential' | 'professional';
  interval: 'month' | 'year';
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  customerEmail?: string;
}> = ({ planId, interval, amount, onSuccess, onCancel, customerEmail }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const apiUrl = import.meta.env.VITE_BACKEND_API_URL || localStorage.getItem('backend_api_url') || '';
        
        if (!apiUrl) {
          setError('Backend API URL not configured. Please set VITE_BACKEND_API_URL in your .env.local file or set it in localStorage. See ENVIRONMENT_VARIABLES.md for details.');
          return;
        }

        console.log('Creating payment intent with API URL:', apiUrl);

        const response = await fetch(`${apiUrl}/api/create-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId,
            interval,
            amount: Math.round(amount * 100), // Convert to cents
            customerEmail,
          }),
        });

        if (!response.ok) {
          let errorMessage = 'Failed to create payment intent';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If response is not JSON, try to get text
            const text = await response.text().catch(() => '');
            errorMessage = text || errorMessage;
          }
          
          // More specific error messages
          if (response.status === 404) {
            errorMessage = `Backend endpoint not found. Make sure your backend server is running at ${apiUrl} and has the /api/create-payment-intent endpoint.`;
          } else if (response.status === 500) {
            errorMessage = 'Backend server error. Check your server logs for details.';
          } else if (response.status === 0 || response.status >= 400 && response.status < 500) {
            errorMessage = `Backend error (${response.status}): ${errorMessage}`;
          }
          
          setError(errorMessage);
          console.error('Payment intent creation failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorMessage,
            apiUrl,
          });
          return;
        }

        const { clientSecret, paymentIntentId: intentId } = await response.json();
        
        if (!intentId) {
          setError('Payment intent created but no payment intent ID returned from server.');
          return;
        }
        
        setPaymentIntentId(intentId);
        console.log('Payment intent created successfully:', intentId);
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to initialize payment';
        let detailedError = errorMsg;
        
        // Network errors
        if (err.message?.includes('fetch') || err.message?.includes('NetworkError')) {
          detailedError = `Cannot connect to backend server. Make sure your backend is running and accessible at ${import.meta.env.VITE_BACKEND_API_URL || localStorage.getItem('backend_api_url') || 'your backend URL'}.`;
        }
        
        setError(detailedError);
        console.error('Error creating payment intent:', err);
      }
    };

    createPaymentIntent();
  }, [planId, interval, amount, customerEmail]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card element not found');
      setLoading(false);
      return;
    }

    try {
      // Confirm payment with the card
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        paymentIntentId || '',
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              email: customerEmail,
            },
          },
        }
      );

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        setLoading(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Payment succeeded, now create subscription
        const apiUrl = import.meta.env.VITE_BACKEND_API_URL || localStorage.getItem('backend_api_url') || '';
        
        const subscribeResponse = await fetch(`${apiUrl}/api/create-subscription`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId,
            interval,
            paymentIntentId: paymentIntent.id,
            customerEmail,
          }),
        });

        if (!subscribeResponse.ok) {
          const errorData = await subscribeResponse.json().catch(() => ({ error: 'Failed to create subscription' }));
          setError(errorData.error || 'Failed to create subscription after payment');
          setLoading(false);
          return;
        }

        // Success!
        onSuccess();
      } else {
        setError('Payment was not successful');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during payment');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-rose-800">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Card Information
        </label>
        <div className="p-3 bg-white rounded-lg border border-slate-300">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading || !paymentIntentId}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay $${amount.toFixed(2)}`
          )}
        </button>
      </div>
    </form>
  );
};

// Main component
export const PaymentForm: React.FC<PaymentFormProps> = ({
  planId,
  interval,
  amount,
  onSuccess,
  onCancel,
  customerEmail,
}) => {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    setStripePromise(getStripe());
  }, []);

  if (!stripePromise) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Complete Payment</h2>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Plan:</span>
            <span className="font-semibold text-slate-900 capitalize">{planId}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-slate-600">Billing:</span>
            <span className="font-semibold text-slate-900 capitalize">{interval}ly</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200">
            <span className="text-lg font-semibold text-slate-900">Total:</span>
            <span className="text-2xl font-bold text-blue-600">${amount.toFixed(2)}</span>
          </div>
        </div>

        <Elements stripe={stripePromise}>
          <CheckoutForm
            planId={planId}
            interval={interval}
            amount={amount}
            onSuccess={onSuccess}
            onCancel={onCancel}
            customerEmail={customerEmail}
          />
        </Elements>
      </div>
    </div>
  );
};

