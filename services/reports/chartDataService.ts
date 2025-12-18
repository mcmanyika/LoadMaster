import { CalculatedLoad } from '../../types';

export interface TimeSeriesDataPoint {
  date: string;
  revenue: number;
  profit: number;
  loads: number;
}

export interface TopPerformer {
  name: string;
  value: number;
  loads: number;
}

export interface BrokerData {
  name: string;
  revenue: number;
  loads: number;
}

export interface StatusDistribution {
  name: string;
  value: number;
}

/**
 * Determines the appropriate time period grouping based on date range
 */
export const getTimePeriod = (startDate?: string, endDate?: string): 'day' | 'week' | 'month' => {
  if (!startDate || !endDate) {
    return 'day'; // Default to daily if no filter
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 30) {
    return 'day';
  } else if (daysDiff <= 90) {
    return 'week';
  } else {
    return 'month';
  }
};

/**
 * Groups loads by time period (day, week, or month)
 */
export const groupLoadsByTimePeriod = (
  loads: CalculatedLoad[],
  startDate?: string,
  endDate?: string
): TimeSeriesDataPoint[] => {
  const period = getTimePeriod(startDate, endDate);
  const grouped = new Map<string, { revenue: number; profit: number; loads: number }>();

  loads.forEach(load => {
    const loadDate = new Date(load.dropDate);
    let key: string;

    if (period === 'day') {
      key = loadDate.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (period === 'week') {
      // Get the start of the week (Monday)
      const weekStart = new Date(loadDate);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      key = `Week of ${weekStart.toISOString().split('T')[0]}`;
    } else {
      // Month
      key = `${loadDate.getFullYear()}-${String(loadDate.getMonth() + 1).padStart(2, '0')}`;
    }

    const existing = grouped.get(key) || { revenue: 0, profit: 0, loads: 0 };
    grouped.set(key, {
      revenue: existing.revenue + load.gross,
      profit: existing.profit + load.netProfit,
      loads: existing.loads + 1
    });
  });

  // Convert to array and sort by date
  const result: TimeSeriesDataPoint[] = Array.from(grouped.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      profit: data.profit,
      loads: data.loads
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return result;
};

/**
 * Calculates top performers (drivers or dispatchers) by net profit or fees
 */
export const calculateTopPerformers = (
  loads: CalculatedLoad[],
  type: 'driver' | 'dispatcher',
  limit: number = 10
): TopPerformer[] => {
  const grouped = new Map<string, { value: number; loads: number }>();

  loads.forEach(load => {
    let key: string;
    let value: number;

    if (type === 'driver') {
      key = load.driverName || load.driverId || 'Unknown';
      value = load.netProfit; // Net profit from driver's loads
    } else {
      key = load.dispatcher || 'Unknown';
      value = load.dispatchFee; // Dispatch fees
    }

    const existing = grouped.get(key) || { value: 0, loads: 0 };
    grouped.set(key, {
      value: existing.value + value,
      loads: existing.loads + 1
    });
  });

  // Convert to array, sort by value, and take top N
  return Array.from(grouped.entries())
    .map(([name, data]) => ({
      name,
      value: data.value,
      loads: data.loads
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

/**
 * Groups loads by broker/company
 */
export const groupByBroker = (loads: CalculatedLoad[]): BrokerData[] => {
  const grouped = new Map<string, { revenue: number; loads: number }>();

  loads.forEach(load => {
    const broker = load.company || 'Unknown';
    const existing = grouped.get(broker) || { revenue: 0, loads: 0 };
    grouped.set(broker, {
      revenue: existing.revenue + load.gross,
      loads: existing.loads + 1
    });
  });

  // Convert to array and sort by revenue
  return Array.from(grouped.entries())
    .map(([name, data]) => ({
      name,
      revenue: data.revenue,
      loads: data.loads
    }))
    .sort((a, b) => b.revenue - a.revenue);
};

/**
 * Calculates status distribution (Factored vs Not Factored)
 */
export const calculateStatusDistribution = (loads: CalculatedLoad[]): StatusDistribution[] => {
  const factored = loads.filter(l => l.status === 'Factored').length;
  const notFactored = loads.filter(l => l.status === 'Not yet Factored').length;

  return [
    { name: 'Factored', value: factored },
    { name: 'Not Factored', value: notFactored }
  ];
};

/**
 * Calculates payout status distribution
 */
export const calculatePayoutStatusDistribution = (loads: CalculatedLoad[]): StatusDistribution[] => {
  const pending = loads.filter(l => l.driverPayoutStatus === 'pending').length;
  const paid = loads.filter(l => l.driverPayoutStatus === 'paid').length;
  const partial = loads.filter(l => l.driverPayoutStatus === 'partial').length;

  return [
    { name: 'Pending', value: pending },
    { name: 'Paid', value: paid },
    { name: 'Partial', value: partial }
  ];
};

/**
 * Calculates trend data for a specific driver or dispatcher
 */
export const calculateDriverTrend = (
  loads: CalculatedLoad[],
  driverId: string,
  period: 'day' | 'week' | 'month' = 'day'
): TimeSeriesDataPoint[] => {
  const driverLoads = loads.filter(l => l.driverId === driverId);
  return groupLoadsByTimePeriod(driverLoads);
};

/**
 * Calculates trend data for a specific dispatcher
 */
export const calculateDispatcherTrend = (
  loads: CalculatedLoad[],
  dispatcherName: string,
  period: 'day' | 'week' | 'month' = 'day'
): TimeSeriesDataPoint[] => {
  const dispatcherLoads = loads.filter(l => l.dispatcher === dispatcherName);
  return groupLoadsByTimePeriod(dispatcherLoads);
};

