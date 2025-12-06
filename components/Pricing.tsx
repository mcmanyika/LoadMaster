import React, { useState } from 'react';
import { Check, X, Zap, Users, Building2, Sparkles, ArrowRight, BarChart3, Brain, Shield, Mail, Phone, Headphones, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { createSubscriptionIntent } from '../services/paymentIntentService';
import { getActiveSubscription, Subscription } from '../services/subscriptionService';

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
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        if (currentUser?.id) {
          setLoadingSubscription(true);
          const { subscription } = await getActiveSubscription(currentUser.id);
          setActiveSubscription(subscription);
        }
      } catch (err) {
        console.error('Error loading user or subscription:', err);
      } finally {
        setLoadingSubscription(false);
      }
    };
    
    loadUserAndSubscription();
  }, []);

  const plans = [
    {
      id: 'essential',
      name: 'Essential',
      tagline: 'Perfect for small fleets',
      icon: <Zap className="w-6 h-6" />,
      monthlyPrice: 99,
      annualPrice: 85, // 15% off
      features: [
        { text: 'Up to 5 users', included: true },
        { text: 'Up to 50 loads/month', included: true },
        { text: 'Unlimited transporters & drivers', included: true },
        { text: 'Load management & tracking', included: true },
        { text: 'Basic dashboard & analytics', included: true },
        { text: 'Mobile driver app access', included: true },
        { text: '5 AI analysis reports/month', included: true },
        { text: 'Email support', included: true },
        { text: '30-day data retention', included: true },
        { text: 'Custom dispatcher fees', included: false },
        { text: 'Export reports (CSV, PDF)', included: false },
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
      monthlyPrice: 199,
      annualPrice: 170, // 15% off
      features: [
        { text: 'Up to 15 users', included: true },
        { text: 'Up to 500 loads/month', included: true },
        { text: 'Everything in Essential', included: true },
        { text: '20 AI analysis reports/month', included: true },
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
      monthlyPrice: null,
      annualPrice: null,
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
        { text: 'Multi-location support', included: true },
        { text: 'SLA guarantees', included: true },
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  const addOns = [
    { name: 'Extra AI Analysis Reports', price: '$2.50 each', pack: '$50 for 25-pack', icon: <Brain className="w-5 h-5" /> },
    { name: 'Advanced Reporting Suite', price: '+$50/month', icon: <BarChart3 className="w-5 h-5" /> },
    { name: 'API Access', price: '+$99/month', icon: <Sparkles className="w-5 h-5" /> },
    { name: 'White-Label Option', price: '+$149/month', icon: <Shield className="w-5 h-5" /> },
  ];

  const handleSubscribe = async (planId: 'essential' | 'professional' | 'enterprise') => {
    // Don't allow subscription to the same plan if user already has it active
    if (activeSubscription && activeSubscription.plan === planId) {
      setError(`You already have an active ${planId} subscription. Please manage it from "My Subscriptions" page.`);
      return;
    }

    if (planId === 'enterprise') {
      // For enterprise, open email client
      window.location.href = `mailto:sales@loadmaster.com?subject=Enterprise Plan Inquiry&body=Hi, I'm interested in the Enterprise plan. Please contact me.`;
      return;
    }

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
              className="mb-8 text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back
            </button>
          )}
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Choose the plan that fits your fleet. All plans include a 14-day free trial. No credit card required.
          </p>
          
          {/* Active Subscription Notice */}
          {!loadingSubscription && activeSubscription && (
            <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-emerald-800 max-w-2xl mx-auto">
              <CheckCircle2 size={20} className="flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold">You have an active subscription</p>
                <p className="text-xs mt-1">
                  Current plan: <span className="font-medium capitalize">{activeSubscription.plan}</span> 
                  {' • '}
                  {activeSubscription.interval === 'month' ? 'Monthly' : 'Annual'} billing
                  {' • '}
                  <span className="text-emerald-600">Upgrade to a higher plan anytime</span>
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-rose-800 max-w-2xl mx-auto">
              <AlertCircle size={20} className="flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                billingCycle === 'annual'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
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
              className={`relative bg-white rounded-2xl border-2 transition-all duration-300 ${
                plan.popular
                  ? 'border-slate-900 shadow-2xl scale-105'
                  : 'border-slate-200 hover:border-slate-300 shadow-lg hover:shadow-xl'
              } ${hoveredPlan === plan.id && !plan.popular ? 'scale-[1.02]' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <div className="p-8">
                {/* Plan Header */}
                <div className="inline-flex items-center gap-2 text-slate-900 mb-4">
                  {plan.icon}
                  <span className="font-semibold">{plan.name}</span>
                </div>
                <p className="text-slate-600 text-sm mb-6">{plan.tagline}</p>

                {/* Price */}
                <div className="mb-6">
                  {plan.monthlyPrice ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-slate-900">
                          ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                        </span>
                        <span className="text-slate-500">/month</span>
                      </div>
                      {billingCycle === 'annual' && (
                        <p className="text-sm text-slate-500 mt-1">
                          ${plan.monthlyPrice * 12}/year (save ${(plan.monthlyPrice - plan.annualPrice!) * 12})
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-4xl font-bold text-slate-900">Custom</div>
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
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
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
                        <Check className="w-5 h-5 flex-shrink-0 text-slate-900 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 flex-shrink-0 text-slate-300 mt-0.5" />
                      )}
                      <span className={`text-sm ${feature.included ? 'text-slate-700' : 'text-slate-400'}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Add-Ons Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Add-On Services</h2>
          <p className="text-slate-600 mb-8">Enhance your plan with these optional services</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addOns.map((addon, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div className="p-2 bg-slate-100 rounded-lg text-slate-900 flex-shrink-0">
                  {addon.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">{addon.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-medium">{addon.price}</span>
                    {addon.pack && (
                      <>
                        <span>•</span>
                        <span>{addon.pack}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-900 flex-shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">Onboarding & Training</h3>
                <p className="text-sm text-slate-600 font-medium">$250 one-time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Questions? We're here to help.</h2>
          <p className="text-slate-600 mb-6">Contact our sales team to discuss Enterprise pricing or custom solutions.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
              <Mail className="w-5 h-5" />
              Email Sales
            </button>
            <button className="bg-white text-slate-900 border-2 border-slate-300 px-8 py-3 rounded-xl font-semibold hover:border-slate-400 transition-colors flex items-center justify-center gap-2">
              <Phone className="w-5 h-5" />
              Schedule a Demo
            </button>
          </div>
        </div>
    </div>
  );
};

