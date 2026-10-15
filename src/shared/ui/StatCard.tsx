import React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    text: string;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  trend,
  className = '',
}) => {
  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-xl p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.07),0_2px_4px_-2px_rgba(15,23,42,0.05)] transition-all duration-200 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-slate-600">
            {icon}
          </div>
        )}
      </div>

      <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
        {value}
      </div>

      {(subtext || trend) && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500">
          {trend && (
            <span
              className={`font-semibold ${
                trend.direction === 'up'
                  ? 'text-emerald-700'
                  : trend.direction === 'down'
                  ? 'text-red-700'
                  : 'text-slate-600'
              }`}
            >
              {trend.text}
            </span>
          )}
          {subtext && <span className="leading-tight">{subtext}</span>}
        </div>
      )}
    </div>
  );
};
