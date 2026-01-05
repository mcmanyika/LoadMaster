import React, { useState, useEffect } from 'react';
import {
  Truck,
  ArrowRight,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Check,
  Mail,
  Phone,
  MapPin,
  Menu,
  X,
  BarChart3,
  DollarSign,
  FileText,
  BrainCircuit,
  Target,
  Rocket,
  Award,
  MessageSquare,
  Star
} from 'lucide-react';
import { submitContactForm } from '../services/contactService';
import { getSubscriptionPlans } from '../services/pricingService';
import { Chatbot } from './Chatbot';

interface LandingPage2Props {
  onGetStarted: () => void;
  onSignIn: () => void;
  onSelectPlan?: (planId: 'essential' | 'professional', interval: 'month' | 'year') => void;
  onPrivacyClick?: () => void;
  onTermsClick?: () => void;
}

export const LandingPage2: React.FC<LandingPage2Props> = ({ 
  onGetStarted, 
  onSignIn, 
  onSelectPlan,
  onPrivacyClick,
  onTermsClick 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
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
  const [pricingPlans, setPricingPlans] = useState<{
    essential: { monthly: number; annual: number };
    professional: { monthly: number; annual: number };
  }>({
    essential: { monthly: 24.98, annual: 249.80 },
    professional: { monthly: 44.98, annual: 449.80 },
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Add smooth scroll behavior to html element
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  useEffect(() => {
    const loadPrices = async () => {
      try {
        const plans = await getSubscriptionPlans();
        const essential = plans.find(p => p.planId === 'essential');
        const professional = plans.find(p => p.planId === 'professional');
        
        if (essential && professional) {
          setPricingPlans({
            essential: { 
              monthly: essential.monthlyPrice,
              annual: essential.annualTotal || essential.monthlyPrice * 10
            },
            professional: { 
              monthly: professional.monthlyPrice,
              annual: professional.annualTotal || professional.monthlyPrice * 10
            },
          });
        }
      } catch (error) {
        console.error('Error loading prices:', error);
      }
    };
    loadPrices();
  }, []);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setNewsletterSubmitted(true);
      setTimeout(() => setNewsletterSubmitted(false), 3000);
      setNewsletterEmail('');
    }
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

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      const offset = 80; // Account for fixed header height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    // Close mobile menu if open
    setMobileMenuOpen(false);
  };

  const handleLogoClick = () => {
    const element = document.getElementById('home');
    if (element) {
      const offset = 80; // Account for fixed header height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    // Close mobile menu if open
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="p-2 bg-blue-600 rounded-lg">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-slate-900">LoadMaster</span>
            </button>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#home" onClick={(e) => handleNavClick(e, 'home')} className="text-slate-700 hover:text-blue-600 transition-colors">Home</a>
              <a href="#about" onClick={(e) => handleNavClick(e, 'about')} className="text-slate-700 hover:text-blue-600 transition-colors">About Us</a>
              <a href="#services" onClick={(e) => handleNavClick(e, 'services')} className="text-slate-700 hover:text-blue-600 transition-colors">Services</a>
              <a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')} className="text-slate-700 hover:text-blue-600 transition-colors">Pricing</a>
              <a href="#contact" onClick={(e) => handleNavClick(e, 'contact')} className="text-slate-700 hover:text-blue-600 transition-colors">Contact</a>
              <button
                onClick={onSignIn}
                className="px-4 py-2 text-slate-700 hover:text-blue-600 transition-colors"
              >
                Log In
              </button>
              <button
                onClick={onGetStarted}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign Up
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <a href="#home" onClick={(e) => handleNavClick(e, 'home')} className="block py-2 text-slate-700">Home</a>
              <a href="#about" onClick={(e) => handleNavClick(e, 'about')} className="block py-2 text-slate-700">About Us</a>
              <a href="#services" onClick={(e) => handleNavClick(e, 'services')} className="block py-2 text-slate-700">Services</a>
              <a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')} className="block py-2 text-slate-700">Pricing</a>
              <a href="#contact" onClick={(e) => handleNavClick(e, 'contact')} className="block py-2 text-slate-700">Contact</a>
              <button onClick={onSignIn} className="block w-full text-left py-2 text-slate-700">
                Log In
              </button>
              <button
                onClick={onGetStarted}
                className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Text Content - Top Center */}
          <div className="text-center mb-16">
            <h1 
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 animate-fade-in-up"
              style={{
                animation: 'fadeInUp 1s ease-out 0.2s both',
              }}
            >
              Manage loads the <span className="text-blue-600">modern way</span>
            </h1>
            <p 
              className="text-xl md:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto animate-fade-in-up"
              style={{
                animation: 'fadeInUp 1s ease-out 0.4s both',
              }}
            >
              We are <strong>LoadMaster</strong>, a Creative Trucking Management Platform
            </p>
            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up"
              style={{
                animation: 'fadeInUp 1s ease-out 0.6s both',
              }}
            >
              <button
                onClick={onGetStarted}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 font-semibold text-lg flex items-center justify-center gap-2 hover:scale-105 hover:shadow-lg transform"
              >
                Get Started <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onSignIn}
                className="px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-300 font-semibold text-lg hover:scale-105 hover:shadow-lg transform"
              >
                Sign In
              </button>
            </div>
          </div>
          
          {/* Hero Image - Bottom Center */}
          <div className="relative flex justify-center">
            <div 
              className="relative z-10 max-w-5xl animate-float-in"
              style={{
                animation: 'floatIn 1.2s ease-out 0.8s both, floatUpDown 3s ease-in-out infinite 2s',
              }}
            >
              <img
                src="/images/hero-2.png"
                alt="LoadMaster Dashboard"
                className="w-full h-auto rounded-2xl shadow-2xl hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
            {/* Decorative background blob - animated */}
            <div 
              className="absolute -bottom-8 -left-8 w-96 h-96 bg-yellow-200 rounded-full opacity-30 blur-3xl -z-10 animate-pulse-slow"
              style={{
                animation: 'pulseSlow 4s ease-in-out infinite',
              }}
            ></div>
            <div 
              className="absolute -bottom-4 -right-4 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl -z-10 animate-pulse-slow"
              style={{
                animation: 'pulseSlow 4s ease-in-out infinite 1s',
              }}
            ></div>
          </div>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes fadeInDown {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

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

          @keyframes floatIn {
            from {
              opacity: 0;
              transform: translateY(50px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes pulseSlow {
            0%, 100% {
              opacity: 0.3;
              transform: scale(1);
            }
            50% {
              opacity: 0.5;
              transform: scale(1.1);
            }
          }

          @keyframes floatUpDown {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-20px);
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
        `}</style>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">$0</div>
              <div className="text-slate-600">Setup Fee</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">14 Days</div>
              <div className="text-slate-600">Free Trial</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-slate-600">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us / Key Features */}
      <section id="services" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Why choose us</h2>
            <h3 className="text-2xl text-slate-600">Key Features</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div 
              className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow"
              style={{
                animation: 'fadeInUp 0.8s ease-out 0.2s both',
              }}
            >
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Expand Your Reach</h4>
              <p className="text-slate-600">
                Connect with more dispatchers and drivers. Grow your fleet management capabilities with our comprehensive platform.
              </p>
            </div>
            <div 
              className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow"
              style={{
                animation: 'fadeInUp 0.8s ease-out 0.4s both',
              }}
            >
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Annualized Growth</h4>
              <p className="text-slate-600">
                Track your business growth with detailed analytics and reporting. Make data-driven decisions for your trucking operations.
              </p>
            </div>
            <div 
              className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow"
              style={{
                animation: 'fadeInUp 0.8s ease-out 0.6s both',
              }}
            >
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Book Your Providers</h4>
              <p className="text-slate-600">
                Manage dispatchers and drivers efficiently. Streamline your load tracking process and optimize your fleet operations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              What our customers say
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Don't just take our word for it. See what trucking companies are saying about LoadMaster.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Michael Rodriguez',
                company: 'Rodriguez Transport',
                role: 'Fleet Manager',
                rating: 5,
                feedback: 'LoadMaster has completely transformed how we manage our fleet. The real-time tracking and dispatcher coordination features have saved us countless hours. Our efficiency has increased by 40% since switching to LoadMaster.',
              },
              {
                name: 'Sarah Chen',
                company: 'Chen Logistics',
                role: 'Operations Director',
                rating: 5,
                feedback: 'The analytics and reporting tools are incredible. We can now make data-driven decisions that have directly improved our bottom line. The 24/7 support team is also fantastic - they\'re always there when we need help.',
              },
              {
                name: 'James Thompson',
                company: 'Thompson Freight',
                role: 'Owner',
                rating: 5,
                feedback: 'As a small fleet owner, I was worried about the complexity, but LoadMaster is so intuitive. We were up and running in days, not weeks. The cost savings from better route optimization alone paid for the subscription in the first month.',
              },
            ].map((testimonial, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow"
                style={{
                  animation: `fadeInUp 0.8s ease-out ${0.2 + index * 0.1}s both`,
                }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 italic">
                  "{testimonial.feedback}"
                </p>
                <div className="border-t border-slate-200 pt-4">
                  <p className="font-semibold text-slate-900">{testimonial.name}</p>
                  <p className="text-sm text-slate-600">{testimonial.role}</p>
                  <p className="text-sm text-blue-600 font-medium">{testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Start saving time today and choose your best plan
            </h2>
            <p className="text-lg text-slate-600">
              Best for trucking companies who need to save their time
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Startup',
                price: pricingPlans.essential.monthly,
                description: 'Best for small fleets getting started',
                features: ['3 Users', 'Basic Load Tracking', 'Unlimited Loads', '10 GB Storage'],
              },
              {
                name: 'Agency',
                price: pricingPlans.professional.monthly,
                description: 'Best for growing trucking companies',
                features: ['6 Users', 'Advanced Analytics', 'Unlimited Loads', '35 GB Storage'],
                popular: true,
              },
              {
                name: 'Enterprise',
                price: pricingPlans.professional.monthly * 1.5,
                description: 'Best for large operations',
                features: ['12 Users', 'AI Analytics', 'Unlimited Loads', '50 GB Storage'],
              },
            ].map((plan, index) => (
              <div
                key={index}
                className={`bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow ${
                  plan.popular ? 'border-2 border-blue-600 relative' : 'border border-slate-200'
                }`}
                style={{
                  animation: `fadeInUp 0.8s ease-out ${0.2 + index * 0.2}s both`,
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-slate-900">${plan.price.toFixed(2)}</span>
                  <span className="text-slate-600">/month</span>
                </div>
                <p className="text-slate-600 mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    const planId = index === 0 ? 'essential' : 'professional';
                    onSelectPlan?.(planId, 'month');
                    onGetStarted();
                  }}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {plan.popular ? 'Purchase' : 'Start Free Trial'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Subscribe to Our Newsletter
          </h2>
          <p className="text-blue-100 mb-8">All your information is completely confidential</p>
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-white"
              required
            />
            <button
              type="submit"
              className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-slate-100 font-semibold transition-colors"
            >
              {newsletterSubmitted ? 'Subscribed!' : 'Sign Up'}
            </button>
          </form>
        </div>
      </section>

      {/* Get in Touch / Contact Form Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Get in touch
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Have questions? Want to learn more? <span className="text-slate-900 font-medium">We're here to help.</span>
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-10 shadow-lg">
            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="john@company.com"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    value={contactForm.company}
                    onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Your Company"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Message *
                </label>
                <textarea
                  required
                  rows={5}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                  placeholder="Tell us about your fleet or ask any questions..."
                />
              </div>
              <button
                type="submit"
                disabled={contactSubmitting}
                className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {contactSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-5 w-5" />
                    Send Message
                  </>
                )}
              </button>
              {contactSubmitted && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-700">
                  <Mail className="h-5 w-5" />
                  <span>Thanks for reaching out! We'll get back to you soon.</span>
                </div>
              )}
              {contactError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700">
                  <Mail className="h-5 w-5" />
                  <span>{contactError}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold">LoadMaster</span>
              </div>
              <p className="text-slate-400 mb-4">
                Helping you <strong>maximize</strong> operations management with digitization
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Office</h4>
              <p className="text-slate-400">8542 Spring Valley, Dallas, TX</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contacts</h4>
              <p className="text-slate-400 flex items-center gap-2">
                <Phone size={16} /> +1 469 473 8724
              </p>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400 text-sm">
              © 2024. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              {onPrivacyClick && (
                <button onClick={onPrivacyClick} className="text-slate-400 hover:text-white text-sm">
                  Privacy Policy
                </button>
              )}
              {onTermsClick && (
                <button onClick={onTermsClick} className="text-slate-400 hover:text-white text-sm">
                  Terms of Service
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* Chatbot */}
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

