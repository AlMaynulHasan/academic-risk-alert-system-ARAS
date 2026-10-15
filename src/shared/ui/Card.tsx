import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.07),0_2px_4px_-2px_rgba(15,23,42,0.05)] transition-all duration-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; className?: string }> = ({
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <div className={`flex items-start justify-between gap-4 pb-3.5 border-b border-slate-100 mb-4 ${className}`}>
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-1 leading-normal">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={className}>{children}</div>;
};
