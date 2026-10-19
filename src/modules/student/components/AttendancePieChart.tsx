import React, { useState } from 'react';
import { AttendanceRecord } from '../../../shared/types';
import { PROVISIONAL_ATTENDANCE_THRESHOLD } from '../../../shared/constants';
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

interface AttendancePieChartProps {
  records: AttendanceRecord[];
  overallRate: number;
  threshold?: number;
}

interface SliceData {
  id: 'present' | 'late' | 'excused' | 'absent';
  label: string;
  count: number;
  percentage: number;
  color: string;
  hoverColor: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const AttendancePieChart: React.FC<AttendancePieChartProps> = ({
  records,
  overallRate,
  threshold = PROVISIONAL_ATTENDANCE_THRESHOLD,
}) => {
  const [activeSliceId, setActiveSliceId] = useState<string | null>(null);

  const total = records.length;

  const presentCount = records.filter((r) => r.status === 'present').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const excusedCount = records.filter((r) => r.status === 'excused').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;

  const slices: SliceData[] = [
    {
      id: 'present',
      label: 'Present',
      count: presentCount,
      percentage: total > 0 ? Math.round((presentCount / total) * 1000) / 10 : 0,
      color: '#10B981', // emerald-500
      hoverColor: '#059669', // emerald-600
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-700',
      borderClass: 'border-emerald-200',
    },
    {
      id: 'late',
      label: 'Late',
      count: lateCount,
      percentage: total > 0 ? Math.round((lateCount / total) * 1000) / 10 : 0,
      color: '#F59E0B', // amber-500
      hoverColor: '#D97706', // amber-600
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      borderClass: 'border-amber-200',
    },
    {
      id: 'excused',
      label: 'Excused',
      count: excusedCount,
      percentage: total > 0 ? Math.round((excusedCount / total) * 1000) / 10 : 0,
      color: '#3B82F6', // blue-500
      hoverColor: '#2563EB', // blue-600
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-700',
      borderClass: 'border-blue-200',
    },
    {
      id: 'absent',
      label: 'Absent',
      count: absentCount,
      percentage: total > 0 ? Math.round((absentCount / total) * 1000) / 10 : 0,
      color: '#EF4444', // red-500
      hoverColor: '#DC2626', // red-600
      bgClass: 'bg-red-50',
      textClass: 'text-red-700',
      borderClass: 'border-red-200',
    },
  ];

  // SVG Donut geometry
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke-dasharray and stroke-dashoffset for each slice
  let accumulatedPercent = 0;
  const renderedSlices = slices.map((slice) => {
    const fraction = total > 0 ? slice.count / total : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += fraction;

    return {
      ...slice,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeSlice = activeSliceId ? slices.find((s) => s.id === activeSliceId) : null;

  // Standing indicator based on overall attendance percentage
  const getStandingInfo = () => {
    if (total === 0) {
      return {
        label: 'No Sessions',
        badge: 'Pending',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
        icon: <HelpCircle className="w-3.5 h-3.5 text-slate-500" />,
      };
    }
    if (overallRate >= threshold) {
      return {
        label: 'Compliant',
        badge: 'In Good Standing',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      };
    }
    if (overallRate >= 60) {
      return {
        label: 'Warning',
        badge: 'Attendance Risk',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
      };
    }
    return {
      label: 'Critical',
      badge: 'Barred Risk',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      icon: <AlertOctagon className="w-3.5 h-3.5 text-red-600" />,
    };
  };

  const standing = getStandingInfo();

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* SVG Donut Chart */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 drop-shadow-xs"
          >
            {/* Background track circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />

            {total > 0 ? (
              renderedSlices.map((slice) => {
                if (slice.count === 0) return null;
                const isHovered = activeSliceId === slice.id;
                return (
                  <circle
                    key={slice.id}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={isHovered ? slice.hoverColor : slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setActiveSliceId(slice.id)}
                    onMouseLeave={() => setActiveSliceId(null)}
                  />
                );
              })
            ) : (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#E2E8F0"
                strokeWidth={strokeWidth}
                strokeDasharray="6 6"
              />
            )}
          </svg>

          {/* Central Label inside the Donut hole */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
            {activeSlice ? (
              <div className="animate-in fade-in zoom-in-95 duration-150">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  {activeSlice.label}
                </span>
                <span className="text-xl font-bold text-slate-900 font-mono block">
                  {activeSlice.count}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {activeSlice.percentage}% of total
                </span>
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block">
                  Cumulative
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight font-mono block">
                  {total > 0 ? `${overallRate}%` : 'N/A'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Req: ≥{threshold}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Legend & Distribution Details */}
        <div className="flex-1 w-full space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-700">Category Breakdown</span>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${standing.badgeClass}`}>
              {standing.icon}
              <span>{standing.badge}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {slices.map((slice) => {
              const isActive = activeSliceId === slice.id;
              return (
                <div
                  key={slice.id}
                  onMouseEnter={() => setActiveSliceId(slice.id)}
                  onMouseLeave={() => setActiveSliceId(null)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? `${slice.bgClass} ${slice.borderClass} ring-2 ring-blue-500/20 shadow-2xs`
                      : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="text-xs font-medium text-slate-700">{slice.label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {slice.count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>Proportion</span>
                    <span className="font-medium font-mono">{slice.percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Total Recorded Sessions: <strong className="text-slate-800">{total}</strong></span>
            <span>Policy: Present (100%), Late (50%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
