import React from 'react';

interface ReportCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  colorClass?: string;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  title,
  value,
  subValue,
  icon,
  colorClass = 'bg-slate-100 dark:bg-slate-700'
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-600 dark:text-slate-400">{title}</p>
        <div className={colorClass + ' p-2 rounded-lg'}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {subValue && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subValue}</p>
      )}
    </div>
  );
};

