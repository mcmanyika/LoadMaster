import React, { useMemo } from 'react';
import { CalculatedLoad } from '../../types';
import { ReportFilters } from '../../types/reports';
import { DriverReport, DispatcherReport } from '../../types/reports';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  groupLoadsByTimePeriod,
  groupByBroker
} from '../../services/reports/chartDataService';
import { filterLoadsByDate } from '../../services/reports/reportService';

interface PerformanceChartsProps {
  processedLoads: CalculatedLoad[];
  driverReports: DriverReport[];
  dispatcherReports: DispatcherReport[];
  dateFilter: ReportFilters;
}

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({
  processedLoads,
  driverReports,
  dispatcherReports,
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

  // Revenue & Profit Trend Data
  const trendData = useMemo(() => {
    return groupLoadsByTimePeriod(filteredLoads, dateFilter.startDate, dateFilter.endDate);
  }, [filteredLoads, dateFilter.startDate, dateFilter.endDate]);

  // Helper function to get first name
  const getFirstName = (fullName: string): string => {
    return fullName.split(' ')[0] || fullName;
  };

  // Top Performers Data - Use driverReports/dispatcherReports for proper names
  const topDrivers = useMemo(() => {
    // Use driverReports which already has proper driver names
    return driverReports
      .map(report => ({
        name: getFirstName(report.driverName),
        value: report.totalNetProfit || 0,
        loads: report.totalLoads
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [driverReports]);

  const topDispatchers = useMemo(() => {
    // Use dispatcherReports which already has proper dispatcher names
    return dispatcherReports
      .map(report => ({
        name: getFirstName(report.dispatcherName),
        value: report.totalFees,
        loads: report.totalLoads
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [dispatcherReports]);

  // Broker Data
  const brokerData = useMemo(() => {
    return groupByBroker(filteredLoads).slice(0, 6); // Latest 6 brokers
  }, [filteredLoads]);

  // Custom tooltip formatter
  const currencyFormatter = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (filteredLoads.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12">
        <p className="text-center text-slate-400 dark:text-slate-500">
          No data available for the selected date range
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Performance Charts</h2>
      
      {/* Revenue & Profit Trend */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Revenue & Profit Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis 
              dataKey="date" 
              className="text-slate-600 dark:text-slate-400"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis 
              className="text-slate-600 dark:text-slate-400"
              tick={{ fill: 'currentColor' }}
              tickFormatter={currencyFormatter}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--tw-bg-white)',
                border: '1px solid var(--tw-border-slate-200)',
                borderRadius: '0.5rem'
              }}
              formatter={(value: number) => currencyFormatter(value)}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              name="Revenue" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="profit" 
              name="Net Profit" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Drivers by Net Profit */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Top Drivers by Net Profit</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topDrivers} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis 
                type="number"
                className="text-slate-600 dark:text-slate-400"
                tick={{ fill: 'currentColor' }}
                tickFormatter={currencyFormatter}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                className="text-slate-600 dark:text-slate-400"
                tick={{ fill: 'currentColor' }}
                width={120}
                interval={0}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--tw-bg-white)',
                  border: '1px solid var(--tw-border-slate-200)',
                  borderRadius: '0.5rem'
                }}
                formatter={(value: number) => currencyFormatter(value)}
              />
              <Bar dataKey="value" fill="#3b82f6" name="Net Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Dispatchers by Fees */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Top Dispatchers by Fees</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topDispatchers} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis 
                type="number"
                className="text-slate-600 dark:text-slate-400"
                tick={{ fill: 'currentColor' }}
                tickFormatter={currencyFormatter}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                className="text-slate-600 dark:text-slate-400"
                tick={{ fill: 'currentColor' }}
                width={120}
                interval={0}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--tw-bg-white)',
                  border: '1px solid var(--tw-border-slate-200)',
                  borderRadius: '0.5rem'
                }}
                formatter={(value: number) => currencyFormatter(value)}
              />
              <Bar dataKey="value" fill="#8b5cf6" name="Dispatch Fees" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue by Broker */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Revenue by Broker</h3>
          <ResponsiveContainer width="100%" height={300}>
          <BarChart data={brokerData} margin={{ left: 10, right: 10, top: 10, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis 
              dataKey="name" 
              className="text-slate-600 dark:text-slate-400"
              tick={{ fill: 'currentColor', fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
            />
            <YAxis 
              className="text-slate-600 dark:text-slate-400"
              tick={{ fill: 'currentColor' }}
              tickFormatter={currencyFormatter}
              width={80}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--tw-bg-white)',
                border: '1px solid var(--tw-border-slate-200)',
                borderRadius: '0.5rem'
              }}
              formatter={(value: number) => currencyFormatter(value)}
            />
            <Bar dataKey="revenue" fill="#f59e0b" name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

