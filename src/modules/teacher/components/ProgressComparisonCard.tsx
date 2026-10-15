import React from 'react';
import { Card, CardHeader, CardContent } from '../../../shared/ui/Card';
import { StudentProgressComparison } from '../../../shared/types';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  Clock,
  Calendar,
} from 'lucide-react';

interface ProgressComparisonCardProps {
  comparison: StudentProgressComparison;
  interventionDate: string;
}

export const ProgressComparisonCard: React.FC<ProgressComparisonCardProps> = ({
  comparison,
  interventionDate,
}) => {
  const { hasSufficientData, verdict, attendanceDelta, marksDelta, preMetrics, postMetrics, message } =
    comparison;

  const renderVerdictBadge = () => {
    switch (verdict) {
      case 'Improved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <TrendingUp size={14} className="text-emerald-700" />
            <span>Improved Post-Intervention</span>
          </span>
        );
      case 'Declined':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
            <TrendingDown size={14} className="text-red-700" />
            <span>Declined (Action Required)</span>
          </span>
        );
      case 'Stable':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Activity size={14} className="text-blue-700" />
            <span>Stable Performance</span>
          </span>
        );
      case 'Not enough data to compare':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <HelpCircle size={14} className="text-slate-500" />
            <span>Not Enough Data to Compare</span>
          </span>
        );
    }
  };

  return (
    <Card className="border border-slate-200">
      <CardHeader
        title="Intervention Progress Comparison (Before vs After)"
        subtitle={`Chronologically partitioned around intervention initiation (${interventionDate})`}
        action={renderVerdictBadge()}
      />
      <CardContent className="space-y-4">
        {/* Pre vs Post Window Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pre-Intervention Window */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 border-b border-slate-200 pb-1.5">
              <span className="flex items-center gap-1">
                <Clock size={13} className="text-slate-400" />
                <span>Pre-Intervention Window</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Before {interventionDate}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Attendance Rate</span>
                <span className="font-semibold text-slate-800 tabular-nums text-sm">
                  {preMetrics.attendancePercentage !== null
                    ? `${preMetrics.attendancePercentage}%`
                    : 'No sessions'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ({preMetrics.attendedAttendance}/{preMetrics.totalAttendance} classes)
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Marks Average</span>
                <span className="font-semibold text-slate-800 tabular-nums text-sm">
                  {preMetrics.marksAverage !== null
                    ? `${preMetrics.marksAverage}%`
                    : 'Not recorded'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ({preMetrics.marksCount} graded tasks)
                </span>
              </div>
            </div>
          </div>

          {/* Post-Intervention Window */}
          <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-900 border-b border-blue-200/60 pb-1.5">
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-blue-500" />
                <span>Post-Intervention Window</span>
              </span>
              <span className="text-[10px] text-blue-700 font-mono">Since {interventionDate}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Attendance Rate</span>
                <span className="font-semibold text-slate-800 tabular-nums text-sm">
                  {postMetrics.attendancePercentage !== null
                    ? `${postMetrics.attendancePercentage}%`
                    : 'No sessions'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ({postMetrics.attendedAttendance}/{postMetrics.totalAttendance} classes)
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Marks Average</span>
                <span className="font-semibold text-slate-800 tabular-nums text-sm">
                  {postMetrics.marksAverage !== null
                    ? `${postMetrics.marksAverage}%`
                    : 'Not recorded'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ({postMetrics.marksCount} graded tasks)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Delta Metrics Bar */}
        <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-500 block text-[11px]">Attendance Delta:</span>
              {attendanceDelta !== null ? (
                <span
                  className={`font-semibold text-sm tabular-nums ${
                    attendanceDelta > 0
                      ? 'text-emerald-700'
                      : attendanceDelta < 0
                      ? 'text-red-700'
                      : 'text-slate-700'
                  }`}
                >
                  {attendanceDelta > 0 ? `+${attendanceDelta}%` : `${attendanceDelta}%`}
                </span>
              ) : (
                <span className="text-slate-400 italic">Not enough data</span>
              )}
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Marks Delta:</span>
              {marksDelta !== null ? (
                <span
                  className={`font-semibold text-sm tabular-nums ${
                    marksDelta > 0
                      ? 'text-emerald-700'
                      : marksDelta < 0
                      ? 'text-red-700'
                      : 'text-slate-700'
                  }`}
                >
                  {marksDelta > 0 ? `+${marksDelta}%` : `${marksDelta}%`}
                </span>
              ) : (
                <span className="text-slate-400 italic">Not enough data</span>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-600 max-w-sm">
            {message}
          </div>
        </div>

        {!hasSufficientData && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-700" />
            <span>
              <strong>Integrity Guard:</strong> Both windows require at least one attendance record and one graded evaluation to compute a verdict. Missing marks are strictly excluded and never treated as improvement.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
