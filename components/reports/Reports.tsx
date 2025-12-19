import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, CalculatedLoad, Driver, Dispatcher } from '../../types';
import { getLoads } from '../../services/loadService';
import { getCompanyDrivers } from '../../services/driverAssociationService';
import { getCompanyDispatchers } from '../../services/dispatcherAssociationService';
import { supabase } from '../../services/supabaseClient';
import { DriverReports } from './DriverReports';
import { DispatcherReports } from './DispatcherReports';
import { FinancialOverview } from './FinancialOverview';
import { generateDriverReports } from '../../services/reports/driverReportService';
import { generateDispatcherReports } from '../../services/reports/dispatcherReportService';
import { ReportFilters } from '../../types/reports';
import { Calendar, FileBarChart, User, Users, X } from 'lucide-react';

interface ReportsProps {
  user: UserProfile;
  companyId?: string;
}

export const Reports: React.FC<ReportsProps> = ({ user, companyId }) => {
  const [activeTab, setActiveTab] = useState<'drivers' | 'dispatchers'>('drivers');
  const [loads, setLoads] = useState<CalculatedLoad[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]); // Deduplicated for dropdown
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]); // All drivers for report generation
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
  }, [companyId, user]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // For dispatchers, filter loads by their name and selected company
      // For owners, filter by company only
      const dispatcherName = user?.role === 'dispatcher' ? user.name : undefined;
      
      if (!companyId) {
        setError('Company ID is required');
        setLoading(false);
        return;
      }
      
      const [loadsData] = await Promise.all([
        getLoads(companyId, dispatcherName)
      ]);
      
      // Fetch dispatchers from associations
      const dispatcherAssociations = await getCompanyDispatchers(companyId);
      const activeDispatcherAssociations = dispatcherAssociations.filter(a => a.status === 'active' && a.dispatcherId && a.dispatcher);
      
      // Map to Dispatcher format and deduplicate by name
      const dispatchersByName = new Map<string, Dispatcher>();
      activeDispatcherAssociations.forEach(association => {
        if (association.dispatcherId && association.dispatcher) {
          const dispatcherName = association.dispatcher.name || association.dispatcher.email || 'Unknown';
          const key = dispatcherName.toLowerCase().trim();
          
          // Only keep the first occurrence of each name
          if (!dispatchersByName.has(key)) {
            dispatchersByName.set(key, {
              id: association.dispatcherId,
              name: dispatcherName,
              email: association.dispatcher.email || '',
              phone: association.dispatcher.phone || '',
              feePercentage: association.feePercentage || 12,
              companyId: association.companyId
            });
          }
        }
      });
      
      const dispatchersData = Array.from(dispatchersByName.values());

      // Fetch ALL driver records for the company (to match loads that might reference old driver IDs)
      // This ensures we can resolve driver names for all loads, even if they reference older driver records
      let allCompanyDrivers = null;
      try {
        const { data, error: driversError } = await supabase
          .from('drivers')
          .select('id, name, phone, email, transporter_id, company_id, profile_id')
          .eq('company_id', companyId);
        
        if (driversError) {
          console.error('Error fetching company drivers:', driversError);
        } else {
          allCompanyDrivers = data;
        }
      } catch (err) {
        console.error('Error in driver fetch:', err);
        // Continue with empty array if fetch fails
        allCompanyDrivers = [];
      }
      
      // Also fetch drivers from associations to get the latest data and ensure we have all active drivers
      const driverAssociations = await getCompanyDrivers(companyId);
      const activeDriverAssociations = driverAssociations.filter(a => a.status === 'active' && a.driverId && a.driver);
      
      // Create maps for deduplication
      const driversById = new Map<string, Driver>(); // All drivers by ID (for report generation)
      const driversByProfileId = new Map<string, Driver>(); // One driver per profile_id
      const driversByName = new Map<string, Driver>(); // One driver per unique name (for dropdown)
      
      // First, add all existing driver records from the drivers table
      if (allCompanyDrivers) {
        allCompanyDrivers.forEach(driver => {
          const driverObj: Driver = {
            id: driver.id,
            name: driver.name,
            email: driver.email || '',
            phone: driver.phone || '',
            transporterId: driver.transporter_id || '',
            companyId: driver.company_id
          };
          
          driversById.set(driver.id, driverObj);
          
          // Group by profile_id (one driver per profile)
          if (driver.profile_id) {
            if (!driversByProfileId.has(driver.profile_id)) {
              driversByProfileId.set(driver.profile_id, driverObj);
            }
          }
        });
      }
      
      // Then, update/create driver records from associations (this ensures we have the latest data)
      for (const association of activeDriverAssociations) {
        if (!association.driverId || !association.driver) continue;
        
        const profileId = association.driverId;
        
        // Check if driver record exists for this profile
        const existingDriver = allCompanyDrivers?.find(d => d.profile_id === profileId && d.company_id === companyId);
        
        if (existingDriver) {
          // Update the existing driver record with latest data from profile
          const updatedDriver: Driver = {
            id: existingDriver.id,
            name: association.driver.name || existingDriver.name || 'Unknown',
            email: association.driver.email || existingDriver.email || '',
            phone: association.driver.phone || existingDriver.phone || '',
            transporterId: existingDriver.transporter_id || '',
            companyId: existingDriver.company_id
          };
          
          driversById.set(existingDriver.id, updatedDriver);
          driversByProfileId.set(profileId, updatedDriver);
        } else {
          // Create driver record if it doesn't exist
          const { data: newDriver } = await supabase
            .from('drivers')
            .insert([{
              name: association.driver.name || association.driver.email || 'Unknown',
              phone: association.driver.phone || null,
              email: association.driver.email || null,
              profile_id: profileId,
              company_id: companyId,
              transporter_id: null
            }])
            .select('id, name, phone, email, transporter_id, company_id')
            .single();
          
          if (newDriver) {
            const newDriverObj: Driver = {
              id: newDriver.id,
              name: newDriver.name,
              email: newDriver.email || association.driver.email || '',
              phone: newDriver.phone || association.driver.phone || '',
              transporterId: newDriver.transporter_id || '',
              companyId: newDriver.company_id
            };
            
            driversById.set(newDriver.id, newDriverObj);
            driversByProfileId.set(profileId, newDriverObj);
          }
        }
      }
      
      // Final deduplication: use profile-based drivers first, then others, deduplicated by name
      driversByProfileId.forEach(driver => {
        const key = driver.name.toLowerCase().trim();
        if (!driversByName.has(key)) {
          driversByName.set(key, driver);
        }
      });
      
      // Add any remaining drivers that don't have a profile_id (for backward compatibility)
      driversById.forEach(driver => {
        const key = driver.name.toLowerCase().trim();
        if (!driversByName.has(key)) {
          driversByName.set(key, driver);
        }
      });
      
      // Use deduplicated drivers for the dropdown (unique names only)
      const finalDrivers = Array.from(driversByName.values());
      
      // Store all drivers by ID for report generation (to match loads with any driver ID)
      // This ensures we can resolve driver names even if loads reference old driver IDs
      const allDriversById = Array.from(driversById.values());
      
      setLoads(loadsData || []);
      setDrivers(finalDrivers); // Use deduplicated drivers for dropdown (unique names only)
      setAllDrivers(allDriversById); // Store all drivers for report generation
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

    // Create driver pay configuration map
    const driverPayConfigMap = new Map<string, { payType: string, payPercentage: number }>();
    drivers.forEach(driver => {
      driverPayConfigMap.set(driver.id, {
        payType: driver.payType || 'percentage_of_net',
        payPercentage: driver.payPercentage || 50
      });
    });

    return loads.map(load => {
      const feePercentage = dispatcherFeeMap.get(load.dispatcher) || 12; // Default to 12% if dispatcher not found
      const dispatchFee = load.gross * (feePercentage / 100);
      
      // Get driver pay configuration
      const driverConfig = load.driverId ? driverPayConfigMap.get(load.driverId) : null;
      const payType = driverConfig?.payType || 'percentage_of_net';
      const payPercentage = driverConfig?.payPercentage || 50;
      
      // Gas expense allocation depends on pay type:
      // - percentage_of_gross: Owner covers all expenses (100% company, 0% driver)
      // - percentage_of_net: Shared 50-50 between driver and company
      let driverGasShare: number;
      let companyGasShare: number;
      let driverPay: number;
      
      if (payType === 'percentage_of_gross') {
        // Percentage of gross: Owner covers all expenses
        driverGasShare = 0; // Driver pays no gas
        companyGasShare = load.gasAmount; // Company covers 100% of gas
        driverPay = load.gross * (payPercentage / 100); // No gas deduction from driver pay
      } else {
        // Percentage of net: Shared expenses (50-50)
        driverGasShare = load.gasAmount * 0.5;
        companyGasShare = load.gasAmount * 0.5;
        driverPay = (load.gross - dispatchFee) * (payPercentage / 100) - driverGasShare;
      }
      
      // Net profit calculation
      const netProfit = load.gross - dispatchFee - driverPay - companyGasShare;
      
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
      // Use allDrivers for report generation (includes all driver IDs to match loads)
      // Use drivers (deduplicated) only for the dropdown
      // Fallback to drivers if allDrivers is not yet loaded
      const driversForReports = (allDrivers && allDrivers.length > 0) ? allDrivers : drivers;
      return generateDriverReports(processedLoads, driversForReports, dateFilter);
    } catch (error) {
      console.error('Error generating driver reports:', error);
      return [];
    }
  }, [processedLoads, allDrivers, drivers, dateFilter]);

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
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-12">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-12">
        <div className="flex flex-col items-center justify-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Error: {error}</p>
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

  // Show message if no loads
  if (processedLoads.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-12">
        <div className="flex flex-col items-center justify-center">
          <FileBarChart className="w-16 h-16 text-slate-400 dark:text-slate-500 mb-4" />
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">No Load Data Available</p>
          <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
            Start adding loads to see detailed reports, financial metrics, and performance charts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug: Uncomment to verify component is rendering */}
      {/* <div className="bg-yellow-100 p-4 rounded">Reports component loaded</div> */}
      
      {/* Financial Overview */}
      <FinancialOverview processedLoads={processedLoads} dateFilter={dateFilter} />
      
      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="space-y-4">
          {/* Driver/Dispatcher Filters */}
          <div className="flex items-center gap-4">
            {activeTab === 'drivers' ? (
              <User className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              ) : (
                <Users className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              )}
            <div className="flex items-center gap-3 flex-1">
              {activeTab === 'drivers' ? (
                <div className="flex-1">
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Filter by Driver</label>
                  <select
                    value={dateFilter.driverId || ''}
                    onChange={(e) => setDateFilter({ ...dateFilter, driverId: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Filter by Dispatcher</label>
                  <select
                    value={dateFilter.dispatcherId || ''}
                    onChange={(e) => setDateFilter({ ...dateFilter, dispatcherId: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <Calendar className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-1">
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateFilter.startDate || ''}
                  onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateFilter.endDate || ''}
                  onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(dateFilter.startDate || dateFilter.endDate || dateFilter.driverId || dateFilter.dispatcherId) && (
            <div className="flex justify-end">
              <button
                onClick={() => setDateFilter({ startDate: '', endDate: '', driverId: '', dispatcherId: '' })}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={16} />
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex">
            <button
              onClick={() => {
                setActiveTab('drivers');
                // Clear dispatcher filter when switching to drivers tab
                setDateFilter(prev => ({ ...prev, dispatcherId: '' }));
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'drivers'
                  ? 'text-slate-800 dark:text-slate-100 border-b-2 border-slate-600 dark:border-slate-500 bg-slate-50/50 dark:bg-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                  ? 'text-slate-800 dark:text-slate-100 border-b-2 border-slate-600 dark:border-slate-500 bg-slate-50/50 dark:bg-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
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


