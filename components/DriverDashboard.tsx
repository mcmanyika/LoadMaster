import React from 'react';
import { CalculatedLoad, UserProfile } from '../types';
import { Truck, MapPin, Calendar, DollarSign, LogOut } from 'lucide-react';

interface DriverDashboardProps {
  user: UserProfile;
  loads: CalculatedLoad[];
  onSignOut: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ user, loads, onSignOut }) => {
  // Filter logic: In a real app, this would be server-side. 
  // Here we simulate "My Loads" by just showing all or random ones if we don't have driver assignment data structure.
  // We'll show all loads for now as the data model doesn't explicitly link 'Driver User ID' to 'Load'.
  const myLoads = loads; 

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Mobile Header */}
      <div className="bg-slate-900 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-600 p-2 rounded-lg">
                <Truck size={20} className="text-white" />
             </div>
             <div>
               <h1 className="font-bold text-lg">Hello, {user.name}</h1>
               <p className="text-slate-400 text-xs">Drive safe!</p>
             </div>
          </div>
          <button onClick={onSignOut} className="bg-slate-800 p-2 rounded-full hover:bg-slate-700">
            <LogOut size={16} />
          </button>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">Active Loads</p>
              <p className="text-2xl font-bold">{myLoads.filter(l => l.status === 'Not yet Factored').length}</p>
           </div>
           <div className="bg-emerald-500/20 backdrop-blur-md rounded-xl p-4 border border-emerald-500/30">
              <p className="text-emerald-100 text-xs mb-1">Next Payout</p>
              <p className="text-2xl font-bold text-emerald-300">
                ${myLoads.filter(l => l.status === 'Factored').slice(0, 3).reduce((sum, l) => sum + l.driverPay, 0).toLocaleString()}
              </p>
           </div>
        </div>
      </div>

      {/* Load Feed */}
      <div className="px-4 py-6 space-y-4">
        <h2 className="text-slate-800 font-bold text-sm uppercase tracking-wider ml-1">Assigned Loads</h2>
        
        {myLoads.map((load) => (
          <div key={load.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden active:scale-[0.98] transition-transform">
             {/* Status Bar */}
             <div className={`h-1.5 w-full ${load.status === 'Factored' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
             
             <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                   <div>
                     <span className="text-xs font-semibold text-slate-400">#{load.id.slice(0, 6)} • {load.company}</span>
                     <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                           load.status === 'Factored' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                           {load.status}
                        </span>
                        <span className="text-xs text-slate-400">{load.miles} mi</span>
                     </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xs text-slate-400">Pay</p>
                      <p className="text-lg font-bold text-slate-800">${load.driverPay.toFixed(0)}</p>
                   </div>
                </div>

                <div className="relative border-l-2 border-slate-100 pl-4 ml-1 space-y-6">
                   <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
                      <p className="text-xs text-slate-400">Origin</p>
                      <p className="text-sm font-medium text-slate-800">{load.origin}</p>
                   </div>
                   <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow-sm"></div>
                      <p className="text-xs text-slate-400">Destination</p>
                      <p className="text-sm font-medium text-slate-800">{load.destination}</p>
                   </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
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
      </div>
    </div>
  );
};