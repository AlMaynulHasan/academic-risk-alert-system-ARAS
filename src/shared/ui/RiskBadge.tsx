import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';
import { RiskLevel } from '../types';

export interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md';
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md', className = '' }) => {
  const styles = {
    Low: {
      bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: ShieldCheck,
      text: 'Low Risk',
    },
    Medium: {
      bg: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: AlertTriangle,
      text: 'Medium Risk',
    },
    High: {
      bg: 'bg-red-100 text-red-800 border-red-300',
      icon: AlertOctagon,
      text: 'High Risk',
    },
  };

  const current = styles[level] || styles.Low;
  const Icon = current.icon;

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-xs font-semibold gap-1.5';
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${sizeClass} ${current.bg} ${className}`}
      role="status"
      aria-label={`Risk Level: ${current.text}`}
    >
      <Icon size={iconSize} className="shrink-0" aria-hidden="true" />
      <span>{current.text}</span>
    </span>
  );
};
