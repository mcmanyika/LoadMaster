import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getAffiliateStats, getReferrals, saveReferralCode, getReferrerInfo } from '../services/affiliateService';
import { AffiliateStats, Referral } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Copy, Users, CheckCircle, Clock, DollarSign, Share2, Check, UserPlus, Save, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface AffiliateDashboardProps {
  user: UserProfile;
}

export const AffiliateDashboard: React.FC<AffiliateDashboardProps> = ({ user }) => {
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'rewarded'>('all');
  const [referrerInfo, setReferrerInfo] = useState<{ id: string; name: string; code: string } | null>(null);
  const [hasReferrer, setHasReferrer] = useState<boolean>(false);
  const [manualReferralCode, setManualReferralCode] = useState('');
  const [savingReferral, setSavingReferral] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralSuccess, setReferralSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, referralsData, referrerData] = await Promise.all([
        getAffiliateStats(user.id),
        getReferrals(user.id),
        getReferrerInfo(user.id)
      ]);
      setStats(statsData);
      setReferrals(referralsData);
      setReferrerInfo(referrerData);
      // Also check if user has a referred_by value directly
      if (!referrerData) {
        // Check directly if user has referred_by set
        if (isSupabaseConfigured && supabase) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('referred_by')
            .eq('id', user.id)
            .single();
          setHasReferrer(!!profile?.referred_by);
        }
      } else {
        setHasReferrer(true);
      }
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReferralCode = async () => {
    if (!manualReferralCode.trim()) {
      setReferralError('Please enter a referral code');
      return;
    }

    setSavingReferral(true);
    setReferralError(null);
    setReferralSuccess(false);

    try {
      const result = await saveReferralCode(user.id, manualReferralCode.toUpperCase().trim());
      
      if (result.success) {
        setReferralSuccess(true);
        setManualReferralCode('');
        // Refresh data to show updated referrer info
        await fetchData();
        setTimeout(() => setReferralSuccess(false), 3000);
      } else {
        setReferralError(result.error || 'Failed to save referral code');
      }
    } catch (error: any) {
      setReferralError(error.message || 'An error occurred while saving the referral code');
    } finally {
      setSavingReferral(false);
    }
  };

  const copyReferralCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyReferralLink = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const filteredReferrals = referrals.filter(ref => {
    if (statusFilter === 'all') return true;
    return ref.status === statusFilter;
  });

  // Pagination
  const totalPages = Math.ceil(filteredReferrals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReferrals = filteredReferrals.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading affiliate data...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-slate-600 dark:text-slate-400">Error loading affiliate data. Please try again later.</p>
      </div>
    );
  }

  // Debug log
  console.log('AffiliateDashboard render - referrerInfo:', referrerInfo);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          Affiliate Program
        </h2>
        
        {/* Referrer Information - Only show if user has a referrer */}
        {referrerInfo && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-5 h-5 text-green-600 dark:text-green-400" />
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                You were referred by
              </label>
            </div>
            {referrerInfo.code && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Referral code: <span className="font-mono font-medium">{referrerInfo.code}</span>
              </p>
            )}
          </div>
        )}

        {/* Manual Referral Code Entry - Only show if user does NOT have a referrer */}
        {!referrerInfo && !hasReferrer && (
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Enter Referral Code
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              If someone referred you, enter their referral code here to link your accounts.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualReferralCode}
                onChange={(e) => {
                  setManualReferralCode(e.target.value.toUpperCase().trim());
                  setReferralError(null);
                  setReferralSuccess(false);
                }}
                placeholder="Enter referral code (e.g., ABC1234)"
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                maxLength={7}
              />
              <button
                onClick={handleSaveReferralCode}
                disabled={savingReferral || !manualReferralCode.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {savingReferral ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
            {referralError && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{referralError}</p>
              </div>
            )}
            {referralSuccess && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2">
                <Check size={16} className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Referral code saved successfully! You are now linked to your referrer.
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Referral Code Display */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Your Referral Code
              </label>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                {stats.referralCode}
              </p>
            </div>
            <button
              onClick={copyReferralCode}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              {copiedCode ? <Check size={18} /> : <Copy size={18} />}
              {copiedCode ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* Referral Link */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Your Referral Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={stats.referralLink}
              readOnly
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm"
            />
            <button
              onClick={copyReferralLink}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {copiedLink ? <Check size={20} /> : <Copy size={20} />}
              {copiedLink ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Share this link to earn commissions when people sign up and subscribe!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Total Referrals</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.totalReferrals}
            </p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Completed</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.completedReferrals}
            </p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Pending</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.pendingReferrals}
            </p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Total Rewards</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              ${stats.totalRewards.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Referrals List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Your Referrals
            </h3>
            {referrals.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    statusFilter === 'pending'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    statusFilter === 'completed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Completed
                </button>
              </div>
            )}
          </div>
          {referrals.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No referrals yet. Share your link to get started!</p>
          ) : (
            <>
              <div className="space-y-2">
                {filteredReferrals.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400">No referrals match the selected filter.</p>
                ) : (
                  paginatedReferrals.map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {referral.referredUserName || 'Unknown User'}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {new Date(referral.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          referral.status === 'completed' || referral.status === 'rewarded'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        }`}>
                          {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                        </span>
                        {referral.rewardAmount > 0 && (
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            ${referral.rewardAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination Controls */}
              {filteredReferrals.length > itemsPerPage && (
                <div className="mt-6 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-4">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredReferrals.length)} of {filteredReferrals.length} referrals
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      <ChevronLeft size={16} />
                      <span>Previous</span>
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1.5 rounded-lg border transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

