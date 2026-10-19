import React from 'react';
import { CurrentRiskStatus } from '../../../shared/services/riskService';
import { RiskBadge } from '../../../shared/ui/RiskBadge';
import { CheckCircle2, AlertTriangle, ShieldCheck, Flame, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface AcademicHealthRadarProps {
  riskStatus: CurrentRiskStatus | null;
  attendanceRate: number;
  marksAverage: number | null;
  missingAssignmentsCount: number;
}

export const AcademicHealthRadar: React.FC<AcademicHealthRadarProps> = ({
  riskStatus,
  attendanceRate,
  marksAverage,
  missingAssignmentsCount,
}) => {
  const riskLevel = riskStatus?.riskLevel || 'Low';
  const compositeScore = riskStatus?.score ?? 0;

  // Compute 4 health scores (0-100%, where 100% is best health / lowest risk)
  // 1. Attendance health: 85%+ = 100%, 75% = 70%, 60% = 40%, <60% = 15%
  const attendanceHealth = Math.min(100, Math.max(0, Math.round((attendanceRate / 85) * 100)));

  // 2. Marks health: 70%+ = 100%, 50% = 65%, 40% = 35%
  const marksHealth =
    marksAverage !== null
      ? Math.min(100, Math.max(0, Math.round((marksAverage / 70) * 100)))
      : null;

  // 3. Assignment completion health: 0 missing = 100%, 1 = 70%, 2 = 45%, >=3 = 20%
  const completionHealth =
    missingAssignmentsCount === 0
      ? 100
      : missingAssignmentsCount === 1
      ? 70
      : missingAssignmentsCount === 2
      ? 45
      : 20;

  // 4. Trend score
  const trendComponentRisk = riskStatus?.componentScores?.trend ?? null;
  const isDeclining = trendComponentRisk !== null && trendComponentRisk > 30;
  const isSteady = trendComponentRisk === null || trendComponentRisk === 0;

  const factors = [
    {
      label: 'Attendance Health',
      value: `${attendanceRate}%`,
      health: attendanceHealth,
      status: attendanceRate >= 75 ? 'Optimal' : attendanceRate >= 60 ? 'Warning' : 'Critical',
      color: attendanceRate >= 75 ? 'bg-emerald-500' : attendanceRate >= 60 ? 'bg-amber-500' : 'bg-red-500',
      benchmark: 'Req: ≥75%',
    },
    {
      label: 'Continuous Marks',
      value: marksAverage !== null ? `${marksAverage}%` : 'Pending',
      health: marksHealth ?? 80,
      status: marksAverage === null ? 'Evaluating' : marksAverage >= 50 ? 'Satisfactory' : 'Below Standard',
      color: marksAverage === null ? 'bg-slate-300' : marksAverage >= 50 ? 'bg-emerald-500' : 'bg-red-500',
      benchmark: 'Pass: ≥50%',
    },
    {
      label: 'Assignment Submissions',
      value: missingAssignmentsCount === 0 ? 'All Cleared' : `${missingAssignmentsCount} Unsubmitted`,
      health: completionHealth,
      status: missingAssignmentsCount === 0 ? '100% On Time' : missingAssignmentsCount <= 1 ? 'Minor Lag' : 'Critical Deficit',
      color: missingAssignmentsCount === 0 ? 'bg-emerald-500' : missingAssignmentsCount <= 1 ? 'bg-amber-500' : 'bg-red-500',
      benchmark: 'Target: 0 missed',
    },
    {
      label: 'Performance Trajectory',
      value: isDeclining ? 'Downward' : isSteady ? 'Consistent' : 'Fluctuating',
      health: isDeclining ? 40 : 90,
      status: isDeclining ? 'Declining' : 'Stable',
      color: isDeclining ? 'bg-amber-500' : 'bg-emerald-500',
      benchmark: 'Trend metric',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top summary header with status and composite meter */}
      <div className="flex items-center justify-between p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <div>
            <span className="text-xs font-semibold text-slate-800 block">Overall Early Warning Status</span>
            <span className="text-[11px] text-slate-500">
              Risk Index: <strong className="font-mono text-slate-700">{compositeScore}/100</strong>
            </span>
          </div>
        </div>

        <RiskBadge level={riskLevel} />
      </div>

      {/* 4 Factor Meters */}
      <div className="space-y-3">
        {factors.map((f, i) => (
          <div key={i} className="p-2.5 bg-slate-50/60 rounded-lg border border-slate-200/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{f.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">{f.benchmark}</span>
                <span className="font-bold text-slate-900 font-mono text-[11px]">{f.value}</span>
              </div>
            </div>

            {/* Health Bar */}
            <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${f.color}`}
                style={{ width: `${Math.min(100, Math.max(5, f.health))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Rule triggers if any */}
      {riskStatus?.reasons && riskStatus.reasons.length > 0 && (
        <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl text-xs space-y-1">
          <span className="font-semibold text-amber-900 block text-[11px]">Active Advisory Signals:</span>
          <ul className="space-y-0.5 list-disc list-inside text-amber-800 text-[11px]">
            {riskStatus.reasons.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
