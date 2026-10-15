import React from 'react';
import { Layers, Construction } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  moduleOwner?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  moduleOwner,
  actionText,
  onAction,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-lg text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-4">
        {icon || (moduleOwner ? <Construction size={22} /> : <Layers size={22} />)}
      </div>

      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md leading-relaxed mb-4">{description}</p>

      {moduleOwner && (
        <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Module Owner:</span>
          <span>{moduleOwner}</span>
        </div>
      )}

      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
