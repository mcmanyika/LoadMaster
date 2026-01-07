import React, { useState, useEffect } from 'react';
import { Truck, Lock, Mail, User, AlertCircle } from 'lucide-react';
import { signIn, signUp } from '../services/authService';
import { UserRole, UserProfile } from '../types';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { RegistrationSuccess } from './RegistrationSuccess';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
  initialMode?: 'login' | 'signup';
  onBack?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, initialMode = 'login', onBack }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<{ user: UserProfile; name: string; role: string } | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('owner');
  const [referralCode, setReferralCode] = useState<string>('');

  // Extract referral code from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      // Normalize to uppercase to match database format
      setReferralCode(ref.toUpperCase().trim());
      console.log('Referral code extracted from URL:', ref.toUpperCase().trim());
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) {
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { user, error } = await signIn(email, password);
        if (error) throw new Error(error);
        if (user) onLogin(user);
      } else {
        const { user, error } = await signUp(email, password, name, role, referralCode || undefined);
        if (error) throw new Error(error);
        if (user) {
          // Show success page instead of immediately logging in
          setRegistrationSuccess({ user, name, role });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToDashboard = () => {
    if (registrationSuccess) {
      onLogin(registrationSuccess.user);
    }
  };

  // Show registration success page
  if (registrationSuccess) {
    return (
      <RegistrationSuccess
        userName={registrationSuccess.name}
        userRole={registrationSuccess.role}
        onContinue={handleContinueToDashboard}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200">
          
          {/* Header */}
          <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 z-0"></div>
            <div className="relative z-10">
              <button
                onClick={onBack}
                className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all cursor-pointer mx-auto"
              >
                <Truck className="w-8 h-8 text-white" />
              </button>
              <h1 className="text-2xl font-bold text-white mb-2">LoadMaster TMS</h1>
              <p className="text-blue-100 text-sm">
                {isLogin ? 'Sign in to manage your fleet' : 'Create an account to get started'}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            
            {!isSupabaseConfigured && (
               <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-700 text-xs">
                 <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                 <span>Running in <strong>Demo Mode</strong>. Data will not be saved permanently. Click the gear icon (top right) to connect your database.</span>
               </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-slate-400"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-slate-400"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-slate-400"
                    placeholder="••••••••"
                  />
                </div>
                {isLogin && !isSupabaseConfigured && (
                   <p className="text-xs text-slate-500 mt-1">Demo password: <span className="font-mono bg-slate-100 px-1 rounded text-slate-700">password</span></p>
                )}
              </div>

              {!isLogin && referralCode && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    You were referred by someone! Referral code: <strong>{referralCode}</strong>
                  </p>
                </div>
              )}

              {!isLogin && (
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(['owner', 'dispatch_company', 'dispatcher', 'driver'] as UserRole[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`px-2 py-2 text-sm font-medium rounded-lg capitalize border ${
                            role === r 
                              ? 'bg-blue-600 text-white border-blue-600' 
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {r.replace('_', ' ')}
                        </button>
                      ))}
                   </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
            
            {!isSupabaseConfigured && (
              <div className="mt-6 pt-6 border-t border-slate-200 text-center">
                <p className="text-xs text-slate-600 mb-2">Quick Demo Login</p>
                <div className="flex gap-2 justify-center">
                   <button onClick={() => { setEmail('owner@demo.com'); setPassword('password'); }} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-700">Owner</button>
                   <button onClick={() => { setEmail('driver@demo.com'); setPassword('password'); }} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-700">Driver</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
  );
};