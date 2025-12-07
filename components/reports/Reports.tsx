import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, CalculatedLoad, Driver, Dispatcher } from '../../types';
import { getLoads, getDrivers, getDispatchers } from '../../services/loadService';
import { DriverReports } from './DriverReports';
import { DispatcherReports } from './DispatcherReports';
import { generateDriverReports } from '../../services/reports/driverReportService';
import { generateDispatcherReports } from '../../services/reports/dispatcherReportService';
import { ReportFilters } from '../../types/reports';
import { Calendar, FileBarChart, User, Users, X } from 'lucide-react';

interface ReportsProps {
  user: UserProfile;
}

export const Reports: React.FC<ReportsProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'drivers' | 'dispatchers'>('drivers');
  const [loads, setLoads] = useState<CalculatedLoad[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    driverId: '',
    dispatcherId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [loadsData, driversData, dispatchersData] = await Promise.all([
        getLoads(),
        getDrivers(),
        getDispatchers()
      ]);

      setLoads(loadsData || []);
      setDrivers(driversData || []);
      setDispatchers(dispatchersData || []);
    } catch (error) {
      console.error('Error fetching reports data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate processed loads with dispatch fees and driver pay
  // Uses same logic as App.tsx
  const processedLoads: CalculatedLoad[] = useMemo(() => {
    // Create dispatcher fee map
    const dispatcherFeeMap = new Map<string, number>();
    dispatchers.forEach(dispatcher => {
      dispatcherFeeMap.set(dispatcher.name, dispatcher.feePercentage);
    });

    // Create driver name map
    const driverMap = new Map<string, string>();
    drivers.forEach(driver => {
      driverMap.set(driver.id, driver.name);
    });

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
    });
  }, [loads, dispatchers, drivers]);

  // Generate driver reports
  const driverReports = useMemo(() => {
    try {
      return generateDriverReports(processedLoads, drivers, dateFilter);
    } catch (error) {
      console.error('Error generating driver reports:', error);
      return [];
    }
  }, [processedLoads, drivers, dateFilter]);

  // Generate dispatcher reports
  const dispatcherReports = useMemo(() => {
    try {
      return generateDispatcherReports(processedLoads, dispatchers, dateFilter);
    } catch (error) {
      console.error('Error generating dispatcher reports:', error);
      return [];
    }
  }, [processedLoads, dispatchers, dateFilter]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12">
        <div className="flex flex-col items-center justify-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug: Uncomment to verify component is rendering */}
      {/* <div className="bg-yellow-100 p-4 rounded">Reports component loaded</div> */}
      
      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="space-y-4">
          {/* Driver/Dispatcher Filters */}
          <div className="flex items-center gap-4">
            {activeTab === 'drivers' ? (
              <User className="w-5 h-5 text-slate-400 flex-shrink-0" />
            ) : (
              <Users className="w-5 h-5 text-slate-400 flex-shrink-0" />
            )}
            <div className="flex items-center gap-3 flex-1">
              {activeTab === 'drivers' ? (
                <div className="flex-1">
                  <label className="block text-xs text-slate-600 mb-1">Filter by Driver</label>
                  <select
                    value={dateFilter.driverId || ''}
                    onChange={(e) => setDateFilter({ ...dateFilter, driverId: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">All Drivers</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex-1">
                  <label className="block text-xs text-slate-600 mb-1">Filter by Dispatcher</label>
                  <select
                    value={dateFilter.dispatcherId || ''}
                    onChange={(e) => setDateFilter({ ...dateFilter, dispatcherId: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">All Dispatchers</option>
                    {dispatchers.map((dispatcher) => (
                      <option key={dispatcher.id} value={dispatcher.id}>
                        {dispatcher.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-1">
                <label className="block text-xs text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateFilter.startDate || ''}
                  onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateFilter.endDate || ''}
                  onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(dateFilter.startDate || dateFilter.endDate || dateFilter.driverId || dateFilter.dispatcherId) && (
            <div className="flex justify-end">
              <button
                onClick={() => setDateFilter({ startDate: '', endDate: '', driverId: '', dispatcherId: '' })}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} />
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => {
                setActiveTab('drivers');
                // Clear dispatcher filter when switching to drivers tab
                setDateFilter(prev => ({ ...prev, dispatcherId: '' }));
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'drivers'
                  ? 'text-slate-800 border-b-2 border-slate-600 bg-slate-50/50'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Driver Reports
            </button>
            <button
              onClick={() => {
                setActiveTab('dispatchers');
                // Clear driver filter when switching to dispatchers tab
                setDateFilter(prev => ({ ...prev, driverId: '' }));
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'dispatchers'
                  ? 'text-slate-800 border-b-2 border-slate-600 bg-slate-50/50'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Dispatcher Reports
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'drivers' ? (
            <DriverReports reports={driverReports} />
          ) : (
            <DispatcherReports reports={dispatcherReports} />
          )}
        </div>
      </div>
    </div>
  );
};

