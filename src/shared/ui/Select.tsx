import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', hasError = false, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
          hasError
            ? 'border-red-500 focus-visible:ring-red-500/40'
            : 'border-slate-300 focus-visible:border-blue-600 focus-visible:ring-blue-600/40'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';
