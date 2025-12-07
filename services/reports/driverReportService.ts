import { CalculatedLoad, Driver } from '../../types';
import { DriverReport, ReportFilters } from '../../types/reports';

/**
 * Generate driver reports from loads data
 * Groups loads by driver and calculates performance metrics
 */
export const generateDriverReports = (
  loads: CalculatedLoad[],
  drivers: Driver[],
  filters: ReportFilters = {}
): DriverReport[] => {
  // Filter loads by date range if provided
  let filteredLoads = loads;
  
  if (filters.startDate || filters.endDate) {
    filteredLoads = loads.filter(load => {
      const loadDate = new Date(load.dropDate);
      if (filters.startDate && loadDate < new Date(filters.startDate)) {
        return false;
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // Include entire end date
        if (loadDate > endDate) {
          return false;
        }
      }
      return true;
    });
  }

  // Filter by specific driver if provided
  if (filters.driverId) {
    filteredLoads = filteredLoads.filter(load => load.driverId === filters.driverId);
  }

  // Create a map of driverId to driver name
  const driverMap = new Map<string, string>();
  drivers.forEach(driver => {
    driverMap.set(driver.id, driver.name);
  });

  // Group loads by driverId
  const loadsByDriver = new Map<string, CalculatedLoad[]>();
  
  filteredLoads.forEach(load => {
    if (load.driverId) {
      if (!loadsByDriver.has(load.driverId)) {
        loadsByDriver.set(load.driverId, []);
      }
      loadsByDriver.get(load.driverId)!.push(load);
    }
  });

  // Generate report for each driver
  const reports: DriverReport[] = [];

  loadsByDriver.forEach((driverLoads, driverId) => {
    const driverName = driverMap.get(driverId) || 'Unknown Driver';
    
    const totalLoads = driverLoads.length;
    const totalPay = driverLoads.reduce((sum, load) => sum + load.driverPay, 0);
    const totalMiles = driverLoads.reduce((sum, load) => sum + load.miles, 0);
    const avgRatePerMile = totalMiles > 0 ? totalPay / totalMiles : 0;

    // Count loads by status
    const loadsByStatus = {
      factored: driverLoads.filter(l => l.status === 'Factored').length,
      notFactored: driverLoads.filter(l => l.status === 'Not yet Factored').length
    };

    // Count payout status
    const payoutStatus = {
      pending: driverLoads.filter(l => l.driverPayoutStatus === 'pending').length,
      paid: driverLoads.filter(l => l.driverPayoutStatus === 'paid').length,
      partial: driverLoads.filter(l => l.driverPayoutStatus === 'partial').length
    };

    reports.push({
      driverId,
      driverName,
      totalLoads,
      totalPay,
      totalMiles,
      avgRatePerMile,
      loadsByStatus,
      payoutStatus,
      loads: driverLoads
    });
  });

  // Sort by total pay (descending) by default
  return reports.sort((a, b) => b.totalPay - a.totalPay);
};

