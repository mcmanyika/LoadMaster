import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  Plus, 
  Search, 
  BrainCircuit, 
  DollarSign, 
  MapPin, 
  User, 
  FileText,
  LogOut,
  Users,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Megaphone,
  Calendar,
  Building2,
  FileBarChart,
  FileDown,
  Receipt,
  TrendingUp
} from 'lucide-react';
import { Load, DispatcherName, CalculatedLoad, UserProfile, Driver } from './types';
import { StatsCard } from './components/StatsCard';
import { LoadForm } from './components/LoadForm';
import { Auth } from './components/Auth';
import { DriverDashboard } from './components/DriverDashboard';
import { ConnectionModal } from './components/ConnectionModal';
import { FleetManagement } from './components/FleetManagement';
import { Pricing } from './components/Pricing';
import { PaymentConfirmation } from './components/PaymentConfirmation';
import { Subscriptions } from './components/Subscriptions';
import { Marketing } from './components/Marketing';
import { CompanySettings } from './components/CompanySettings';
import { ProfileSetup } from './components/ProfileSetup';
import { Reports } from './components/reports/Reports';
import { Expenses } from './components/Expenses';
import { ErrorModal } from './components/ErrorModal';
import { CompanySwitcher } from './components/CompanySwitcher';
import { DispatcherCompaniesList } from './components/DispatcherCompaniesList';
import { saveSubscription } from './services/subscriptionService';
import { analyzeFleetPerformance } from './services/geminiService';
import { getLoads, createLoad, updateLoad, getDrivers, getDispatchers } from './services/loadService';
import { getCurrentUser, signOut } from './services/authService';
import { getCompany, getDispatcherCompanies } from './services/companyService';
import { getExpenseSummary } from './services/expenseService';
import { getPendingInvitations, getActiveCompanies } from './services/dispatcherAssociationService';
import { Company } from './types';
import { exportAIAnalysisToPDF } from './services/reports/reportService';
import {
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Bar
} from 'recharts';

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loads, setLoads] = useState<Load[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dispatchers, setDispatchers] = useState<UserProfile[]>([]);
  const [companyName, setCompanyName] = useState<string>('');
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null);
  const [expenseSummary, setExpenseSummary] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadToEdit, setLoadToEdit] = useState<Load | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [sortBy, setSortBy] = useState<keyof CalculatedLoad>('dropDate');
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [view, setView] = useState<'dashboard' | 'loads' | 'fleet' | 'pricing' | 'subscriptions' | 'marketing' | 'company' | 'reports' | 'expenses'>('dashboard');
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancel' | null>(null);
  const [paymentPlan, setPaymentPlan] = useState<string | null>(null);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [paymentInterval, setPaymentInterval] = useState<'month' | 'year' | null>(null);
  
  // Multi-company dispatcher context
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [dispatcherCompanies, setDispatcherCompanies] = useState<Company[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);

  // Check URL parameters for payment status on mount and auto-save subscription
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentParam = urlParams.get('payment');
    const sessionId = urlParams.get('session_id') || urlParams.get('checkout_session_id');
    const paymentIntentId = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');
    let plan = urlParams.get('plan');
    let interval = urlParams.get('interval') as 'month' | 'year' | null;
    
    // If plan/interval not in URL, try to get from localStorage (stored before redirect)
    if (!plan || !interval) {
      const pendingPayment = localStorage.getItem('pending_payment');
      if (pendingPayment) {
        try {
          const paymentData = JSON.parse(pendingPayment);
          // Only use if stored recently (within last hour)
          if (Date.now() - paymentData.timestamp < 3600000) {
            plan = plan || paymentData.planId;
            interval = interval || paymentData.interval;
            console.log('📦 Retrieved plan/interval from localStorage:', { plan, interval });
          }
        } catch (e) {
          console.error('Error parsing pending payment data:', e);
        }
      }
    }
    
    // Debug: Log all URL parameters to see what Stripe is actually sending
    console.log('🔍 Payment redirect detected. URL params:', {
      payment: paymentParam,
      plan,
      interval,
      sessionId,
      paymentIntentId,
      paymentIntentClientSecret,
      allParams: Object.fromEntries(urlParams.entries()),
      fullURL: window.location.href,
    });
    
    // Handle Checkout Session success (Edge Function approach)
    if (paymentParam === 'success' && sessionId && user && plan && interval) {
      setPaymentStatus('success');
      setPaymentSessionId(sessionId); // Use Checkout Session ID
      setPaymentPlan(plan);
      setPaymentInterval(interval);
      
      // Auto-save subscription to Supabase
      const saveSubscriptionData = async () => {
        const PLAN_PRICES: Record<string, Record<'month' | 'year', number>> = {
          essential: { month: 99, year: 85 },
          professional: { month: 199, year: 170 },
          enterprise: { month: 499, year: 425 },
        };
        
        const amount = PLAN_PRICES[plan]?.[interval] || 0;
        
        console.log('🔄 Attempting to save subscription from Checkout Session:', { 
          userId: user.id, 
          plan, 
          interval, 
          amount,
          sessionId 
        });
        
        const result = await saveSubscription(user.id, {
          plan: plan as 'essential' | 'professional' | 'enterprise',
          interval,
          amount,
          stripeSessionId: sessionId, // Store Checkout Session ID
          status: 'active',
        });
        
        if (result.error) {
          console.error('❌ Failed to save subscription:', result.error);
          // Store in localStorage as backup so we can retry later
          localStorage.setItem('pending_subscription', JSON.stringify({
            userId: user.id,
            plan,
            interval,
            amount,
            stripeSessionId: sessionId,
            timestamp: Date.now(),
          }));
        } else {
          console.log('✅ Subscription saved successfully!', result.subscription);
          // Clear any pending subscription and payment data
          localStorage.removeItem('pending_subscription');
          localStorage.removeItem('pending_payment');
        }
      };
      
      saveSubscriptionData();
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentParam === 'success' && user && plan && interval) {
      // Handle Payment Link success (backwards compatibility)
      setPaymentStatus('success');
      setPaymentSessionId(sessionId);
      setPaymentPlan(plan);
      setPaymentInterval(interval);
      
      // Auto-save subscription to Supabase
      const saveSubscriptionData = async () => {
        const PLAN_PRICES: Record<string, Record<'month' | 'year', number>> = {
          essential: { month: 99, year: 85 },
          professional: { month: 199, year: 170 },
          enterprise: { month: 499, year: 425 },
        };
        
        const amount = PLAN_PRICES[plan]?.[interval] || 0;
        
        console.log('🔄 Attempting to save subscription:', { userId: user.id, plan, interval, amount });
        
        const result = await saveSubscription(user.id, {
          plan: plan as 'essential' | 'professional' | 'enterprise',
          interval,
          amount,
          stripeSessionId: sessionId || undefined,
          status: 'active',
        });
        
        if (result.error) {
          console.error('❌ Failed to save subscription:', result.error);
          // Store in localStorage as backup so we can retry later
          localStorage.setItem('pending_subscription', JSON.stringify({
            userId: user.id,
            plan,
            interval,
            amount,
            stripeSessionId: sessionId,
            timestamp: Date.now(),
          }));
        } else {
          console.log('✅ Subscription saved successfully!', result.subscription);
          // Clear any pending subscription and payment data
          localStorage.removeItem('pending_subscription');
          localStorage.removeItem('pending_payment');
        }
      };
      
      saveSubscriptionData();
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentParam === 'success') {
      console.log('⚠️ Payment success detected but missing plan/interval:', { plan, interval, user: !!user });
      setPaymentStatus('success');
      setPaymentSessionId(sessionId);
      setPaymentPlan(plan);
      setPaymentInterval(interval);
      
      // If user loads after payment, still try to save
      if (user && plan && interval) {
        const saveSubscriptionData = async () => {
          const PLAN_PRICES: Record<string, Record<'month' | 'year', number>> = {
            essential: { month: 99, year: 85 },
            professional: { month: 199, year: 170 },
            enterprise: { month: 499, year: 425 },
          };
          
          const amount = PLAN_PRICES[plan]?.[interval] || 0;
          
          console.log('🔄 Attempting to save subscription (delayed):', { userId: user.id, plan, interval, amount });
          
          const result = await saveSubscription(user.id, {
            plan: plan as 'essential' | 'professional' | 'enterprise',
            interval,
            amount,
            stripeSessionId: sessionId || undefined,
            status: 'active',
          });
          
          if (result.error) {
            console.error('❌ Failed to save subscription:', result.error);
          } else {
            console.log('✅ Subscription saved successfully!', result.subscription);
            localStorage.removeItem('pending_subscription');
            localStorage.removeItem('pending_payment');
          }
        };
        
        saveSubscriptionData();
      }
      
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (!paymentParam && user && plan && interval) {
      // Handle case where Stripe redirected but no payment parameter (from localStorage backup)
      // Check if we have pending payment data and try to save
      const pendingPayment = localStorage.getItem('pending_payment');
      if (pendingPayment) {
        try {
          const paymentData = JSON.parse(pendingPayment);
          // Only try to save if stored recently (within last hour)
          if (Date.now() - paymentData.timestamp < 3600000) {
            console.log('💾 Attempting to save subscription from localStorage backup (no URL params):', {
              userId: user.id,
              plan,
              interval,
            });
            
            // Create async function to handle the save
            const saveFromLocalStorage = async () => {
              const PLAN_PRICES: Record<string, Record<'month' | 'year', number>> = {
                essential: { month: 99, year: 85 },
                professional: { month: 199, year: 170 },
                enterprise: { month: 499, year: 425 },
              };
              
              const amount = PLAN_PRICES[plan]?.[interval] || 0;
              
              const result = await saveSubscription(user.id, {
                plan: plan as 'essential' | 'professional' | 'enterprise',
                interval,
                amount,
                stripeSessionId: sessionId || undefined,
                status: 'active',
              });
              
              if (result.error) {
                console.error('❌ Failed to save subscription from localStorage:', result.error);
                // Keep in localStorage for retry
              } else {
                console.log('✅ Subscription saved successfully from localStorage!', result.subscription);
                localStorage.removeItem('pending_subscription');
                localStorage.removeItem('pending_payment');
              }
            };
            
            saveFromLocalStorage();
          }
        } catch (e) {
          console.error('Error saving from localStorage backup:', e);
        }
      }
    } else if (paymentParam === 'cancelled') {
      setPaymentStatus('cancel');
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // Check Auth on Mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Load company context for dispatchers
  useEffect(() => {
    if (user && user.role === 'dispatcher') {
      // Load saved company from localStorage
      const savedCompanyId = localStorage.getItem('currentCompanyId');
      
      // Fetch dispatcher's companies and invitations
      const loadDispatcherContext = async () => {
        try {
          const [companies, invitations] = await Promise.all([
            getActiveCompanies(user.id),
            getPendingInvitations(user.id)
          ]);
          
          setDispatcherCompanies(companies);
          setPendingInvitations(invitations);
          
          // Set current company: use saved, or first active company, or null
          if (savedCompanyId && companies.find(c => c.id === savedCompanyId)) {
            setCurrentCompanyId(savedCompanyId);
          } else if (companies.length > 0) {
            setCurrentCompanyId(companies[0].id);
            localStorage.setItem('currentCompanyId', companies[0].id);
          } else {
            setCurrentCompanyId(null);
            localStorage.removeItem('currentCompanyId');
          }
        } catch (error) {
          console.error('Error loading dispatcher context:', error);
        }
      };
      
      loadDispatcherContext();
    } else {
      // Clear dispatcher context for non-dispatchers
      setCurrentCompanyId(null);
      setDispatcherCompanies([]);
      setPendingInvitations([]);
    }
  }, [user]);

  // Save currentCompanyId to localStorage when it changes
  useEffect(() => {
    if (currentCompanyId) {
      localStorage.setItem('currentCompanyId', currentCompanyId);
    } else {
      localStorage.removeItem('currentCompanyId');
    }
  }, [currentCompanyId]);

  // Fetch Data when User exists
  useEffect(() => {
    if (user && view !== 'fleet') {
      fetchData();
    }
  }, [user, view, currentCompanyId]);

  const checkAuth = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setAuthLoading(false);
  };

  const fetchData = async () => {
    setDataLoading(true);
    try {
      // For dispatchers, use currentCompanyId; for owners, getCompany() will handle it
      const companyData = await getCompany(currentCompanyId || undefined);
      
      // For dispatchers, filter loads by their name and selected company
      // For owners, show all loads for their company
      const dispatcherName = user?.role === 'dispatcher' ? user.name : undefined;
      const companyIdForLoads = companyData?.id;
      
      const [loadsData, driversData, dispatchersData] = await Promise.all([
        getLoads(companyIdForLoads, dispatcherName), // Filter by company and dispatcher if applicable
        getDrivers(),
        getDispatchers(companyData?.id) // Filter dispatchers by company
      ]);
      setLoads(loadsData);
      setDrivers(driversData);
      setDispatchers(dispatchersData);
      if (companyData) {
        setCompanyName(companyData.name);
        setCompany({ id: companyData.id, name: companyData.name });
        // Fetch expense summary for dashboard
        const summary = await getExpenseSummary(companyData.id);
        setExpenseSummary(summary);
      }
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Switch company for dispatchers
  const switchCompany = async (companyId: string) => {
    if (user?.role !== 'dispatcher') return;
    
    setCurrentCompanyId(companyId);
    // Refresh data for the new company
    await fetchData();
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setLoads([]);
    // Force a page reload to ensure clean state
    window.location.href = '/';
  };

  // Create driver mapping for quick lookup
  const driverMap = useMemo(() => {
    const map = new Map<string, string>();
    drivers.forEach(driver => {
      map.set(driver.id, driver.name);
    });
    return map;
  }, [drivers]);

  // Create dispatcher fee percentage mapping
  const dispatcherFeeMap = useMemo(() => {
    const map = new Map<string, number>();
    dispatchers.forEach(dispatcher => {
      map.set(dispatcher.name, dispatcher.feePercentage || 12); // Default to 12% if not set
    });
    return map;
  }, [dispatchers]);

  // Logic to process loads with calculated fields
  const processedLoads: CalculatedLoad[] = useMemo(() => {
    return loads.map(load => {
      const feePercentage = dispatcherFeeMap.get(load.dispatcher) || 12; // Default to 12% if dispatcher not found
      const dispatchFee = load.gross * (feePercentage / 100);
      const driverPay = (load.gross - dispatchFee - load.gasAmount) * 0.5;
      const netProfit = load.gross - driverPay - load.gasAmount;
      const driverName = load.driverId ? driverMap.get(load.driverId) : undefined;
      return {
        ...load,
        dispatchFee,
        driverPay,
        netProfit,
        driverName
      };
    }).sort((a, b) => new Date(b.dropDate).getTime() - new Date(a.dropDate).getTime());
  }, [loads, driverMap, dispatcherFeeMap]);

  // Filter loads based on search, driver, and date filters
  const filteredLoads = useMemo(() => {
    return processedLoads.filter(l => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
      l.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
      l.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.destination.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Driver filter
      const matchesDriver = selectedDriverId === '' || l.driverId === selectedDriverId;
      
      // Date filter
      const matchesDate = (() => {
        if (!dateFilter.startDate && !dateFilter.endDate) return true;
        const loadDate = new Date(l.dropDate);
        if (dateFilter.startDate) {
          const startDate = new Date(dateFilter.startDate);
          startDate.setHours(0, 0, 0, 0);
          if (loadDate < startDate) return false;
        }
        if (dateFilter.endDate) {
          const endDate = new Date(dateFilter.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (loadDate > endDate) return false;
        }
        return true;
      })();
      
      return matchesSearch && matchesDriver && matchesDate;
    });
  }, [processedLoads, searchQuery, selectedDriverId, dateFilter.startDate, dateFilter.endDate]);

  // Statistics Calculation - now based on filtered loads
  const stats = useMemo(() => {
    const totalGross = filteredLoads.reduce((sum, l) => sum + l.gross, 0);
    const totalMiles = filteredLoads.reduce((sum, l) => sum + l.miles, 0);
    const totalDriverPay = filteredLoads.reduce((sum, l) => sum + l.driverPay, 0);
    const avgRate = totalMiles > 0 ? totalGross / totalMiles : 0;
    
    return {
      gross: totalGross,
      miles: totalMiles,
      driverPay: totalDriverPay,
      rpm: avgRate
    };
  }, [filteredLoads]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const grouped: Record<string, { name: string, gross: number, loads: number }> = {};
    processedLoads.forEach(load => {
      if (!grouped[load.dispatcher]) {
        grouped[load.dispatcher] = { name: load.dispatcher, gross: 0, loads: 0 };
      }
      grouped[load.dispatcher].gross += load.gross;
      grouped[load.dispatcher].loads += 1;
    });
    return Object.values(grouped);
  }, [processedLoads]);

  const handleAddLoad = async (newLoadData: Omit<Load, 'id'>) => {
    try {
      const newLoad = await createLoad(newLoadData);
      setLoads(prev => [newLoad, ...prev]);
    } catch (error: any) {
      console.error("Failed to save load", error);
      setErrorModal({ isOpen: true, message: error?.message || "Failed to save load. Please check your connection." });
    }
  };

  const handleUpdateLoad = async (loadData: Omit<Load, 'id'>) => {
    if (!loadToEdit) return;
    try {
      const updatedLoad = await updateLoad(loadToEdit.id, loadData);
      setLoads(prev => prev.map(l => l.id === loadToEdit.id ? updatedLoad : l));
      setLoadToEdit(null);
    } catch (error: any) {
      console.error("Failed to update load", error);
      setErrorModal({ isOpen: true, message: error?.message || "Failed to update load. Please check your connection." });
    }
  };

  const handleEditLoad = (load: Load) => {
    setLoadToEdit(load);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setLoadToEdit(null);
  };

  const handleGenerateAIReport = async () => {
    setIsAnalyzing(true);
    const result = await analyzeFleetPerformance(loads);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };


  // Sorting logic
  const sortedLoads = useMemo(() => {
    const sorted = [...filteredLoads].sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];
      
      // Handle different data types
      if (sortBy === 'dropDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (typeof aValue === 'number') {
        // Numbers can be sorted directly
      } else {
        // Handle undefined/null values
        aValue = aValue ?? '';
        bValue = bValue ?? '';
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredLoads, sortBy, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(sortedLoads.length / itemsPerPage);
  const paginatedLoads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedLoads.slice(startIndex, endIndex);
  }, [sortedLoads, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDriverId, dateFilter.startDate, dateFilter.endDate, sortBy, sortDirection]);

  const handleSort = (column: keyof CalculatedLoad) => {
    if (sortBy === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending for dates/numbers, ascending for text
      const defaultDirection = ['dropDate', 'gross', 'dispatchFee', 'driverPay', 'miles'].includes(column as string) ? 'desc' : 'asc';
      setSortBy(column);
      setSortDirection(defaultDirection);
    }
  };

  const getSortIcon = (column: keyof CalculatedLoad) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-400 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  // --- RENDER STATES ---

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <Truck className="w-12 h-12 text-blue-500 animate-bounce" />
           <p className="text-slate-400 text-sm">Loading TMS...</p>
        </div>
      </div>
    );
  }

  // Check if user needs to create a profile
  const needsProfileSetup = user && (user as any)._profileMissing === true;

  if (needsProfileSetup) {
    return (
      <ProfileSetup
        userId={user.id}
        userEmail={user.email}
        onProfileCreated={async () => {
          // Refresh user data after profile is created
          const updatedUser = await getCurrentUser();
          setUser(updatedUser);
        }}
      />
    );
  }

  if (!user) {
    // Show payment confirmation even if not logged in (for public checkout)
    if (paymentStatus) {
      const planNames: Record<string, string> = {
        essential: 'Essential',
        professional: 'Professional',
      };
      return (
        <PaymentConfirmation
          status={paymentStatus}
          sessionId={paymentSessionId || undefined}
          planName={paymentPlan ? planNames[paymentPlan] || paymentPlan : undefined}
          onClose={() => {
            setPaymentStatus(null);
            setPaymentPlan(null);
            setPaymentSessionId(null);
          }}
        />
      );
    }
    return <Auth onLogin={setUser} />;
  }

  // Show payment confirmation if payment status is set
  if (paymentStatus) {
    const planNames: Record<string, string> = {
      essential: 'Essential',
      professional: 'Professional',
    };
    return (
      <PaymentConfirmation
        status={paymentStatus}
        sessionId={paymentSessionId || undefined}
        planName={paymentPlan ? planNames[paymentPlan] || paymentPlan : undefined}
        onClose={() => {
          setPaymentStatus(null);
          setPaymentPlan(null);
          setPaymentSessionId(null);
          setView('dashboard');
        }}
      />
    );
  }

  // --- DRIVER VIEW ---
  if (user.role === 'driver') {
    return <DriverDashboard user={user} loads={processedLoads} onSignOut={handleSignOut} />;
  }

  // --- ADMIN / DISPATCHER VIEW ---
  return (
    <div className="h-screen bg-slate-50 flex font-sans overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="group w-20 hover:w-64 bg-slate-900 text-slate-300 flex-shrink-0 hidden md:flex flex-col h-full overflow-y-auto transition-all duration-300 ease-in-out">
        <div className="p-4 group-hover:p-6 transition-all duration-300">
          <div className="flex items-center gap-3 text-white mb-8 justify-center group-hover:justify-start">
            <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0">
              <Truck size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">LoadMaster</span>
          </div>
          
          <nav className="space-y-2">
            <button 
              onClick={() => setView('dashboard')}
              className={`w-full flex items-center justify-center group-hover:justify-start gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'dashboard' ? 'bg-blue-600/10 text-blue-400 font-medium' : 'hover:bg-slate-800'}`}
              title="Dashboard"
            >
              <LayoutDashboard size={20} className="flex-shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">Dashboard</span>
            </button>
            <button 
              onClick={() => setView('loads')}
              className={`w-full flex items-center justify-center group-hover:justify-start gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'loads' ? 'bg-blue-600/10 text-blue-400 font-medium' : 'hover:bg-slate-800'}`}
              title="All Loads"
            >
              <FileText size={20} className="flex-shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">All Loads</span>
            </button>
            <button 
              onClick={() => setView('fleet')}
              className={`w-full flex items-center justify-center group-hover:justify-start gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'fleet' ? 'bg-blue-600/10 text-blue-400 font-medium' : 'hover:bg-slate-800'}`}
              title="Fleet & Drivers"
            >
              <Users size={20} className="flex-shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">Fleet & Drivers</span>
            </button>
            {user.role === 'owner' && (
              <button 
                onClick={() => setView('reports')}
                className={`w-full flex items-center justify-center group-hover:justify-start gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'reports' ? 'bg-blue-600/10 text-blue-400 font-medium' : 'hover:bg-slate-800'}`}
                title="Reports"
              >
                <FileBarChart size={20} className="flex-shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">Reports</span>
              </button>
            )}
            {user.role === 'owner' && (
              <button 
                onClick={() => setView('expenses')}
                className={`w-full flex items-center justify-center group-hover:justify-start gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'expenses' ? 'bg-blue-600/10 text-blue-400 font-medium' : 'hover:bg-slate-800'}`}
                title="Expenses"
              >
                <Receipt size={20} className="flex-shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">Expenses</span>
              </button>
            )}
            {user.email === 'partsonmanyika@gmail.com' && (
              <button 
                onClick={() => setView('marketing')}
                className={`w-full flex items-center justify-center group-hover:justify-start gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'marketing' ? 'bg-blue-600/10 text-blue-400 font-medium' : 'hover:bg-slate-800'}`}
                title="Marketing"
              >
                <Megaphone size={20} className="flex-shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">Marketing</span>
              </button>
            )}
            {user.role === 'owner' && (
              <button 
                onClick={() => setView('pricing')}
                className={`w-full flex items-center justify-center group-hover:justify-start gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'pricing' ? 'bg-blue-600/10 text-blue-400 font-medium' : 'hover:bg-slate-800'}`}
                title="Pricing"
              >
                <CreditCard size={20} className="flex-shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">Pricing</span>
              </button>
            )}
            {user.role === 'owner' && (
              <button 
                onClick={() => setView('subscriptions')}
                className={`w-full flex items-center justify-center group-hover:justify-start gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'subscriptions' ? 'bg-blue-600/10 text-blue-400 font-medium' : 'hover:bg-slate-800'}`}
                title="My Subscriptions"
              >
                <FileText size={20} className="flex-shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">My Subscriptions</span>
              </button>
            )}
            {user.role === 'owner' && (
              <button 
                onClick={() => setView('company')}
                className={`w-full flex items-center justify-center group-hover:justify-start gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'company' ? 'bg-blue-600/10 text-blue-400 font-medium' : 'hover:bg-slate-800'}`}
                title="Company Settings"
              >
                <Building2 size={20} className="flex-shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">Settings</span>
              </button>
            )}
          </nav>
        </div>
        
        <div className="mt-auto p-4 group-hover:p-6 border-t border-slate-800 transition-all duration-300 flex flex-col items-center group-hover:items-stretch">
           {/* User Profile Mini */}
           <div className="flex items-center gap-0 group-hover:gap-3 mb-6 w-full group-hover:justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 group-hover:mx-0">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 hidden group-hover:block transition-opacity duration-300 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </div>
              <button onClick={handleSignOut} className="text-slate-500 hover:text-white transition-colors flex-shrink-0 hidden group-hover:block" title="Sign Out">
                <LogOut size={16} />
              </button>
           </div>

          <div className="bg-slate-800/50 rounded-xl p-4 hidden group-hover:block transition-opacity duration-300">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Pro Tip</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Use the AI Analysis to identify your most profitable routes and dispatchers every week.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 flex-shrink-0 z-30">
          <div className="mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {view === 'dashboard' ? 'Fleet Overview' : view === 'fleet' ? 'Fleet Management' : view === 'pricing' ? 'Pricing Plans' : view === 'subscriptions' ? 'My Subscriptions' : view === 'marketing' ? 'Marketing Management' : view === 'reports' ? 'Reports' : view === 'expenses' ? 'Expenses' : view === 'company' ? 'Company Settings' : 'Load Management'}
                </h1>
                {companyName && user.role === 'dispatcher' && (
                  <p className="text-sm text-slate-500 mt-1">{companyName}</p>
                )}
              </div>
              {user.role === 'dispatcher' && dispatcherCompanies.length > 1 && (
                <CompanySwitcher
                  companies={dispatcherCompanies}
                  currentCompanyId={currentCompanyId}
                  pendingInvitationsCount={pendingInvitations.length}
                  onSwitchCompany={switchCompany}
                />
              )}
            </div>
            <div className="flex items-center gap-4">
              {dataLoading && <span className="text-sm text-slate-400 animate-pulse">Syncing...</span>}
               {view !== 'fleet' && view !== 'pricing' && view !== 'subscriptions' && view !== 'marketing' && view !== 'company' && view !== 'expenses' && (
                 <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all hover:shadow-md"
                >
                  <Plus size={18} />
                  Add Load
                </button>
               )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {view === 'pricing' ? (
            <Pricing />
          ) : view === 'subscriptions' ? (
            <Subscriptions userId={user.id} />
          ) : view === 'marketing' ? (
            <div className="max-w-7xl mx-auto px-6 py-8">
              <Marketing user={user} />
            </div>
          ) : view === 'reports' ? (
            <div className="mx-auto px-4 py-8">
              <Reports user={user} companyId={currentCompanyId || company?.id} />
            </div>
          ) : view === 'expenses' ? (
            company ? (
              <div className="mx-auto px-4 py-8">
                <Expenses user={user} companyId={company.id} />
              </div>
            ) : (
              <div className="mx-auto px-4 py-8">
                <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                  <p className="text-slate-500">Please set up your company first in Company Settings.</p>
                </div>
              </div>
            )
          ) : view === 'company' ? (
            <CompanySettings 
              user={user} 
              onCompanyCreated={async () => {
                // Refresh user data to get updated companyId
                const updatedUser = await getCurrentUser();
                if (updatedUser) {
                  setUser(updatedUser);
                }
                // Refresh company data
                const companyData = await getCompany();
                if (companyData) {
                  setCompanyName(companyData.name);
                  setCompany({ id: companyData.id, name: companyData.name });
                }
              }}
            />
          ) : (
        <div className="mx-auto px-4 py-8 space-y-8">
          
          {/* Fleet Management View */}
          {view === 'fleet' ? (
             <FleetManagement user={user} />
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard 
                  title="Total Gross Revenue" 
                  value={`$${stats.gross.toLocaleString()}`} 
                  subValue={dateFilter.startDate || dateFilter.endDate 
                    ? (() => {
                        const start = dateFilter.startDate ? new Date(dateFilter.startDate).toLocaleDateString() : 'Start';
                        const end = dateFilter.endDate ? new Date(dateFilter.endDate).toLocaleDateString() : 'End';
                        return `${start} to ${end}`;
                      })()
                    : "All time"}
                  trend="up"
                  icon={<DollarSign className="w-6 h-6 text-slate-900" />}
                  colorClass="bg-slate-100"
                />
                 <StatsCard 
                  title="Avg Rate Per Mile" 
                  value={`$${stats.rpm.toFixed(2)}`} 
                  subValue="Target: $2.00+"
                  trend={stats.rpm > 2 ? "up" : "neutral"}
                  icon={<MapPin className="w-6 h-6 text-slate-900" />}
                  colorClass="bg-slate-100"
                />
                 <StatsCard 
                  title="Total Miles" 
                  value={stats.miles.toLocaleString()} 
                  icon={<Truck className="w-6 h-6 text-slate-900" />}
                  colorClass="bg-slate-100"
                />
                <StatsCard 
                  title="Driver Pay Output" 
                  value={`$${stats.driverPay.toLocaleString()}`} 
                  icon={<User className="w-6 h-6 text-slate-900" />}
                  colorClass="bg-slate-100"
                />
              </div>

              {/* Dashboard View Specifics */}
              {view === 'dashboard' && (
                <>
                  {/* Dispatcher Companies List - Show at top for dispatchers */}
                  {user.role === 'dispatcher' && (
                    <DispatcherCompaniesList
                      user={user}
                      currentCompanyId={currentCompanyId}
                      onSwitchCompany={switchCompany}
                    />
                  )}
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Chart Section */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue by Dispatcher</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#64748b', fontSize: 12}} 
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#64748b', fontSize: 12}} 
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip 
                            cursor={{fill: '#f1f5f9'}}
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                          />
                          <Bar dataKey="gross" radius={[6, 6, 0, 0]}>
                            {chartData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* AI Insights Section */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="text-slate-600" size={24} />
                        <h3 className="text-lg font-bold text-slate-800">AI Analyst</h3>
                      </div>
                      {!aiAnalysis && (
                        <button 
                          onClick={handleGenerateAIReport}
                          disabled={isAnalyzing}
                          className="text-sm text-slate-600 font-medium hover:text-slate-800 disabled:opacity-50"
                        >
                          {isAnalyzing ? 'Thinking...' : 'Generate Report'}
                        </button>
                      )}
                    </div>
                    
                    <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100 overflow-y-auto max-h-[300px]">
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                          <div className="w-6 h-6 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm">Analyzing market data...</span>
                        </div>
                      ) : aiAnalysis ? (
                        <div className="prose prose-sm prose-slate">
                          <div className="whitespace-pre-wrap text-slate-600 text-sm leading-relaxed font-medium">
                            {aiAnalysis}
                          </div>
                          <div className="mt-4 flex items-center gap-3">
                            <button
                              onClick={() => {
                                const result = exportAIAnalysisToPDF(aiAnalysis, `ai-analysis-${new Date().toISOString().split('T')[0]}`);
                                if (!result.success && result.error) {
                                  setErrorModal({ isOpen: true, message: result.error });
                                }
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <FileDown size={16} />
                              Export PDF
                            </button>
                            <button 
                              onClick={() => setAiAnalysis(null)} 
                              className="text-xs text-slate-400 underline hover:text-slate-600"
                            >
                              Clear Report
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <p className="text-slate-400 text-sm mb-2">No active analysis</p>
                          <p className="text-slate-400 text-xs px-4">Click "Generate Report" to have AI analyze your dispatchers and RPM trends.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                </>
              )}

              {/* Recent Loads / All Loads Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-lg font-bold text-slate-800">Recent Loads</h3>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Search company, city..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
                    />
                    </div>
                    <div className="relative flex-1 sm:flex-initial">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                      <select
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-48 bg-white appearance-none cursor-pointer"
                      >
                        <option value="">All Drivers</option>
                        {drivers.map(driver => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name}
                          </option>
                        ))}
                      </select>
                      {selectedDriverId && (
                        <button
                          onClick={() => setSelectedDriverId('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                          title="Clear filter"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                      <Calendar className="text-slate-400 w-4 h-4" />
                      <input
                        type="date"
                        value={dateFilter.startDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                        placeholder="From"
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-40"
                        title="Filter from date"
                      />
                      <span className="text-slate-400 text-sm">to</span>
                      <input
                        type="date"
                        value={dateFilter.endDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                        placeholder="To"
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-40"
                        title="Filter to date"
                      />
                      {(dateFilter.startDate || dateFilter.endDate) && (
                        <button
                          onClick={() => setDateFilter({ startDate: '', endDate: '' })}
                          className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Clear date filter"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="relative overflow-auto max-h-[600px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20 shadow-md">
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <th 
                          className="bg-slate-50 p-4 font-semibold border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                          onClick={() => handleSort('company')}
                        >
                          <div className="flex items-center">
                            Company
                            {getSortIcon('company')}
                          </div>
                        </th>
                        <th className="bg-slate-50 p-4 font-semibold border-b border-slate-200">Route</th>
                        <th 
                          className="bg-slate-50 p-4 font-semibold border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                          onClick={() => handleSort('dropDate')}
                        >
                          <div className="flex items-center">
                            Date
                            {getSortIcon('dropDate')}
                          </div>
                        </th>
                        <th 
                          className="bg-slate-50 p-4 font-semibold border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                          onClick={() => handleSort('dispatcher')}
                        >
                          <div className="flex items-center">
                            Dispatcher
                            {getSortIcon('dispatcher')}
                          </div>
                        </th>
                        <th 
                          className="bg-slate-50 p-4 font-semibold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                          onClick={() => handleSort('gross')}
                        >
                          <div className="flex items-center justify-end">
                            Gross
                            {getSortIcon('gross')}
                          </div>
                        </th>
                        <th 
                          className="bg-slate-50 p-4 font-semibold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                          onClick={() => handleSort('dispatchFee')}
                        >
                          <div className="flex items-center justify-end">
                            Dispatch Fee
                            {getSortIcon('dispatchFee')}
                          </div>
                        </th>
                        <th 
                          className="bg-slate-50 p-4 font-semibold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                          onClick={() => handleSort('driverPay')}
                        >
                          <div className="flex items-center justify-end">
                            Driver Pay
                            {getSortIcon('driverPay')}
                          </div>
                        </th>
                        <th 
                          className="bg-slate-50 p-4 font-semibold border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center">
                            Status
                            {getSortIcon('status')}
                          </div>
                        </th>
                        {user.role === 'owner' && (
                          <th 
                            className="bg-slate-50 p-4 font-semibold border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                            onClick={() => handleSort('driverPayoutStatus')}
                          >
                            <div className="flex items-center">
                              Payout Status
                              {getSortIcon('driverPayoutStatus')}
                            </div>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dataLoading && sortedLoads.length === 0 ? (
                         <tr>
                            <td colSpan={user.role === 'owner' ? 9 : 8} className="p-12 text-center text-slate-400">
                               <div className="flex justify-center items-center gap-2">
                                 <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                 <span>Loading fleet data...</span>
                               </div>
                            </td>
                         </tr>
                      ) : sortedLoads.length === 0 ? (
                         <tr>
                            <td colSpan={user.role === 'owner' ? 9 : 8} className="p-8 text-center text-slate-400">
                               No loads found. Add a new load to get started.
                            </td>
                         </tr>
                      ) : (
                        paginatedLoads.map((load) => (
                          <tr 
                            key={load.id} 
                            onClick={() => handleEditLoad(load)}
                            className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                          >
                            <td className="p-4">
                              <div className="font-medium text-slate-900">{load.company}</div>
                              <div className="text-xs text-slate-400">ID: #{load.id.toString().slice(0, 8)}</div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 w-fit">{load.origin}</span>
                                <span className="text-xs text-slate-400 ml-1">↓</span>
                                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 w-fit">{load.destination}</span>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-slate-600 whitespace-nowrap">{load.dropDate}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                  {load.dispatcher.charAt(0)}
                                </div>
                                <span className="text-sm text-slate-700">{load.dispatcher}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-medium text-slate-900">${load.gross.toLocaleString()}</td>
                            <td className="p-4 text-right text-sm text-rose-600">-${load.dispatchFee.toFixed(1)}</td>
                            <td className="p-4 text-right">
                              <div className="font-bold text-emerald-600">${load.driverPay.toFixed(1)}</div>
                              <div className="text-xs text-slate-400">Gas: ${load.gasAmount}</div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                load.status === 'Factored' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {load.status}
                              </span>
                            </td>
                            {user.role === 'owner' && (
                              <td className="p-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  load.driverPayoutStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                  load.driverPayoutStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-slate-100 text-slate-800'
                                }`}>
                                  {load.driverPayoutStatus === 'paid' ? 'Paid' :
                                   load.driverPayoutStatus === 'partial' ? 'Partial' :
                                   'Pending'}
                                </span>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {sortedLoads.length > 0 && totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, sortedLoads.length)}
                      </span>{' '}
                      of <span className="font-medium">{sortedLoads.length}</span> loads
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Previous page"
                      >
                        <ChevronLeft size={16} className="text-slate-600" />
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Next page"
                      >
                        <ChevronRight size={16} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          </div>
          )}
        </div>
      </main>

      {(isModalOpen || loadToEdit) && (
        <LoadForm 
          onClose={handleCloseModal} 
          onSave={loadToEdit ? handleUpdateLoad : handleAddLoad} 
          currentUser={user}
          loadToEdit={loadToEdit || undefined}
          companyId={currentCompanyId || company?.id}
        />
      )}
      {isSettingsOpen && <ConnectionModal onClose={() => setIsSettingsOpen(false)} />}
      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />
    </div>
  );
}

export default App;