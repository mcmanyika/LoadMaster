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
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-start justify-between transition-all hover:shadow-md">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        {subValue && (
          <div className="flex items-center mt-2">
            {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />}
            {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-rose-500 mr-1" />}
            <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-500'}`}>
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