import React, { useMemo } from 'react';
import { CalculatedLoad } from '../../types';
import { ReportFilters } from '../../types/reports';
import { ReportCard } from './ReportCard';
import { DollarSign, TrendingUp, TrendingDown, Fuel, Users, FileBarChart } from 'lucide-react';
import { filterLoadsByDate } from '../../services/reports/reportService';

interface FinancialOverviewProps {
  processedLoads: CalculatedLoad[];
  dateFilter: ReportFilters;
}

export const FinancialOverview: React.FC<FinancialOverviewProps> = ({
  processedLoads,
  dateFilter
}) => {
  // Filter loads by date range
  const filteredLoads = useMemo(() => {
    if (!processedLoads || processedLoads.length === 0) return [];
    try {
      return filterLoadsByDate(processedLoads, dateFilter.startDate, dateFilter.endDate);
    } catch (error) {
      console.error('Error filtering loads:', error);
      return [];
    }
  }, [processedLoads, dateFilter.startDate, dateFilter.endDate]);

  // Calculate current period metrics
  const currentMetrics = useMemo(() => {
    const totalRevenue = filteredLoads.reduce((sum, load) => sum + load.gross, 0);
    const totalNetProfit = filteredLoads.reduce((sum, load) => sum + load.netProfit, 0);
    const totalDispatchFees = filteredLoads.reduce((sum, load) => sum + load.dispatchFee, 0);
    const totalDriverPay = filteredLoads.reduce((sum, load) => sum + load.driverPay, 0);
    const totalGasExpenses = filteredLoads.reduce((sum, load) => sum + load.gasAmount, 0);
    const totalMiles = filteredLoads.reduce((sum, load) => sum + load.miles, 0);
    
    const profitMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
    const revenuePerMile = totalMiles > 0 ? totalRevenue / totalMiles : 0;
    const costPerMile = totalMiles > 0 ? (totalDriverPay + totalDispatchFees + totalGasExpenses) / totalMiles : 0;

    return {
      totalRevenue,
      totalNetProfit,
      totalDispatchFees,
      totalDriverPay,
      totalGasExpenses,
      profitMargin,
      revenuePerMile,
      costPerMile
    };
  }, [filteredLoads]);

  // Calculate previous period for comparison (if date filter is applied)
  const previousPeriodMetrics = useMemo(() => {
    if (!dateFilter.startDate || !dateFilter.endDate) {
      return null;
    }

    const startDate = new Date(dateFilter.startDate);
    const endDate = new Date(dateFilter.endDate);
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate previous period dates
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays);

    const prevLoads = filterLoadsByDate(
      processedLoads,
      prevStartDate.toISOString().split('T')[0],
      prevEndDate.toISOString().split('T')[0]
    );

    if (prevLoads.length === 0) {
      return null;
    }

    const totalRevenue = prevLoads.reduce((sum, load) => sum + load.gross, 0);
    const totalNetProfit = prevLoads.reduce((sum, load) => sum + load.netProfit, 0);
    const totalDispatchFees = prevLoads.reduce((sum, load) => sum + load.dispatchFee, 0);
    const totalDriverPay = prevLoads.reduce((sum, load) => sum + load.driverPay, 0);
    const totalGasExpenses = prevLoads.reduce((sum, load) => sum + load.gasAmount, 0);
    const totalMiles = prevLoads.reduce((sum, load) => sum + load.miles, 0);
    
    const profitMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
    const revenuePerMile = totalMiles > 0 ? totalRevenue / totalMiles : 0;
    const costPerMile = totalMiles > 0 ? (totalDriverPay + totalDispatchFees + totalGasExpenses) / totalMiles : 0;

    return {
      totalRevenue,
      totalNetProfit,
      totalDispatchFees,
      totalDriverPay,
      totalGasExpenses,
      profitMargin,
      revenuePerMile,
      costPerMile
    };
  }, [processedLoads, dateFilter.startDate, dateFilter.endDate]);

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number | null): { value: number; isPositive: boolean } | null => {
    if (previous === null || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      isPositive: change >= 0
    };
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const revenueChange = calculateChange(currentMetrics.totalRevenue, previousPeriodMetrics?.totalRevenue || null);
  const profitChange = calculateChange(currentMetrics.totalNetProfit, previousPeriodMetrics?.totalNetProfit || null);
  const marginChange = calculateChange(currentMetrics.profitMargin, previousPeriodMetrics?.profitMargin || null);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Financial Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard
          title="Total Revenue"
          value={formatCurrency(currentMetrics.totalRevenue)}
          subValue={revenueChange ? `${revenueChange.isPositive ? '+' : '-'}${revenueChange.value.toFixed(1)}% vs previous period` : undefined}
          icon={<DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          colorClass="bg-blue-100 dark:bg-blue-900/30"
        />
        <ReportCard
          title="Net Profit"
          value={formatCurrency(currentMetrics.totalNetProfit)}
          subValue={profitChange ? `${profitChange.isPositive ? '+' : '-'}${profitChange.value.toFixed(1)}% vs previous period` : undefined}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          colorClass="bg-emerald-100 dark:bg-emerald-900/30"
        />
        <ReportCard
          title="Profit Margin"
          value={`${currentMetrics.profitMargin.toFixed(1)}%`}
          subValue={marginChange ? `${marginChange.isPositive ? '+' : '-'}${marginChange.value.toFixed(1)}% vs previous period` : undefined}
          icon={<FileBarChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          colorClass="bg-purple-100 dark:bg-purple-900/30"
        />
        <ReportCard
          title="Revenue per Mile"
          value={formatCurrency(currentMetrics.revenuePerMile)}
          icon={<TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          colorClass="bg-indigo-100 dark:bg-indigo-900/30"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard
          title="Total Dispatch Fees"
          value={formatCurrency(currentMetrics.totalDispatchFees)}
          icon={<Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
        />
        <ReportCard
          title="Total Driver Pay"
          value={formatCurrency(currentMetrics.totalDriverPay)}
          icon={<DollarSign className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
        />
        <ReportCard
          title="Total Gas Expenses"
          value={formatCurrency(currentMetrics.totalGasExpenses)}
          icon={<Fuel className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
        />
        <ReportCard
          title="Cost per Mile"
          value={formatCurrency(currentMetrics.costPerMile)}
          icon={<TrendingDown className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
        />
      </div>
    </div>
  );
};

