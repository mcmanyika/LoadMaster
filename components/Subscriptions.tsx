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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

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
      setCurrentPage(1);
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

  const totalPages = Math.ceil(subscriptions.length / itemsPerPage);
  const paginatedSubscriptions = subscriptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="grid gap-4">
        {paginatedSubscriptions.map((subscription) => (
          <div
            key={subscription.id}
            onClick={() => setSelectedSubscription(subscription)}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow p-4 md:p-5 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {getPlanName(subscription.plan)}
                  </h3>
                  {getStatusBadge(subscription.status)}
                </div>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                  {subscription.interval === 'month' ? 'Monthly' : 'Annual'} billing
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(subscription.amount)}
                </p>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                  /{subscription.interval === 'month' ? 'month' : 'year'}
                </p>
              </div>
            </div>

          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-4">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Showing{' '}
            <span className="font-medium">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, subscriptions.length)}
            </span>{' '}
            of{' '}
            <span className="font-medium">{subscriptions.length}</span> subscriptions
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-2 py-1 text-xs rounded-lg ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedSubscription && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                  Subscription details
                </p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {getPlanName(selectedSubscription.plan)} · {selectedSubscription.interval === 'month' ? 'Monthly' : 'Annual'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSubscription(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm"
              >
                Close
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500 dark:text-slate-400">Amount</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(selectedSubscription.amount)} /{' '}
                  {selectedSubscription.interval === 'month' ? 'month' : 'year'}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Status</p>
                  {getStatusBadge(selectedSubscription.status)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Started</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {formatDate(selectedSubscription.startedAt)}
                    </p>
                  </div>
                  {selectedSubscription.nextBillingDate && (
                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Next billing</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {formatDate(selectedSubscription.nextBillingDate)}
                      </p>
                    </div>
                  )}
                </div>
                {selectedSubscription.canceledAt && (
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Canceled</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {formatDate(selectedSubscription.canceledAt)}
                    </p>
                  </div>
                )}
                {selectedSubscription.endedAt && (
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">Ended</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {formatDate(selectedSubscription.endedAt)}
                    </p>
                  </div>
                )}
              </div>

              {(selectedSubscription.stripeSubscriptionId ||
                selectedSubscription.stripeCustomerId ||
                selectedSubscription.stripeSessionId) && (
                <div className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 space-y-1">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Stripe references
                  </p>
                  {selectedSubscription.stripeSubscriptionId && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Subscription ID:{' '}
                      <span className="font-mono break-all">{selectedSubscription.stripeSubscriptionId}</span>
                    </p>
                  )}
                  {selectedSubscription.stripeCustomerId && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Customer ID:{' '}
                      <span className="font-mono break-all">{selectedSubscription.stripeCustomerId}</span>
                    </p>
                  )}
                  {selectedSubscription.stripeSessionId && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Checkout Session ID:{' '}
                      <span className="font-mono break-all">{selectedSubscription.stripeSessionId}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 dark:border-slate-700 px-5 py-3">
              <button
                onClick={() => setSelectedSubscription(null)}
                className="px-4 py-1.5 text-xs md:text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

