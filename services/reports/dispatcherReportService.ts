import { CalculatedLoad, Dispatcher } from '../../types';
import { DispatcherReport, ReportFilters } from '../../types/reports';

/**
 * Generate dispatcher reports from loads data
 * Groups loads by dispatcher name and calculates performance metrics
 */
export const generateDispatcherReports = (
  loads: CalculatedLoad[],
  dispatchers: Dispatcher[],
  filters: ReportFilters = {}
): DispatcherReport[] => {
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

  // Filter by specific dispatcher if provided
  if (filters.dispatcherId) {
    const dispatcher = dispatchers.find(d => d.id === filters.dispatcherId);
    if (dispatcher) {
      filteredLoads = filteredLoads.filter(load => load.dispatcher === dispatcher.name);
    }
  }

  // Create a map of dispatcher name to dispatcher record
  const dispatcherMap = new Map<string, Dispatcher>();
  dispatchers.forEach(dispatcher => {
    dispatcherMap.set(dispatcher.name, dispatcher);
  });

  // Group loads by dispatcher name
  const loadsByDispatcher = new Map<string, CalculatedLoad[]>();
  
  filteredLoads.forEach(load => {
    if (load.dispatcher) {
      if (!loadsByDispatcher.has(load.dispatcher)) {
        loadsByDispatcher.set(load.dispatcher, []);
      }
      loadsByDispatcher.get(load.dispatcher)!.push(load);
    }
  });

  // Generate report for each dispatcher
  const reports: DispatcherReport[] = [];

  loadsByDispatcher.forEach((dispatcherLoads, dispatcherName) => {
    const dispatcher = dispatcherMap.get(dispatcherName);
    const dispatcherId = dispatcher?.id || dispatcherName; // Fallback to name if not found
    
    const totalLoads = dispatcherLoads.length;
    const totalFees = dispatcherLoads.reduce((sum, load) => sum + load.dispatchFee, 0);
    const avgFeePerLoad = totalLoads > 0 ? totalFees / totalLoads : 0;
    
    // Calculate new metrics
    const totalRevenue = dispatcherLoads.reduce((sum, load) => sum + load.gross, 0);
    const netProfitGenerated = dispatcherLoads.reduce((sum, load) => sum + load.netProfit, 0);
    const revenuePerLoad = totalLoads > 0 ? totalRevenue / totalLoads : 0;

    // Count loads by status
    const loadsByStatus = {
      factored: dispatcherLoads.filter(l => l.status === 'Factored').length,
      notFactored: dispatcherLoads.filter(l => l.status === 'Not yet Factored').length
    };

    reports.push({
      dispatcherId,
      dispatcherName,
      totalLoads,
      totalFees,
      avgFeePerLoad,
      totalRevenue,
      revenuePerLoad,
      netProfitGenerated,
      loadsByStatus,
      loads: dispatcherLoads
    });
  });

  // Sort by total fees (descending) by default
  return reports.sort((a, b) => b.totalFees - a.totalFees);
};

