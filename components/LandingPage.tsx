import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  LayoutDashboard,
  ArrowRight,
  Users,
  BrainCircuit,
  TrendingUp
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onSelectPlan?: (planId: 'essential' | 'professional', interval: 'month' | 'year') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn, onSelectPlan }) => {
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const heroRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1, // Trigger when 10% of element is visible
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

    // Observe all sections
    const sections = [
      heroRef.current,
      featuresRef.current,
      pricingRef.current,
      emailRef.current,
      ctaRef.current,
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

  const handleLandingCheckout = (planId: 'essential' | 'professional') => {
    // For marketing landing page, route users into the in-app pricing flow
    // where Stripe Payment Intents are used.
    if (onSelectPlan) {
      onSelectPlan(planId, 'month');
    }
    onGetStarted();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
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
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 1.5s ease-out forwards;
        }
        .animate-fade-in {
          animation: fadeIn 2s ease-out forwards;
        }
        .animate-slide-in-left {
          animation: slideInLeft 1.5s ease-out forwards;
        }
        .animate-slide-in-right {
          animation: slideInRight 1.5s ease-out forwards;
        }
        .delay-100 {
          animation-delay: 0.2s;
          opacity: 0;
        }
        .delay-200 {
          animation-delay: 0.4s;
          opacity: 0;
        }
        .delay-300 {
          animation-delay: 0.6s;
          opacity: 0;
        }
        .delay-400 {
          animation-delay: 0.8s;
          opacity: 0;
        }
        .delay-500 {
          animation-delay: 1s;
          opacity: 0;
        }
      `}</style>
      {/* Top nav */}
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur animate-fade-in">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-600/90 p-2">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">LoadMaster</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-500"
            >
              Sign In
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-20 px-4 pb-20 pt-10">
        {/* Hero */}
        <section ref={heroRef} data-section="hero" className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-5">
            <span className={`inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300 ${visibleSections.has('hero') ? 'animate-fade-in-up delay-100' : 'opacity-0'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Built for dispatchers & fleet owners
            </span>
            <h1 className={`text-3xl font-bold tracking-tight text-slate-50 md:text-4xl lg:text-5xl ${visibleSections.has('hero') ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
              Run your trucking business from one
              <span className="text-blue-400"> clean dashboard.</span>
            </h1>
            <p className={`max-w-xl text-sm text-slate-300 md:text-base ${visibleSections.has('hero') ? 'animate-fade-in-up delay-300' : 'opacity-0'}`}>
              LoadMaster shows your weekly gross, RPM, miles and driver pay from Monday to Saturday, so freelance
              dispatchers and fleet owners always know exactly what each truck and dispatcher is producing.
            </p>
            <div className={`flex flex-wrap items-center gap-3 ${visibleSections.has('hero') ? 'animate-fade-in-up delay-400' : 'opacity-0'}`}>
              <button
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-500"
              >
                Start managing loads
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={scrollToPricing}
                className="text-sm text-slate-300 underline-offset-4 hover:text-white hover:underline"
              >
                View pricing
              </button>
            </div>
          </div>

          {/* Dashboard preview */}
          <div ref={dashboardRef} className="relative">
            <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="absolute -bottom-8 -right-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl ${visibleSections.has('hero') ? 'animate-slide-in-right delay-300' : 'opacity-0'}`}>
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-slate-300">Fleet Overview · This Week (Mon–Sat)</span>
                </div>
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 text-xs">
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <p className="text-[11px] text-slate-400">Total Gross (Mon–Sat)</p>
                  <p className="text-lg font-semibold text-slate-50">$6,750</p>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <p className="text-[11px] text-slate-400">Avg Rate Per Mile</p>
                  <p className="text-lg font-semibold text-slate-50">$1.77</p>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <p className="text-[11px] text-slate-400">Total Miles</p>
                  <p className="text-lg font-semibold text-slate-50">3,821</p>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <p className="text-[11px] text-slate-400">Driver Pay Output</p>
                  <p className="text-lg font-semibold text-emerald-400">$2,970</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-[11px] text-slate-400">
                <span>Broker · Fond du Lac, WI → Indianapolis, IN</span>
                <span className="font-semibold text-slate-200">$900</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section ref={featuresRef} id="features" data-section="features" className="space-y-6">
          <h2 className={`text-xl font-semibold text-slate-50 md:text-2xl ${visibleSections.has('features') ? 'animate-fade-in-up delay-100' : 'opacity-0'}`}>
            Everything dispatchers and owners need in one place.
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            <div className={`space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 ${visibleSections.has('features') ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
              <div className="inline-flex items-center justify-center rounded-lg bg-blue-600/10 p-2 text-blue-400">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold">Weekly fleet dashboard</h3>
              <p className="text-xs text-slate-300">
                See gross, RPM, miles and driver pay for Monday–Saturday at a glance. Filter by driver, dispatcher or
                company in seconds.
              </p>
            </div>
            <div className={`space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 ${visibleSections.has('features') ? 'animate-fade-in-up delay-300' : 'opacity-0'}`}>
              <div className="inline-flex items-center justify-center rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold">Aligned dispatchers & owners</h3>
              <p className="text-xs text-slate-300">
                Dispatchers see revenue by driver. Owners see revenue by dispatcher. Everyone shares one source of
                truth.
              </p>
            </div>
            <div className={`space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 ${visibleSections.has('features') ? 'animate-fade-in-up delay-400' : 'opacity-0'}`}>
              <div className="inline-flex items-center justify-center rounded-lg bg-violet-500/10 p-2 text-violet-300">
                <BrainCircuit className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold">AI-powered analysis</h3>
              <p className="text-xs text-slate-300">
                One-click AI reports highlight your best lanes, weak RPM routes and dispatcher performance trends.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing preview */}
        <section ref={pricingRef} data-section="pricing" id="pricing" className="space-y-6">
          <div className={visibleSections.has('pricing') ? 'animate-fade-in-up delay-200' : 'opacity-0'}>
            <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">
              Simple pricing.
            </h2>
            <p className="text-xs text-slate-300 md:text-sm">
              Start with the plan that fits your fleet today. Upgrade as you add more trucks and dispatchers.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className={`space-y-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 ${visibleSections.has('pricing') ? 'animate-fade-in-up delay-300' : 'opacity-0'}`}>
              <p className="text-xs font-semibold uppercase text-blue-300">Essential</p>
              <p className="text-2xl font-bold">
                $12.49<span className="text-xs text-slate-400"> / month</span>
              </p>
              <p className="text-xs text-slate-300">Perfect for solo owners and small dispatch operations.</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                <li>• Weekly fleet dashboard</li>
                <li>• Load management & rate-con PDFs</li>
                <li>• Driver pay & dispatch fee calculations</li>
              </ul>
              <button
                onClick={() => handleLandingCheckout('essential')}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-500 w-full"
              >
                Start Essential plan
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className={`space-y-2 rounded-2xl border border-blue-500 bg-slate-900 p-4 shadow-lg ${visibleSections.has('pricing') ? 'animate-fade-in-up delay-400' : 'opacity-0'}`}>
              <p className="text-xs font-semibold uppercase text-blue-300">Professional</p>
              <p className="text-2xl font-bold">
                $22.49<span className="text-xs text-slate-400"> / month</span>
              </p>
              <p className="text-xs text-slate-300">For dispatchers and fleets that want serious visibility.</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                <li>• Everything in Essential</li>
                <li>• AI analysis reports</li>
                <li>• Advanced reporting by dispatcher & driver</li>
              </ul>
              <button
                onClick={() => handleLandingCheckout('professional')}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-500 w-full"
              >
                Start Professional plan
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className={`space-y-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 ${visibleSections.has('pricing') ? 'animate-fade-in-up delay-500' : 'opacity-0'}`}>
              <p className="text-xs font-semibold uppercase text-emerald-300">Enterprise</p>
              <p className="text-2xl font-bold">Talk to us</p>
              <p className="text-xs text-slate-300">
                Custom setups for larger fleets and multi-company dispatch or brokerage teams.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                <li>• Multi-company support</li>
                <li>• Custom onboarding & training</li>
                <li>• Priority support</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section ref={ctaRef} data-section="cta" className={`flex flex-col gap-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-900/50 p-6 md:flex-row md:items-center md:justify-between md:gap-6 ${visibleSections.has('cta') ? 'animate-fade-in-up delay-300' : 'opacity-0'}`}>
          <div className="space-y-1 flex-1">
            <h2 className="text-lg font-semibold text-slate-50 md:text-xl">
              Stay updated with the latest LoadMaster features and fleet management tools.
            </h2>
            <form
              id="email-form"
              className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!email) return;
                // Placeholder: hook this into your email marketing tool or Supabase
                console.log('Email subscribed:', email);
                setEmail('');
                setEmailSubmitted(true);
                setTimeout(() => setEmailSubmitted(false), 4000);
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@fleetcompany.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-500 whitespace-nowrap"
              >
                Subscribe
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            {emailSubmitted && (
              <p className="text-xs text-emerald-400">
                Thanks! You&apos;re on the list. We&apos;ll email you LoadMaster updates.
              </p>
            )}
          </div>
          <div className="hidden md:flex items-center justify-center flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600/20 rounded-full blur-2xl" />
              <div className="relative bg-blue-600/10 rounded-2xl p-6 border border-blue-500/20">
                <TrendingUp className="h-12 w-12 text-blue-400" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-600 p-2">
                  <Truck className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-semibold tracking-tight text-slate-50">LoadMaster</span>
              </div>
              <p className="text-xs text-slate-400">
                Track your fleet, manage loads, and grow your trucking business.
              </p>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-50">Product</h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <button onClick={scrollToFeatures} className="hover:text-slate-200 transition-colors">
                    Features
                  </button>
                </li>
                <li>
                  <button onClick={scrollToPricing} className="hover:text-slate-200 transition-colors">
                    Pricing
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-50">Company</h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <a href="mailto:support@loadmaster.sh" className="hover:text-slate-200 transition-colors">
                    Support
                  </a>
                </li>
                <li>
                  <button onClick={onSignIn} className="hover:text-slate-200 transition-colors">
                    Sign In
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-50">Legal</h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <a href="#" className="hover:text-slate-200 transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-slate-200 transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-800 pt-6">
            <p className="text-center text-xs text-slate-500">
              © {new Date().getFullYear()} LoadMaster. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};


