import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, TrendingUp, AlertTriangle, CheckCircle2, Award } from 'lucide-react';

export interface CourseScoreData {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  percentage: number | null;
  gradedCount: number;
  totalAssessments: number;
}

interface CoursePerformanceBarChartProps {
  courses: CourseScoreData[];
  overallAverage: number | null;
}

export const CoursePerformanceBarChart: React.FC<CoursePerformanceBarChartProps> = ({
  courses,
  overallAverage,
}) => {
  const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null);

  // Compute highest scoring course
  const scoredCourses = courses.filter((c) => c.percentage !== null);
  const highestCourse =
    scoredCourses.length > 0
      ? [...scoredCourses].sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0]
      : null;

  return (
    <div className="space-y-4">
      {/* Top summary row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-600">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Overall Continuous Avg:</span>
            <span className="font-bold text-slate-900 font-mono">
              {overallAverage !== null ? `${overallAverage}%` : 'Not recorded'}
            </span>
          </div>

          {highestCourse && (
            <div className="hidden sm:flex items-center gap-1.5 text-slate-600 pl-3 border-l border-slate-200">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Top Course:</span>
              <span className="font-semibold text-slate-900">{highestCourse.courseCode}</span>
              <span className="text-emerald-600 font-bold font-mono">({highestCourse.percentage}%)</span>
            </div>
          )}
        </div>

        {/* Benchmark Indicators */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>≥70% Good</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            <span>50-69% Passing</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
            <span>&lt;50% Critical</span>
          </span>
        </div>
      </div>

      {/* Courses Comparison Bars */}
      {courses.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No course registrations found for the active semester.
        </div>
      ) : (
        <div className="space-y-3.5">
          {courses.map((c) => {
            const pct = c.percentage;
            const isHovered = hoveredCourseId === c.courseId;

            // Bar color logic
            let barColor = 'bg-slate-300';
            let textColor = 'text-slate-600';
            let badgeBg = 'bg-slate-100 text-slate-700';

            if (pct !== null) {
              if (pct >= 70) {
                barColor = 'bg-emerald-500';
                textColor = 'text-emerald-700';
                badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              } else if (pct >= 50) {
                barColor = 'bg-amber-500';
                textColor = 'text-amber-700';
                badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
              } else {
                barColor = 'bg-red-500';
                textColor = 'text-red-700';
                badgeBg = 'bg-red-50 text-red-700 border-red-200';
              }
            }

            return (
              <div
                key={c.courseId}
                onMouseEnter={() => setHoveredCourseId(c.courseId)}
                onMouseLeave={() => setHoveredCourseId(null)}
                className={`p-2.5 rounded-xl border transition-all ${
                  isHovered
                    ? 'bg-slate-50/90 border-blue-200 shadow-2xs'
                    : 'bg-white border-slate-200/70 hover:bg-slate-50/50'
                }`}
              >
                {/* Course Header */}
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-mono shrink-0">{c.courseCode}</span>
                    <span className="text-slate-600 truncate max-w-[100px] sm:max-w-xs">{c.courseTitle}</span>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">{c.credits} Cr</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">
                      {c.gradedCount}/{c.totalAssessments} graded
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${badgeBg}`}
                    >
                      {pct !== null ? `${pct}%` : 'Unrecorded'}
                    </span>
                  </div>
                </div>

                {/* Progress Bar with Benchmark Indicators */}
                <div className="relative w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  {/* Passing threshold marker line at 50% */}
                  <div
                    className="absolute top-0 bottom-0 w-[1.5px] bg-amber-400/80 z-10"
                    style={{ left: '50%' }}
                    title="Passing Threshold (50%)"
                  />
                  {/* Distinction marker line at 75% */}
                  <div
                    className="absolute top-0 bottom-0 w-[1.5px] bg-emerald-400/80 z-10"
                    style={{ left: '75%' }}
                    title="Distinction Threshold (75%)"
                  />

                  {pct !== null ? (
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                    />
                  ) : (
                    <div className="h-full bg-slate-200/80 rounded-full" style={{ width: '100%' }} />
                  )}
                </div>

                {/* Scale markers */}
                <div className="flex justify-between text-[9px] text-slate-400 pt-1 font-mono">
                  <span>0%</span>
                  <span className="text-amber-600 font-medium pl-6">50% Pass</span>
                  <span className="text-emerald-600 font-medium pl-6">75% Target</span>
                  <span>100%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer navigation */}
      <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
        <span>Evaluations include continuous quizzes, assignments, lab vivas, and midterm tests.</span>
        <Link
          to="/student/marks"
          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800"
        >
          <span>Detailed Breakdown</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
