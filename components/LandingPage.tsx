import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  LayoutDashboard,
  ArrowRight,
  Users,
  BrainCircuit,
  Mail,
  MessageSquare,
  Check,
  BarChart3,
  DollarSign,
  FileText,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';
import { submitContactForm } from '../services/contactService';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onSelectPlan?: (planId: 'essential' | 'professional', interval: 'month' | 'year') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn, onSelectPlan }) => {
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: ''
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('data-section');
          if (sectionId) {
            setVisibleSections((prev) => new Set(prev).add(sectionId));
          }
        }
      });
    }, observerOptions);

    const sections = [
      heroRef.current,
      featuresRef.current,
      emailRef.current,
      pricingRef.current,
      contactRef.current,
    ].filter(Boolean);

    sections.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      sections.forEach((section) => {
        if (section) observer.unobserve(section);
      });
    };
  }, []);

  const scrollToPricing = () => {
    const el = document.getElementById('pricing');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToFeatures = () => {
    const el = document.getElementById('features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLandingCheckout = (planId: 'essential' | 'professional') => {
    if (onSelectPlan) {
      onSelectPlan(planId, 'month');
    }
    onGetStarted();
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    
    setContactSubmitting(true);
    setContactError(null);
    try {
      await submitContactForm({
        name: contactForm.name,
        email: contactForm.email,
        company: contactForm.company || undefined,
        phone: contactForm.phone || undefined,
        message: contactForm.message
      });
      
      setContactForm({ name: '', email: '', company: '', phone: '', message: '' });
      setContactSubmitted(true);
      setTimeout(() => setContactSubmitted(false), 5000);
    } catch (error: any) {
      console.error('Error submitting contact form:', error);
      setContactError(error?.message || 'Failed to send message. Please try again or email us directly at support@loadmaster.sh');
      setTimeout(() => setContactError(null), 8000);
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b transition-all duration-300 ${
        scrolled 
          ? 'bg-slate-950/95 border-slate-700/50 shadow-lg shadow-black/10' 
          : 'bg-slate-950/80 border-slate-800/50'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                LoadMaster
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={scrollToFeatures}
                className="hidden md:block text-sm text-slate-300 hover:text-white transition-all duration-300 hover:scale-105"
              >
                Features
              </button>
              <button
                onClick={scrollToPricing}
                className="hidden md:block text-sm text-slate-300 hover:text-white transition-all duration-300 hover:scale-105"
              >
                Pricing
              </button>
              <button
                onClick={onSignIn}
                className="btn-primary px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
        <section ref={heroRef} data-section="hero" className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-900">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-emerald-600/10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl" />
          {/* Smooth transition to next section */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-slate-900/40 to-slate-900 pointer-events-none" />
          
          <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
            <div className="text-center max-w-4xl mx-auto space-y-8">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 hover:border-blue-500/30 transition-all duration-300 ${visibleSections.has('hero') ? 'animate-fade-in-up delay-100' : 'opacity-0'}`}>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm text-blue-300 font-medium">Built for modern trucking operations</span>
              </div>
              
              <h1 className={`text-5xl md:text-6xl lg:text-7xl font-bold leading-tight ${visibleSections.has('hero') ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
                <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                  Stop managing your fleet
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  with spreadsheets
                </span>
              </h1>
              
              <p className={`text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed ${visibleSections.has('hero') ? 'animate-fade-in-up delay-300' : 'opacity-0'}`}>
                LoadMaster gives you real-time visibility into every load, driver, and dispatcher. 
                Make data-driven decisions and grow your trucking business with confidence.
              </p>
              
              <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 ${visibleSections.has('hero') ? 'animate-fade-in-up delay-400' : 'opacity-0'}`}>
                <button
                  onClick={onGetStarted}
                  className="btn-primary group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 flex items-center gap-2"
                >
                  Get Started Free
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
                <button
                  onClick={scrollToPricing}
                  className="px-8 py-4 border-2 border-slate-700 hover:border-slate-600 text-slate-200 font-semibold rounded-xl hover:bg-slate-800/50 hover:scale-105 active:scale-100 transition-all duration-300"
                >
                  View Pricing
                </button>
              </div>

              {/* Stats */}
              <div className={`grid grid-cols-3 gap-8 pt-16 max-w-3xl mx-auto ${visibleSections.has('hero') ? 'animate-fade-in-up delay-500' : 'opacity-0'}`}>
                {[
                  { value: '$0', label: 'Setup Fee', circleColor: 'bg-blue-500/10' },
                  { value: '14 Days', label: 'Free Trial', circleColor: 'bg-emerald-500/10' },
                  { value: '24/7', label: 'Support', circleColor: 'bg-blue-400/10' }
                ].map((stat, index) => (
                  <div
                    key={index}
                    className="relative text-center group hover:scale-110 transition-transform duration-300"
                  >
                    {/* Individual circular background for each stat with smooth fade */}
                    <div 
                      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-3xl pointer-events-none`}
                      style={{
                        background: `radial-gradient(circle, ${stat.circleColor.includes('blue-500') ? 'rgba(59, 130, 246, 0.15)' : stat.circleColor.includes('emerald') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(96, 165, 250, 0.15)'} 0%, ${stat.circleColor.includes('blue-500') ? 'rgba(59, 130, 246, 0.08)' : stat.circleColor.includes('emerald') ? 'rgba(16, 185, 129, 0.08)' : 'rgba(96, 165, 250, 0.08)'} 40%, transparent 100%)`
                      }}
                    ></div>
                    
                    <div className="relative z-10 text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-emerald-300 transition-all duration-300">
                      {stat.value}
                    </div>
                    <div className="relative z-10 text-sm text-slate-400 mt-1 group-hover:text-slate-300 transition-colors duration-300">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section ref={featuresRef} id="features" data-section="features" className="relative py-24 bg-slate-900">
          {/* Smooth transition from hero */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900 pointer-events-none" />
          {/* Smooth transition to email section */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-slate-900 via-slate-900/95 to-slate-900 pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${visibleSections.has('features') ? 'animate-fade-in-up delay-100' : 'opacity-0'}`}>
                Everything you need to
                <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent"> run your fleet</span>
              </h2>
              <p className={`text-xl text-slate-400 max-w-2xl mx-auto ${visibleSections.has('features') ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
                Powerful tools designed specifically for trucking operations
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: LayoutDashboard,
                  title: 'Real-Time Dashboard',
                  description: 'See your weekly gross, RPM, miles, and driver pay at a glance. Track performance from Monday to Saturday.',
                  color: 'from-blue-500 to-blue-600'
                },
                {
                  icon: BarChart3,
                  title: 'Advanced Analytics',
                  description: 'AI-powered insights highlight your best lanes, weak RPM routes, and dispatcher performance trends.',
                  color: 'from-emerald-500 to-emerald-600'
                },
                {
                  icon: Users,
                  title: 'Fleet Management',
                  description: 'Manage drivers, dispatchers, and vehicles in one place. Track assignments and performance metrics.',
                  color: 'from-violet-500 to-violet-600'
                },
                {
                  icon: DollarSign,
                  title: 'Automated Calculations',
                  description: 'Driver pay, dispatch fees, and net profit calculated automatically. No more manual spreadsheet errors.',
                  color: 'from-amber-500 to-amber-600'
                },
                {
                  icon: FileText,
                  title: 'Document Management',
                  description: 'Store and organize Rate Confirmation PDFs securely in the cloud. Access from anywhere, anytime.',
                  color: 'from-rose-500 to-rose-600'
                },
                {
                  icon: Zap,
                  title: 'Lightning Fast',
                  description: 'Built for speed. Load data updates in real-time. No waiting, no lag, just instant insights.',
                  color: 'from-cyan-500 to-cyan-600'
                }
              ].map((feature, index) => (
                <div
                  key={index}
                  className={`feature-card group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800 transition-all duration-300 ${visibleSections.has('features') ? 'animate-fade-in-up' : 'opacity-0'}`}
                  style={{ animationDelay: `${(index + 3) * 0.1}s` }}
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-white transition-colors duration-300">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors duration-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Email Subscription */}
        <section ref={emailRef} data-section="email" className="relative py-16 bg-slate-900">
          {/* Smooth transition from features */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-slate-900 via-slate-900/95 to-transparent pointer-events-none" />
          {/* Smooth transition to pricing */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6">
            <div className={`text-center space-y-6 p-8 rounded-2xl bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/40 transition-all duration-300 ${visibleSections.has('email') ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
              <h2 className="text-3xl md:text-4xl font-bold">
                Stay ahead of the curve
              </h2>
              <p className="text-lg text-slate-300">
                Get the latest LoadMaster updates, new features, and fleet management tips delivered to your inbox.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!email) return;
                  console.log('Email subscribed:', email);
                  setEmail('');
                  setEmailSubmitted(true);
                  setTimeout(() => setEmailSubmitted(false), 4000);
                }}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                <button
                  type="submit"
                  className="btn-primary px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 group"
                >
                  Subscribe
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </form>
              {emailSubmitted && (
                <p className="text-emerald-400 text-sm">
                  ✓ Thanks! You're subscribed to our updates.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section ref={pricingRef} data-section="pricing" id="pricing" className="relative py-24 bg-slate-900">
          {/* Smooth transition from email */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900 pointer-events-none" />
          {/* Smooth transition to contact */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-slate-900 via-slate-900/95 to-slate-900 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${visibleSections.has('pricing') ? 'animate-fade-in-up delay-100' : 'opacity-0'}`}>
                Simple, transparent
                <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent"> pricing</span>
              </h2>
              <p className={`text-xl text-slate-400 ${visibleSections.has('pricing') ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
                Choose the plan that fits your fleet. Upgrade or downgrade anytime.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  name: 'Essential',
                  price: '$12.49',
                  period: '/month',
                  description: 'Perfect for solo owners and small dispatch operations',
                  features: [
                    'Weekly fleet dashboard',
                    'Load management & tracking',
                    'Rate confirmation PDF storage',
                    'Driver pay calculations',
                    'Dispatch fee tracking',
                    'Basic reporting'
                  ],
                  cta: 'Start Essential',
                  popular: false,
                  planId: 'essential' as const
                },
                {
                  name: 'Professional',
                  price: '$22.49',
                  period: '/month',
                  description: 'For dispatchers and fleets that want serious visibility',
                  features: [
                    'Everything in Essential',
                    'AI-powered analysis reports',
                    'Advanced reporting by dispatcher & driver',
                    'Performance trend analysis',
                    'Custom driver pay configurations',
                    'Priority support'
                  ],
                  cta: 'Start Professional',
                  popular: true,
                  planId: 'professional' as const
                },
                {
                  name: 'Enterprise',
                  price: 'Custom',
                  period: '',
                  description: 'Custom setups for larger fleets and multi-company operations',
                  features: [
                    'Everything in Professional',
                    'Multi-company support',
                    'Custom onboarding & training',
                    'Dedicated account manager',
                    'API access',
                    'White-label options'
                  ],
                  cta: 'Contact Sales',
                  popular: false,
                  planId: null
                }
              ].map((plan, index) => (
                <div
                  key={index}
                  className={`pricing-card relative p-8 rounded-2xl border-2 ${
                    plan.popular
                      ? 'border-blue-500 bg-gradient-to-br from-slate-800 to-slate-900 scale-105 shadow-2xl shadow-blue-500/20'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  } ${visibleSections.has('pricing') ? 'animate-scale-in' : 'opacity-0'}`}
                  style={{ animationDelay: `${(index + 3) * 0.15}s` }}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-full">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-6 group-hover:scale-105 transition-transform duration-300">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-slate-400">{plan.period}</span>
                    </div>
                    <p className="text-slate-400 mt-2">{plan.description}</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 group/item hover:translate-x-2 transition-transform duration-300">
                        <Check className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5 group-hover/item:scale-125 transition-transform duration-300" />
                        <span className="text-slate-300 group-hover/item:text-white transition-colors duration-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => plan.planId ? handleLandingCheckout(plan.planId) : scrollToContact()}
                    className={`btn-primary w-full py-3 rounded-lg font-semibold group ${
                      plan.popular
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-600/25'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {plan.cta}
                      {plan.planId && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section
          ref={contactRef}
          data-section="contact"
          id="contact"
          className="relative py-24 bg-slate-900"
        >
          {/* Smooth transition from pricing */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900 pointer-events-none" />
          {/* Smooth transition to footer */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-slate-950 via-slate-900/95 to-slate-900 pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6">
            <div className={`text-center mb-12 ${visibleSections.has('contact') ? 'animate-fade-in-up delay-100' : 'opacity-0'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Get in touch
              </h2>
              <p className="text-xl text-slate-400">
                Have questions? Want to learn more? We're here to help.
              </p>
            </div>

            <div className={`bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-slate-600 transition-all duration-300 ${visibleSections.has('contact') ? 'animate-scale-in delay-200' : 'opacity-0'}`}>
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      value={contactForm.company}
                      onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Your Company"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200"
                    placeholder="Tell us about your fleet or ask any questions..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="btn-primary w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {contactSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                      Send Message
                    </>
                  )}
                </button>
                {contactSubmitted && (
                  <div className="p-4 bg-emerald-900/20 border border-emerald-800/30 rounded-lg flex items-center gap-2 text-emerald-400 animate-fade-in">
                    <Mail className="h-5 w-5" />
                    <span>Thanks for reaching out! We'll get back to you soon.</span>
                  </div>
                )}
                {contactError && (
                  <div className="p-4 bg-rose-900/20 border border-rose-800/30 rounded-lg flex items-center gap-2 text-rose-400 animate-fade-in">
                    <Mail className="h-5 w-5" />
                    <span>{contactError}</span>
                  </div>
                )}
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg">
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">LoadMaster</span>
              </div>
              <p className="text-sm text-slate-400">
                The modern way to manage your trucking fleet. Track loads, manage drivers, and grow your business.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <button onClick={scrollToFeatures} className="hover:text-white transition-colors">
                    Features
                  </button>
                </li>
                <li>
                  <button onClick={scrollToPricing} className="hover:text-white transition-colors">
                    Pricing
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <button onClick={scrollToContact} className="hover:text-white transition-colors">
                    Contact
                  </button>
                </li>
                <li>
                  <a href="mailto:support@loadmaster.sh" className="hover:text-white transition-colors">
                    Support
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800">
            <p className="text-center text-sm text-slate-500">
              © {new Date().getFullYear()} LoadMaster. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-fade-in {
          animation: fadeIn 1s ease-out forwards;
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.8s ease-out forwards;
        }
        .animate-slide-in-right {
          animation: slideInRight 0.8s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.6s ease-out forwards;
        }
        .delay-100 { animation-delay: 0.1s; opacity: 0; }
        .delay-200 { animation-delay: 0.2s; opacity: 0; }
        .delay-300 { animation-delay: 0.3s; opacity: 0; }
        .delay-400 { animation-delay: 0.4s; opacity: 0; }
        .delay-500 { animation-delay: 0.5s; opacity: 0; }
        .delay-600 { animation-delay: 0.6s; opacity: 0; }
        
        /* Smooth transitions for interactive elements */
        * {
          transition-property: color, background-color, border-color, transform, opacity, box-shadow;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Smooth scroll */
        html {
          scroll-behavior: smooth;
        }
        
        /* Card hover effects */
        .feature-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.3);
        }
        
        /* Button hover effects */
        .btn-primary {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
        }
        .btn-primary:active {
          transform: translateY(0);
        }
        
        /* Pricing card hover */
        .pricing-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pricing-card:hover {
          transform: translateY(-12px) scale(1.02);
        }
        
        /* Input focus effects */
        input:focus, textarea:focus {
          transition: all 0.2s ease-out;
        }
        
        /* Navbar scroll effect */
        nav {
          transition: background-color 0.3s ease, backdrop-filter 0.3s ease;
        }
      `}</style>
    </div>
  );
};
