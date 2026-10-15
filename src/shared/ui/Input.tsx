import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', hasError = false, disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
          hasError
            ? 'border-red-500 focus-visible:ring-red-500/40'
            : 'border-slate-300 focus-visible:border-blue-600 focus-visible:ring-blue-600/40'
        } ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className = '', hasError = false, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
          hasError
            ? 'border-red-500 focus-visible:ring-red-500/40'
            : 'border-slate-300 focus-visible:border-blue-600 focus-visible:ring-blue-600/40'
        } ${className}`}
        {...props}
      />
    );
  }
);

TextArea.displayName = 'TextArea';

export { Select } from './Select';
