import React, { useState, useEffect } from 'react';
import { Check, X, Zap, Users, Building2, ArrowRight, Mail, Phone, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { createSubscriptionIntent } from '../services/paymentIntentService';
import { getActiveSubscription, Subscription } from '../services/subscriptionService';
import { getSubscriptionPlans } from '../services/pricingService';

interface PricingProps {
  onClose?: () => void;
}

export const Pricing: React.FC<PricingProps> = ({ onClose }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Get current user and active subscription on mount
  React.useEffect(() => {
    const loadUserAndSubscription = async () => {
      try {
        // Check for cancelled payment in URL
        const urlParams = new URLSearchParams(window.location.search);
        const paymentParam = urlParams.get('payment');
        
        // If payment was cancelled, clear pending_payment
        if (paymentParam === 'cancelled') {
          localStorage.removeItem('pending_payment');
          // Clear URL parameter
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        if (currentUser?.id) {
          setLoadingSubscription(true);
          const { subscription } = await getActiveSubscription(currentUser.id);
          
          // If we have a pending_payment but no active subscription, clear it
          const pendingPayment = localStorage.getItem('pending_payment');
          if (pendingPayment && !subscription) {
            console.log('Clearing pending_payment - no active subscription found');
            localStorage.removeItem('pending_payment');
          }
          
          // Only set active subscription if it actually exists
          setActiveSubscription(subscription);
        } else {
          // If no user, clear any pending payment
          localStorage.removeItem('pending_payment');
        }
      } catch (err) {
        console.error('Error loading user or subscription:', err);
        // On error, clear pending_payment to be safe
        localStorage.removeItem('pending_payment');
      } finally {
        setLoadingSubscription(false);
      }
    };
    
    loadUserAndSubscription();
  }, []);

  const [plans, setPlans] = useState([
    {
      id: 'essential',
      name: 'Essential',
      tagline: 'Perfect for small fleets',
      icon: <Zap className="w-6 h-6" />,
      monthlyPrice: 24.98,
      annualPrice: 21.24, // 15% off monthly price
      features: [
        { text: 'Up to 5 users', included: true },
        { text: 'Up to 50 loads/month', included: true },
        { text: 'Unlimited transporters & drivers', included: true },
        { text: 'Load management & tracking', included: true },
        { text: 'Basic dashboard & analytics', included: true },
        { text: 'Mobile driver app access', included: true },
        { text: 'Email support', included: true },
        { text: '30-day data retention', included: true },
        { text: 'Export reports (CSV, PDF)', included: true },
        { text: 'Priority support', included: false },
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      id: 'professional',
      name: 'Professional',
      tagline: 'For growing fleets',
      icon: <Users className="w-6 h-6" />,
      monthlyPrice: 44.98,
      annualPrice: 38.24, // 15% off monthly price
      features: [
        { text: 'Up to 15 users', included: true },
        { text: 'Up to 500 loads/month', included: true },
        { text: 'Everything in Essential', included: true },
        { text: 'Custom dispatcher fee percentages', included: true },
        { text: 'Advanced analytics & reporting', included: true },
        { text: 'Priority email support', included: true },
        { text: 'Export reports (CSV, PDF)', included: true },
        { text: '1-year data retention', included: true },
        { text: 'Factoring status tracking', included: true },
        { text: 'Performance insights', included: true },
        { text: 'API access', included: false },
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      tagline: 'For large operations',
      icon: <Building2 className="w-6 h-6" />,
      monthlyPrice: 67.47,
      annualPrice: 57.35, // 15% off monthly price
      features: [
        { text: 'Unlimited users', included: true },
        { text: 'Unlimited loads', included: true },
        { text: 'Everything in Professional', included: true },
        { text: 'Unlimited AI analysis reports', included: true },
        { text: 'API access', included: true },
        { text: 'Custom integrations', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'Phone & email support', included: true },
        { text: 'Unlimited data retention', included: true },
        { text: 'Custom billing & invoicing', included: true },
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
  ]);

  // Load prices from database
  useEffect(() => {
    const loadPrices = async () => {
      try {
        const dbPlans = await getSubscriptionPlans();
        console.log('📊 Prices loaded from database:', dbPlans);
        setPlans(prevPlans => prevPlans.map(plan => {
          const dbPlan = dbPlans.find(p => p.planId === plan.id);
          if (dbPlan) {
            console.log(`💰 ${plan.id} plan: Database price = $${dbPlan.monthlyPrice}/month`);
            return {
              ...plan,
              monthlyPrice: dbPlan.monthlyPrice,
              annualPrice: dbPlan.annualPrice,
            };
          }
          console.log(`⚠️ ${plan.id} plan: Using hardcoded fallback price = $${plan.monthlyPrice}/month`);
          return plan;
        }));
      } catch (error) {
        console.error('Error loading prices from database:', error);
        console.log('⚠️ Using hardcoded fallback prices due to database error');
        // Keep default prices if database fetch fails
      }
    };
    loadPrices();
  }, []);

  const handleSubscribe = async (planId: 'essential' | 'professional' | 'enterprise') => {
    // Don't allow subscription to the same plan if user already has it active
    if (activeSubscription && activeSubscription.plan === planId) {
      setError(`You already have an active ${planId} subscription. Please manage it from "My Subscriptions" page.`);
      return;
    }

    // Enterprise is now a regular subscribable plan

    setError(null);
    setLoadingPlan(planId);

    try {
      const interval = billingCycle === 'monthly' ? 'month' : 'year';
      
      // Store plan info in localStorage before redirect (backup)
      localStorage.setItem('pending_payment', JSON.stringify({
        planId,
        interval,
        timestamp: Date.now(),
      }));

      // Create payment intent via backend
      const { data, error: intentError } = await createSubscriptionIntent({
        planId,
        interval,
        userId: user?.id,
      });

      if (intentError || !data) {
        setError(intentError || 'Failed to create payment intent');
        setLoadingPlan(null);
        return;
      }

      // Redirect to Stripe Checkout Session URL
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('No checkout URL received from server');
        setLoadingPlan(null);
      }
      // User will be redirected to Stripe Checkout, then back with payment status
    } catch (err: any) {
      console.error('Payment intent error:', err);
      setError(err.message || 'Failed to initiate payment');
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-16">
          {onClose && (
            <button
              onClick={onClose}
              className="mb-8 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back
            </button>
          )}
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
            Choose the plan that fits your fleet. All plans include a 14-day free trial. No credit card required.
          </p>
          
          {/* Active Subscription Notice */}
          {!loadingSubscription && activeSubscription && (
            <div className="mb-8 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg flex items-center gap-3 text-emerald-800 dark:text-emerald-300 max-w-2xl mx-auto">
              <CheckCircle2 size={20} className="flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold">You have an active subscription</p>
                <p className="text-xs mt-1">
                  Current plan: <span className="font-medium capitalize">{activeSubscription.plan}</span> 
                  {' • '}
                  {activeSubscription.interval === 'month' ? 'Monthly' : 'Annual'} billing
                  {' • '}
                  <span className="text-emerald-600 dark:text-emerald-400">Upgrade to a higher plan anytime</span>
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/30 rounded-lg flex items-center gap-3 text-rose-800 dark:text-rose-300 max-w-2xl mx-auto">
              <AlertCircle size={20} className="flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                billingCycle === 'annual'
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Annual
              <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                Save 15%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
              className={`relative bg-white dark:bg-slate-800 rounded-2xl border-2 transition-all duration-300 ${
                plan.popular
                  ? 'border-slate-900 dark:border-blue-600 shadow-2xl scale-105'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-lg hover:shadow-xl'
              } ${hoveredPlan === plan.id && !plan.popular ? 'scale-[1.02]' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <div className="p-8">
                {/* Plan Header */}
                <div className="inline-flex items-center gap-2 text-slate-900 dark:text-slate-100 mb-4">
                  {plan.icon}
                  <span className="font-semibold">{plan.name}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">{plan.tagline}</p>

                {/* Price */}
                <div className="mb-6">
                  {plan.monthlyPrice ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                          ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">/month</span>
                      </div>
                      {billingCycle === 'annual' && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          ${(plan.monthlyPrice * 12).toFixed(2)}/year (save ${((plan.monthlyPrice - plan.annualPrice!) * 12).toFixed(2)})
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">Custom</div>
                  )}
                </div>

                {/* CTA Button */}
                {(() => {
                  const isCurrentPlan = activeSubscription && activeSubscription.plan === plan.id;
                  const planHierarchy: Record<string, number> = { essential: 1, professional: 2, enterprise: 3 };
                  const currentPlanLevel = activeSubscription ? planHierarchy[activeSubscription.plan] : 0;
                  const thisPlanLevel = planHierarchy[plan.id];
                  const isUpgrade = activeSubscription && thisPlanLevel > currentPlanLevel;
                  
                  return (
                    <button
                      onClick={() => handleSubscribe(plan.id as 'essential' | 'professional' | 'enterprise')}
                      disabled={
                        (loadingPlan !== null && plan.id !== 'enterprise') ||
                        isCurrentPlan
                      }
                      className={`w-full py-3 rounded-xl font-semibold transition-all mb-8 flex items-center justify-center gap-2 ${
                        isCurrentPlan
                          ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {loadingPlan === plan.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Redirecting...
                        </>
                      ) : isCurrentPlan ? (
                        'Current Plan'
                      ) : isUpgrade ? (
                        'Upgrade'
                      ) : (
                        plan.cta
                      )}
                    </button>
                  );
                })()}

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 flex-shrink-0 text-slate-900 dark:text-slate-100 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 flex-shrink-0 text-slate-300 dark:text-slate-600 mt-0.5" />
                      )}
                      <span className={`text-sm ${feature.included ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Questions? We're here to help.</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Contact our sales team to discuss Enterprise pricing or custom solutions.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:partsonmanyika@gmail.com?subject=Enterprise Plan Inquiry&body=Hi, I'm interested in the Enterprise plan. Please contact me."
              className="bg-slate-900 dark:bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Email Sales
            </a>
            <a 
              href="tel:+14694738724"
              className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-2 border-slate-300 dark:border-slate-600 px-8 py-3 rounded-xl font-semibold hover:border-slate-400 dark:hover:border-slate-500 transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Schedule a Demo
            </a>
          </div>
        </div>
    </div>
  );
};

