import { CalculatedLoad, Driver, Dispatcher } from '../types';

export interface DriverReport {
  driverId: string;
  driverName: string;
  totalLoads: number;
  totalPay: number;
  totalMiles: number;
  avgRatePerMile: number;
  totalNetProfit?: number; // Net profit from driver's loads
  revenuePerLoad?: number; // Average revenue per load
  profitMargin?: number; // Profit margin percentage
  loadsByStatus: {
    factored: number;
    notFactored: number;
  };
  payoutStatus: {
    pending: number;
    paid: number;
    partial: number;
  };
  loads: CalculatedLoad[];
}

export interface DispatcherReport {
  dispatcherId: string;
  dispatcherName: string;
  totalLoads: number;
  totalFees: number;
  avgFeePerLoad: number;
  totalRevenue?: number; // Gross revenue from dispatcher's loads
  revenuePerLoad?: number; // Average revenue per load
  netProfitGenerated?: number; // Company profit from dispatcher's loads
  loadsByStatus: {
    factored: number;
    notFactored: number;
  };
  loads: CalculatedLoad[];
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  driverId?: string;
  dispatcherId?: string;
}

