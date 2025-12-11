import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  colorClass: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, subValue, trend, icon, colorClass }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex items-start justify-between transition-all hover:shadow-md">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</h3>
        {subValue && (
          <div className="flex items-center mt-2">
            {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />}
            {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-rose-500 mr-1" />}
            <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {subValue}
            </span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg ${colorClass}`}>
        {icon}
      </div>
    </div>
  );
};