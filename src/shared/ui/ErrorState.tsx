import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 bg-red-50/50 border border-red-200 rounded-lg text-center ${className}`}
      role="alert"
    >
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-3">
        <AlertCircle size={20} />
      </div>

      <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-600 max-w-sm mb-4 leading-normal">{message}</p>

      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5 text-xs">
          <RefreshCw size={13} />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
};
