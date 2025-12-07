import { CalculatedLoad, Driver, Dispatcher } from '../types';

export interface DriverReport {
  driverId: string;
  driverName: string;
  totalLoads: number;
  totalPay: number;
  totalMiles: number;
  avgRatePerMile: number;
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

