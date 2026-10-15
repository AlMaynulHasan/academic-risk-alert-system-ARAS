import React from 'react';

export interface StatusBadgeProps {
  status: string;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'neutral',
  className = '',
}) => {
  const variantStyles = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${variantStyles[variant]} ${className}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};
