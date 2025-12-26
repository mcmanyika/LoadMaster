import React, { useState, useEffect, useMemo } from 'react';
import { CalculatedLoad, UserProfile, Company } from '../types';
import { Truck, MapPin, Calendar, DollarSign, LogOut, Key, Building2, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import { DriverInvitationManagement } from './DriverInvitationManagement';
import { getDriverAssociationsWithCompanies } from '../services/driverAssociationService';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';

interface DriverDashboardProps {
  user: UserProfile;
  loads: CalculatedLoad[];
  onSignOut: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ user, loads, onSignOut }) => {
  const { theme, toggleTheme } = useTheme();
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [driverId, setDriverId] = useState<string | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    checkDriverCompany();
    getDriverId();
  }, [user]);

  const checkDriverCompany = async () => {
    try {
      const companies = await getDriverAssociationsWithCompanies(user.id);
      // Drivers should only have one active company at a time
      // Get the first (and should be only) active company
      if (companies.length > 0) {
        setCurrentCompany(companies[0]);
      } else {
        setCurrentCompany(null);
      }
    } catch (error) {
      console.error('Error checking driver company:', error);
      setCurrentCompany(null);
    }
  };

  const getDriverId = async () => {
    try {
      // Get the driver record ID from the drivers table using profile_id
      const { data: driverRecord, error } = await supabase
        .from('drivers')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching driver ID:', error);
        setDriverId(null);
        return;
      }
      
      if (driverRecord) {
        setDriverId(driverRecord.id);
      } else {
        setDriverId(null);
      }
    } catch (error) {
      console.error('Error getting driver ID:', error);
      setDriverId(null);
    }
  };

  // Filter loads to only show loads assigned to this driver
  const myLoads = useMemo(() => {
    if (!driverId) {
      return []; // Don't show any loads if we don't have a driver ID
    }
    // Filter loads where driverId matches the logged-in driver's ID
    return loads.filter(load => load.driverId === driverId);
  }, [loads, driverId]);

  // Pagination logic
  const totalPages = Math.ceil(myLoads.length / itemsPerPage);
  const paginatedLoads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return myLoads.slice(startIndex, endIndex);
  }, [myLoads, currentPage, itemsPerPage]);

  // Reset to page 1 when loads change
  useEffect(() => {
    setCurrentPage(1);
  }, [loads.length]); 

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-20">
      {/* Mobile Header */}
      <div className="bg-slate-200 dark:bg-slate-900 text-slate-900 dark:text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-600 dark:bg-indigo-600 p-2 rounded-lg">
                <Truck size={20} className="text-white" />
             </div>
             <div>
               <h1 className="font-bold text-lg">Hello, {user.name}</h1>
               <p className="text-slate-600 dark:text-slate-400 text-xs">Drive safe!</p>
               {currentCompany && (
                 <div className="flex items-center gap-1.5 mt-1">
                   <Building2 size={12} className="text-slate-600 dark:text-slate-400" />
                   <p className="text-slate-700 dark:text-slate-300 text-xs">{currentCompany.name}</p>
                 </div>
               )}
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="bg-slate-300 dark:bg-slate-800 p-2 rounded-full hover:bg-slate-400 dark:hover:bg-slate-700 text-slate-700 dark:text-white transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun size={16} />
              ) : (
                <Moon size={16} />
              )}
            </button>
            <button onClick={onSignOut} className="bg-slate-300 dark:bg-slate-800 p-2 rounded-full hover:bg-slate-400 dark:hover:bg-slate-700 text-slate-700 dark:text-white">
            <LogOut size={16} />
          </button>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/80 dark:bg-white/10 backdrop-blur-md rounded-xl p-4 border border-slate-300/50 dark:border-transparent">
              <p className="text-slate-600 dark:text-slate-400 text-xs mb-1">Active Loads</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{myLoads.filter(l => l.status === 'Not yet Factored').length}</p>
           </div>
           <div className="bg-emerald-100/80 dark:bg-emerald-500/20 backdrop-blur-md rounded-xl p-4 border border-emerald-300/50 dark:border-emerald-500/30">
              <p className="text-emerald-700 dark:text-emerald-100 text-xs mb-1">Next Payout</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                ${myLoads.filter(l => l.status === 'Factored').slice(0, 3).reduce((sum, l) => sum + l.driverPay, 0).toLocaleString()}
              </p>
           </div>
        </div>
      </div>

      {/* Join Company Section - Show only if driver doesn't have a company */}
      {!currentCompany && (
        <div className="px-4 py-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Key size={20} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-slate-800 dark:text-slate-100 font-bold text-lg">Join Company</h2>
            </div>
            <DriverInvitationManagement
              user={user}
              companyId={currentCompany?.id}
              onUpdate={checkDriverCompany}
            />
          </div>
        </div>
      )}

      {/* Company Info Card - Show when driver has a company */}
      {currentCompany && (
        <div className="px-4 py-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-sm border border-blue-500 p-6 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Building2 size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-xs mb-1">Current Company</p>
                  <p className="text-white font-bold text-lg">{currentCompany.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Load Feed */}
      <div className="px-4 py-6 space-y-4">
        <h2 className="text-slate-800 dark:text-slate-100 font-bold text-sm uppercase tracking-wider ml-1">Assigned Loads</h2>
        
        {myLoads.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center">
            <Truck size={48} className="mx-auto text-slate-300 dark:text-slate-500 mb-4" />
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">No loads assigned yet</p>
            <p className="text-slate-400 text-sm">
              {!currentCompany 
                ? "Join a company using an invite code to start receiving loads."
                : "Your assigned loads will appear here."}
            </p>
          </div>
        ) : (
          <>
            {paginatedLoads.map((load) => (
          <div key={load.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden active:scale-[0.98] transition-transform">
             {/* Status Bar */}
             <div className={`h-1.5 w-full ${load.status === 'Factored' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
             
             <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                   <div>
                     <span className="text-xs font-semibold text-slate-400">#{load.id.slice(0, 6)} • {load.company}</span>
                     <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                           load.status === 'Factored' 
                             ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' 
                             : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                        }`}>
                           {load.status}
                        </span>
                        <span className="text-xs text-slate-400">{load.miles} mi</span>
                     </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xs text-slate-400">Pay</p>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">${load.driverPay.toFixed(0)}</p>
                   </div>
                </div>

                <div className="relative border-l-2 border-slate-100 dark:border-slate-700 pl-4 ml-1 space-y-6">
                   <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-slate-800 shadow-sm"></div>
                      <p className="text-xs text-slate-400">Origin</p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{load.origin}</p>
                   </div>
                   <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-800 shadow-sm"></div>
                      <p className="text-xs text-slate-400">Destination</p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{load.destination}</p>
                   </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                   <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{load.dropDate}</span>
                   </div>
                   <div className="flex items-center gap-1">
                      <DollarSign size={14} className="text-green-600" />
                      <span>Gas: ${load.gasAmount} ({load.gasNotes})</span>
                   </div>
                </div>
             </div>
          </div>
          ))}

          {/* Pagination Controls */}
          {myLoads.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, myLoads.length)} of {myLoads.length} loads
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-300"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="px-2 text-slate-400 dark:text-slate-500">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-300"
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
};