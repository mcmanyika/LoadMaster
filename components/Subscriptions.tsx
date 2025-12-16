import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Calendar, DollarSign, Clock, Loader2, AlertCircle } from 'lucide-react';
import { getUserSubscriptions } from '../services/subscriptionService';
import { Subscription } from '../services/subscriptionService';

interface SubscriptionsProps {
  userId: string;
}

export const Subscriptions: React.FC<SubscriptionsProps> = ({ userId }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, [userId]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    const { subscriptions: data, error: err } = await getUserSubscriptions(userId);
    if (err) {
      setError(err);
    } else {
      setSubscriptions(data);
    }
    setLoading(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30',
      canceled: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-600',
      completed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/30',
      past_due: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/30',
    };

    const icons = {
      active: <CheckCircle2 className="w-4 h-4" />,
      canceled: <XCircle className="w-4 h-4" />,
      completed: <CheckCircle2 className="w-4 h-4" />,
      past_due: <AlertCircle className="w-4 h-4" />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
          styles[status as keyof typeof styles] || styles.canceled
        }`}
      >
        {icons[status as keyof typeof icons] || <XCircle className="w-4 h-4" />}
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
  };

  const getPlanName = (plan: string) => {
    const planNames: Record<string, string> = {
      essential: 'Essential',
      professional: 'Professional',
      enterprise: 'Enterprise',
    };
    return planNames[plan] || plan;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Error loading subscriptions</p>
          <p className="text-slate-600 dark:text-slate-400 text-sm">{error}</p>
          <button
            onClick={fetchSubscriptions}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <Calendar className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No Subscriptions Yet</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You haven't subscribed to any plans yet. Visit the pricing page to get started!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="grid gap-6">
        {subscriptions.map((subscription) => (
          <div
            key={subscription.id}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {getPlanName(subscription.plan)}
                  </h3>
                  {getStatusBadge(subscription.status)}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {subscription.interval === 'month' ? 'Monthly' : 'Annual'} billing
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(subscription.amount)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  /{subscription.interval === 'month' ? 'month' : 'year'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Started</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(subscription.startedAt)}
                  </p>
                </div>
              </div>

              {subscription.nextBillingDate && subscription.status === 'active' && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Next Billing</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatDate(subscription.nextBillingDate)}
                    </p>
                  </div>
                </div>
              )}

              {subscription.endedAt && (
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ended</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatDate(subscription.endedAt)}
                    </p>
                  </div>
                </div>
              )}

              {subscription.canceledAt && (
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Canceled</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatDate(subscription.canceledAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {subscription.stripeSubscriptionId && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Subscription ID: <span className="font-mono">{subscription.stripeSubscriptionId}</span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {subscriptions.filter((s) => s.status === 'active').length > 0 && (
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Active Subscription:</strong> You currently have{' '}
            {subscriptions.filter((s) => s.status === 'active').length} active subscription
            {subscriptions.filter((s) => s.status === 'active').length > 1 ? 's' : ''}.
          </p>
        </div>
      )}
    </div>
  );
};

