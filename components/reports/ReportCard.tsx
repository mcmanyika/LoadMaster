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
  colorClass = 'bg-slate-100'
}) => {
  return (
    <div className="bg-slate-800 dark:bg-slate-800 rounded-lg border border-slate-700 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-300 dark:text-slate-400">{title}</p>
        <div className={colorClass + ' dark:bg-slate-700 p-2 rounded-lg'}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-white dark:text-slate-100">{value}</p>
      {subValue && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subValue}</p>
      )}
    </div>
  );
};

