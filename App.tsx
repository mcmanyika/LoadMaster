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
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Load, DispatcherName, CalculatedLoad } from './types';
import { StatsCard } from './components/StatsCard';
import { LoadForm } from './components/LoadForm';
import { analyzeFleetPerformance } from './services/geminiService';
import { getLoads, createLoad } from './services/loadService';
import { isSupabaseConfigured } from './services/supabaseClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

function App() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [view, setView] = useState<'dashboard' | 'loads'>('dashboard');

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await getLoads();
      setLoads(data);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Logic to process loads with calculated fields
  const processedLoads: CalculatedLoad[] = useMemo(() => {
    return loads.map(load => {
      const dispatchFee = load.gross * 0.12;
      const driverPay = (load.gross - dispatchFee - load.gasAmount) * 0.5;
      const netProfit = load.gross - driverPay - load.gasAmount;
      return {
        ...load,
        dispatchFee,
        driverPay,
        netProfit
      };
    }).sort((a, b) => new Date(b.dropDate).getTime() - new Date(a.dropDate).getTime());
  }, [loads]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const totalGross = processedLoads.reduce((sum, l) => sum + l.gross, 0);
    const totalMiles = processedLoads.reduce((sum, l) => sum + l.miles, 0);
    const totalDriverPay = processedLoads.reduce((sum, l) => sum + l.driverPay, 0);
    const avgRate = totalMiles > 0 ? totalGross / totalMiles : 0;
    
    return {
      gross: totalGross,
      miles: totalMiles,
      driverPay: totalDriverPay,
      rpm: avgRate
    };
  }, [processedLoads]);

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
      // Optimistic update could go here, but for now we wait for DB
      const newLoad = await createLoad(newLoadData);
      setLoads(prev => [newLoad, ...prev]);
    } catch (error) {
      console.error("Failed to save load", error);
      alert("Failed to save load. Please check your connection.");
    }
  };

  const handleGenerateAIReport = async () => {
    setIsAnalyzing(true);
    const result = await analyzeFleetPerformance(loads);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const filteredLoads = processedLoads.filter(l => 
    l.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 text-white mb-8">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Truck size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight">LoadMaster</span>
          </div>
          
          <nav className="space-y-2">
            <button 
              onClick={() => setView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'dashboard' ? 'bg-blue-600/10 text-blue-400 font-medium' : 'hover:bg-slate-800'}`}
            >
              <LayoutDashboard size={20} />
              Dashboard
            </button>
            <button 
              onClick={() => setView('loads')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'loads' ? 'bg-blue-600/10 text-blue-400 font-medium' : 'hover:bg-slate-800'}`}
            >
              <FileText size={20} />
              All Loads
            </button>
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-4 px-2">
            {isSupabaseConfigured ? (
              <div className="flex items-center gap-2 text-emerald-500 text-xs font-medium">
                <Wifi size={14} />
                <span>Supabase Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-500 text-xs font-medium">
                <WifiOff size={14} />
                <span>Demo Mode (Mock DB)</span>
              </div>
            )}
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Pro Tip</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Use the AI Analysis to identify your most profitable routes and dispatchers every week.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-800">
              {view === 'dashboard' ? 'Fleet Overview' : 'Load Management'}
            </h1>
            <div className="flex items-center gap-4">
              {isLoading && <span className="text-sm text-slate-400 animate-pulse">Syncing...</span>}
               <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all hover:shadow-md"
              >
                <Plus size={18} />
                Add Load
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard 
              title="Total Gross Revenue" 
              value={`$${stats.gross.toLocaleString()}`} 
              subValue="All time"
              trend="up"
              icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
              colorClass="bg-emerald-100"
            />
             <StatsCard 
              title="Avg Rate Per Mile" 
              value={`$${stats.rpm.toFixed(2)}`} 
              subValue="Target: $2.00+"
              trend={stats.rpm > 2 ? "up" : "neutral"}
              icon={<MapPin className="w-6 h-6 text-blue-600" />}
              colorClass="bg-blue-100"
            />
             <StatsCard 
              title="Total Miles" 
              value={stats.miles.toLocaleString()} 
              icon={<Truck className="w-6 h-6 text-indigo-600" />}
              colorClass="bg-indigo-100"
            />
            <StatsCard 
              title="Driver Pay Output" 
              value={`$${stats.driverPay.toLocaleString()}`} 
              icon={<User className="w-6 h-6 text-amber-600" />}
              colorClass="bg-amber-100"
            />
          </div>

          {/* Dashboard View Specifics */}
          {view === 'dashboard' && (
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
                    <BrainCircuit className="text-purple-600" size={24} />
                    <h3 className="text-lg font-bold text-slate-800">AI Analyst</h3>
                  </div>
                  {!aiAnalysis && (
                    <button 
                      onClick={handleGenerateAIReport}
                      disabled={isAnalyzing}
                      className="text-sm text-purple-600 font-medium hover:text-purple-700 disabled:opacity-50"
                    >
                      {isAnalyzing ? 'Thinking...' : 'Generate Report'}
                    </button>
                  )}
                </div>
                
                <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100 overflow-y-auto max-h-[300px]">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Analyzing market data...</span>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="prose prose-sm prose-slate">
                      <div className="whitespace-pre-wrap text-slate-600 text-sm leading-relaxed font-medium">
                        {aiAnalysis}
                      </div>
                      <button 
                        onClick={() => setAiAnalysis(null)} 
                        className="mt-4 text-xs text-slate-400 underline hover:text-slate-600"
                      >
                        Clear Report
                      </button>
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
          )}

          {/* Recent Loads / All Loads Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-slate-800">Recent Loads</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search company, city..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b border-slate-200">Company</th>
                    <th className="p-4 font-semibold border-b border-slate-200">Route</th>
                    <th className="p-4 font-semibold border-b border-slate-200">Date</th>
                    <th className="p-4 font-semibold border-b border-slate-200">Dispatcher</th>
                    <th className="p-4 font-semibold border-b border-slate-200 text-right">Gross</th>
                    <th className="p-4 font-semibold border-b border-slate-200 text-right">Disp (12%)</th>
                    <th className="p-4 font-semibold border-b border-slate-200 text-right">Driver Pay</th>
                    <th className="p-4 font-semibold border-b border-slate-200">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading && filteredLoads.length === 0 ? (
                     <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                           <div className="flex justify-center items-center gap-2">
                             <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                             <span>Loading fleet data...</span>
                           </div>
                        </td>
                     </tr>
                  ) : filteredLoads.length === 0 ? (
                     <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                           No loads found. Add a new load to get started.
                        </td>
                     </tr>
                  ) : (
                    filteredLoads.map((load) => (
                      <tr key={load.id} className="hover:bg-slate-50/50 transition-colors group">
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
                            load.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {load.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {isModalOpen && <LoadForm onClose={() => setIsModalOpen(false)} onSave={handleAddLoad} />}
    </div>
  );
}

export default App;