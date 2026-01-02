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
import { getSubscriptionPlans } from '../services/pricingService';
import { Chatbot } from './Chatbot';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onSelectPlan?: (planId: 'essential' | 'professional', interval: 'month' | 'year') => void;
  onPrivacyClick?: () => void;
  onTermsClick?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn, onSelectPlan, onPrivacyClick, onTermsClick }) => {
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
  const [pricingPlans, setPricingPlans] = useState<{
    essential: { monthly: string };
    professional: { monthly: string };
  }>({
    essential: { monthly: '$24.98' },
    professional: { monthly: '$44.98' },
  });
  const [pricingLoading, setPricingLoading] = useState(true);
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

  // Load prices from database
  useEffect(() => {
    const loadPrices = async () => {
      try {
        setPricingLoading(true);
        const plans = await getSubscriptionPlans();
        const essential = plans.find(p => p.planId === 'essential');
        const professional = plans.find(p => p.planId === 'professional');
        
        setPricingPlans({
          essential: { monthly: `$${essential?.monthlyPrice.toFixed(2) || '24.98'}` },
          professional: { monthly: `$${professional?.monthlyPrice.toFixed(2) || '44.98'}` },
        });
      } catch (error) {
        console.error('Error loading prices from database:', error);
        // Keep default prices if database fetch fails - don't break the page
        setPricingPlans({
          essential: { monthly: '$24.98' },
          professional: { monthly: '$44.98' },
        });
      } finally {
        setPricingLoading(false);
      }
    };
    loadPrices();
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
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-all duration-500 ${
        scrolled 
          ? 'bg-slate-950/98 border-slate-700/30 shadow-2xl shadow-black/20' 
          : 'bg-slate-950/70 border-slate-800/30'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 rounded-xl group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-600/50 transition-all duration-300">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent group-hover:from-blue-300 group-hover:via-white group-hover:to-blue-300 transition-all duration-300">
                LoadMaster
              </span>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={scrollToFeatures}
                className="hidden md:block text-sm font-medium text-slate-300 hover:text-white transition-all duration-300 hover:scale-105 relative group"
              >
                Features
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-300"></span>
              </button>
              <button
                onClick={scrollToPricing}
                className="hidden md:block text-sm font-medium text-slate-300 hover:text-white transition-all duration-300 hover:scale-105 relative group"
              >
                Pricing
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-300"></span>
              </button>
              <button
                onClick={onSignIn}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 active:scale-100 transition-all duration-300"
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
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
          {/* Animated grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>
          {/* Smooth transition to next section */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent via-slate-900/40 to-slate-900 pointer-events-none" />
          
          <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Text Content */}
              <div className="space-y-8">
                {/* Headline */}
                <h1 className={`text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight ${visibleSections.has('hero') ? 'animate-fade-in-up delay-100' : 'opacity-0'}`}>
                  <span className="text-white drop-shadow-lg">
                    Manage your fleet
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-x">
                    the modern way
                  </span>
                </h1>
                
                {/* Description */}
                <p className={`text-xl md:text-2xl text-slate-300 leading-relaxed max-w-2xl ${visibleSections.has('hero') ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
                  LoadMaster gives you <span className="text-white font-semibold">real-time visibility</span> into every load, driver, and dispatcher. 
                  Make <span className="text-emerald-400 font-semibold">data-driven decisions</span> and grow your trucking business with confidence.
                </p>
                
                {/* CTA Buttons */}
                <div className={`flex flex-col sm:flex-row items-start gap-4 ${visibleSections.has('hero') ? 'animate-fade-in-up delay-300' : 'opacity-0'}`}>
                  <button
                    onClick={onGetStarted}
                    className="btn-primary group relative px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 hover:from-blue-700 hover:via-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 active:scale-100 transition-all duration-300 flex items-center gap-2 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Get Started Free
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/20 to-blue-500/0 group-hover:from-blue-500/20 group-hover:via-blue-400/40 group-hover:to-blue-500/20 transition-all duration-500 -translate-x-full group-hover:translate-x-full"></div>
                  </button>
                  <button
                    onClick={scrollToPricing}
                    className="relative px-8 py-4 border-2 border-slate-700/50 hover:border-slate-600/80 text-slate-200 font-semibold rounded-xl hover:bg-slate-800/60 hover:scale-105 active:scale-100 transition-all duration-300 backdrop-blur-sm group overflow-hidden"
                  >
                    <span className="relative z-10">View Pricing</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-700/0 via-slate-600/10 to-slate-700/0 group-hover:from-slate-700/20 group-hover:via-slate-600/30 group-hover:to-slate-700/20 transition-all duration-500 -translate-x-full group-hover:translate-x-full"></div>
                  </button>
                </div>
              </div>

              {/* Right Column - Hero Image */}
              <div className={`relative ${visibleSections.has('hero') ? 'animate-fade-in-up delay-400' : 'opacity-0'}`}>
                <div className="relative flex items-center justify-center group">
                  <div className="relative w-full max-w-4xl rounded-3xl overflow-hidden bg-slate-800/40 border border-slate-700/30 hover:border-slate-600/50 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-blue-600/20">
                    <img
                      src="/images/hero4.png"
                      alt="LoadMaster Dashboard - Modern fleet management interface"
                      className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-[1.02]"
                      onError={(e) => {
                        // Fallback: hide image and show placeholder
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {/* Enhanced glow effects */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/15 via-emerald-600/15 to-blue-600/15 rounded-3xl blur-3xl -z-10 pointer-events-none opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats - Moved below */}
            <div className={`grid grid-cols-3 gap-8 pt-24 max-w-3xl mx-auto ${visibleSections.has('hero') ? 'animate-fade-in-up delay-500' : 'opacity-0'}`}>
              {[
                { value: '$0', label: 'Setup Fee', circleColor: 'bg-blue-500/10' },
                { value: '14 Days', label: 'Free Trial', circleColor: 'bg-emerald-500/10' },
                { value: '24/7', label: 'Support', circleColor: 'bg-blue-400/10' }
              ].map((stat, index) => (
                <div
                  key={index}
                  className="relative text-center group hover:scale-110 transition-all duration-500"
                >
                  {/* Individual circular background for each stat with smooth fade */}
                  <div 
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-3xl pointer-events-none group-hover:w-48 group-hover:h-48 transition-all duration-500`}
                    style={{
                      background: `radial-gradient(circle, ${stat.circleColor.includes('blue-500') ? 'rgba(59, 130, 246, 0.2)' : stat.circleColor.includes('emerald') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(96, 165, 250, 0.2)'} 0%, ${stat.circleColor.includes('blue-500') ? 'rgba(59, 130, 246, 0.1)' : stat.circleColor.includes('emerald') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(96, 165, 250, 0.1)'} 40%, transparent 100%)`
                    }}
                  ></div>
                  
                  <div className="relative z-10 text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:via-emerald-300 group-hover:to-blue-300 bg-[length:200%_100%] group-hover:animate-gradient-x transition-all duration-500">
                    {stat.value}
                  </div>
                  <div className="relative z-10 text-sm font-medium text-slate-400 mt-2 group-hover:text-slate-200 transition-colors duration-300">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section ref={featuresRef} id="features" data-section="features" className="relative py-16 bg-slate-900">
          {/* Smooth transition from hero */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900 pointer-events-none" />
          {/* Smooth transition to email section */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-slate-900 via-slate-900/95 to-slate-900 pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className={`text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight ${visibleSections.has('features') ? 'animate-fade-in-up delay-100' : 'opacity-0'}`}>
                Everything you need to
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-x">run your fleet</span>
              </h2>
              <p className={`text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed ${visibleSections.has('features') ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
                Powerful tools designed specifically for <span className="text-slate-300 font-medium">trucking operations</span>
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
                  className={`feature-card group relative p-8 rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-800/40 to-slate-900/50 border border-slate-700/50 hover:border-slate-600/70 hover:from-slate-800/70 hover:via-slate-800/60 hover:to-slate-900/70 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-600/20 hover:-translate-y-2 overflow-hidden ${visibleSections.has('features') ? 'animate-fade-in-up' : 'opacity-0'}`}
                  style={{ animationDelay: `${(index + 3) * 0.1}s` }}
                >
                  {/* Animated background gradient */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-600/0 via-emerald-600/0 to-blue-600/0 group-hover:from-blue-600/10 group-hover:via-emerald-600/10 group-hover:to-blue-600/10 transition-all duration-500 pointer-events-none"></div>
                  
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/0 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color} mb-5 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-xl group-hover:shadow-blue-600/40 transition-all duration-300`}>
                      <feature.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-extrabold mb-3 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-emerald-400 group-hover:bg-clip-text transition-all duration-300">{feature.title}</h3>
                    <p className="text-slate-400 leading-relaxed group-hover:text-slate-200 transition-colors duration-300">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Email Subscription */}
        <section ref={emailRef} data-section="email" className="relative py-12 bg-slate-900">
          {/* Smooth transition from features */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-slate-900 via-slate-900/95 to-transparent pointer-events-none" />
          {/* Smooth transition to pricing */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6">
            <div className={`text-center space-y-8 p-12 rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-800/40 to-slate-900/50 border border-slate-700/50 hover:border-slate-600/70 hover:bg-slate-800/60 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-600/20 hover:-translate-y-1 ${visibleSections.has('email') ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-500/20 mb-2">
                <Mail className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-blue-300 font-medium">Newsletter</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold">
                Stay ahead of the curve
              </h2>
              <p className="text-lg md:text-xl text-slate-300 max-w-xl mx-auto leading-relaxed">
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
                  className="flex-1 px-5 py-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-slate-900/80 transition-all duration-300 backdrop-blur-sm"
                />
                <button
                  type="submit"
                  className="btn-primary relative px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 active:scale-100 transition-all duration-300 flex items-center justify-center gap-2 group overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Subscribe
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/20 to-blue-500/0 group-hover:from-blue-500/20 group-hover:via-blue-400/40 group-hover:to-blue-500/20 transition-all duration-500 -translate-x-full group-hover:translate-x-full"></div>
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
        <section ref={pricingRef} data-section="pricing" id="pricing" className="relative py-16 bg-slate-900">
          {/* Smooth transition from email */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900 pointer-events-none" />
          {/* Smooth transition to contact */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-slate-900 via-slate-900/95 to-slate-900 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className={`text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight ${visibleSections.has('pricing') ? 'animate-fade-in-up delay-100' : 'opacity-0'}`}>
                Simple, transparent <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-x">pricing</span>
              </h2>
              <p className={`text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed ${visibleSections.has('pricing') ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
                Choose the plan that fits your fleet. <span className="text-slate-300 font-medium">Upgrade or downgrade anytime.</span>
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  name: 'Essential',
                  price: pricingPlans.essential.monthly,
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
                  price: pricingPlans.professional.monthly,
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
                  className="relative"
                  style={{ animationDelay: `${(index + 3) * 0.15}s` }}
                >
                  {plan.popular && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 px-5 py-1.5 bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 text-white text-sm font-bold rounded-full shadow-lg shadow-blue-600/50">
                      Most Popular
                    </div>
                  )}
                  <div
                    className={`pricing-card relative p-10 rounded-3xl border-2 transition-all duration-500 overflow-hidden ${
                      plan.popular
                        ? 'border-blue-500/60 bg-slate-800/90 scale-105 hover:scale-110 hover:border-blue-400'
                        : 'border-slate-700/30 bg-slate-800/40 hover:border-slate-600/50 hover:bg-slate-800/60 hover:scale-105'
                    } ${visibleSections.has('pricing') ? 'animate-scale-in' : 'opacity-0'}`}
                  >
                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
                  
                  <div className="relative z-10 mb-6 group-hover:scale-105 transition-transform duration-300">
                    <h3 className="text-2xl font-extrabold mb-2 text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">{plan.price}</span>
                      <span className="text-slate-400 font-medium">{plan.period}</span>
                    </div>
                    <p className="text-slate-400 mt-2 leading-relaxed">{plan.description}</p>
                  </div>
                  <ul className="relative z-10 space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 group/item hover:translate-x-2 transition-all duration-300 hover:text-white">
                        <Check className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5 group-hover/item:scale-125 group-hover/item:text-emerald-300 transition-all duration-300" />
                        <span className="text-slate-300 group-hover/item:text-white transition-colors duration-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => plan.planId ? handleLandingCheckout(plan.planId) : scrollToContact()}
                    className={`relative z-10 btn-primary w-full py-3.5 rounded-xl font-bold group overflow-hidden transition-all duration-300 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 hover:from-blue-700 hover:via-blue-700 hover:to-blue-800 text-white shadow-xl shadow-blue-600/30 hover:shadow-blue-600/40 hover:scale-105'
                        : 'bg-slate-700/80 hover:bg-slate-600/90 text-white hover:scale-105'
                    }`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {plan.cta}
                      {plan.planId && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />}
                    </span>
                    {plan.popular && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/20 to-blue-500/0 group-hover:from-blue-500/20 group-hover:via-blue-400/40 group-hover:to-blue-500/20 transition-all duration-500 -translate-x-full group-hover:translate-x-full"></div>
                    )}
                  </button>
                  </div>
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
          className="relative py-16 bg-slate-900"
        >
          {/* Smooth transition from pricing */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900 pointer-events-none" />
          {/* Smooth transition to footer */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-slate-950 via-slate-900/95 to-slate-900 pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6">
            <div className={`text-center mb-16 ${visibleSections.has('contact') ? 'animate-fade-in-up delay-100' : 'opacity-0'}`}>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight">
                Get in touch
              </h2>
              <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Have questions? Want to learn more? <span className="text-slate-300 font-medium">We're here to help.</span>
              </p>
            </div>

            <div className={`bg-gradient-to-br from-slate-800/60 via-slate-800/50 to-slate-900/60 border border-slate-700/50 rounded-3xl p-10 hover:border-slate-600/70 hover:bg-slate-800/70 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-600/10 ${visibleSections.has('contact') ? 'animate-scale-in delay-200' : 'opacity-0'}`}>
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
                      className="w-full px-5 py-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-slate-900/80 transition-all duration-300 backdrop-blur-sm"
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
                      className="w-full px-5 py-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-slate-900/80 transition-all duration-300 backdrop-blur-sm"
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
                      className="w-full px-5 py-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-slate-900/80 transition-all duration-300 backdrop-blur-sm"
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
                      className="w-full px-5 py-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-slate-900/80 transition-all duration-300 backdrop-blur-sm"
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
                    className="w-full px-5 py-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-slate-900/80 resize-none transition-all duration-300 backdrop-blur-sm"
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
                  <button 
                    onClick={onPrivacyClick}
                    className="hover:text-white transition-colors text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={onTermsClick}
                    className="hover:text-white transition-colors text-left"
                  >
                    Terms of Service
                  </button>
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
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.6;
          }
        }
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
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
      <Chatbot 
        systemPrompt={`You are a helpful assistant for LoadMaster, a trucking load management platform. Help users understand the platform's features, pricing, and how to get started. 

Key information about LoadMaster:
- LoadMaster is a comprehensive trucking load management platform
- Pricing plans: Essential at $${pricingPlans.essential.monthly}/month, Professional at $${pricingPlans.professional.monthly}/month
- Features include: Fleet management, load tracking, dispatcher management, driver management, financial reporting, and AI-powered analytics
- Users can sign up to get started or contact for more information

Be friendly, concise, and professional. Always encourage users to sign up or contact for more information.`}
      />
    </div>
  );
};
