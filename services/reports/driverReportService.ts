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

  // Create a map of driverId to driver name (and reverse map for filtering)
  const driverMap = new Map<string, string>();
  const driverNameToIds = new Map<string, string[]>(); // Map driver name to all their IDs
  
  drivers.forEach(driver => {
    driverMap.set(driver.id, driver.name);
    
    // Group driver IDs by name (for filtering by name)
    const nameKey = driver.name.toLowerCase().trim();
    if (!driverNameToIds.has(nameKey)) {
      driverNameToIds.set(nameKey, []);
    }
    driverNameToIds.get(nameKey)!.push(driver.id);
  });

  // Filter by specific driver if provided
  // If driverId is provided, also include loads for other driver IDs with the same name
  if (filters.driverId) {
    const selectedDriver = drivers.find(d => d.id === filters.driverId);
    if (selectedDriver) {
      const driverName = selectedDriver.name.toLowerCase().trim();
      const allDriverIdsForName = driverNameToIds.get(driverName) || [filters.driverId];
      
      // Filter loads that match any of the driver IDs for this driver name
      filteredLoads = filteredLoads.filter(load => 
        load.driverId && allDriverIdsForName.includes(load.driverId)
      );
    } else {
      // Fallback: filter by exact driverId if driver not found
      filteredLoads = filteredLoads.filter(load => load.driverId === filters.driverId);
    }
  }

  // Group loads by driver name (normalized) to handle duplicate driver IDs
  // First, create a map of driverId to normalized name
  const driverIdToName = new Map<string, string>();
  drivers.forEach(driver => {
    driverIdToName.set(driver.id, driver.name.toLowerCase().trim());
  });

  // Group loads by normalized driver name
  const loadsByDriverName = new Map<string, CalculatedLoad[]>();
  const driverNameToId = new Map<string, string>(); // Track the primary driver ID for each name
  
  filteredLoads.forEach(load => {
    if (load.driverId) {
      // Get the driver name from the map, or try to get it from the load
      let driverName = driverIdToName.get(load.driverId);
      
      // If not found in map, try to get from driverMap
      if (!driverName) {
        const name = driverMap.get(load.driverId);
        driverName = name ? name.toLowerCase().trim() : 'unknown driver';
      }
      
      // Use normalized name as key
      if (!loadsByDriverName.has(driverName)) {
        loadsByDriverName.set(driverName, []);
        // Store the first driver ID we encounter for this name
        driverNameToId.set(driverName, load.driverId);
      }
      loadsByDriverName.get(driverName)!.push(load);
    }
  });

  // Generate report for each driver (by name)
  const reports: DriverReport[] = [];

  loadsByDriverName.forEach((driverLoads, normalizedName) => {
    // Get the primary driver ID for this name
    const primaryDriverId = driverNameToId.get(normalizedName) || '';
    
    // Get the actual driver name (not normalized) from the first load or driver map
    let driverName = 'Unknown Driver';
    if (driverLoads.length > 0 && driverLoads[0].driverId) {
      const nameFromMap = driverMap.get(driverLoads[0].driverId);
      if (nameFromMap) {
        driverName = nameFromMap;
      } else if (driverLoads[0].driverName) {
        driverName = driverLoads[0].driverName;
      }
    }
    
    const totalLoads = driverLoads.length;
    const totalPay = driverLoads.reduce((sum, load) => sum + load.driverPay, 0);
    const totalMiles = driverLoads.reduce((sum, load) => sum + load.miles, 0);
    const avgRatePerMile = totalMiles > 0 ? totalPay / totalMiles : 0;
    
    // Calculate new metrics
    const totalRevenue = driverLoads.reduce((sum, load) => sum + load.gross, 0);
    const totalNetProfit = driverLoads.reduce((sum, load) => sum + load.netProfit, 0);
    const revenuePerLoad = totalLoads > 0 ? totalRevenue / totalLoads : 0;
    const profitMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

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
      driverId: primaryDriverId,
      driverName,
      totalLoads,
      totalPay,
      totalMiles,
      avgRatePerMile,
      totalNetProfit,
      revenuePerLoad,
      profitMargin,
      loadsByStatus,
      payoutStatus,
      loads: driverLoads
    });
  });

  // Sort by total pay (descending) by default
  return reports.sort((a, b) => b.totalPay - a.totalPay);
};

