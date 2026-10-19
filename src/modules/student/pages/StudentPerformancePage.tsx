import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../core/AuthContext';
import {
  academicRecordService,
  EnrollmentSummary,
} from '../../../shared/services/academicRecordService';
import { riskService, CurrentRiskStatus, RecommendationItem } from '../../../shared/services/riskService';
import { Assessment, Mark, AttendanceRecord, Deadline } from '../../../shared/types';
import {
  computeCourseMarksTrend,
  computeAttendanceTrend,
  CoursePerformanceSummary,
  AttendanceTrendPoint,
} from '../../../shared/utils/chartMath';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Card, CardHeader } from '../../../shared/ui/Card';
import { StatCard } from '../../../shared/ui/StatCard';
import { Select } from '../../../shared/ui/Select';
import { Button } from '../../../shared/ui/Button';
import { Skeleton } from '../../../shared/ui/Skeleton';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ExportReportModal } from '../../../shared/ui/ExportReportModal';
import { AcademicReportData } from '../../../shared/services/exportReportService';
import { PROVISIONAL_ATTENDANCE_THRESHOLD } from '../../../shared/constants';
import {
  TrendingUp,
  Calendar,
  AlertTriangle,
  Lightbulb,
  Clock,
  CheckCircle2,
  Download,
} from 'lucide-react';

export const StudentPerformancePage: React.FC = () => {
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<EnrollmentSummary[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const [allMarks, setAllMarks] = useState<Mark[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  // Integration states from Risk & Recommendations
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [riskStatus, setRiskStatus] = useState<CurrentRiskStatus | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    const studentId = user.id;

    Promise.allSettled([
      academicRecordService.getEnrollments(studentId, '2026-spring'),
      academicRecordService.getMarks(studentId),
      academicRecordService.getAttendance(studentId),
      academicRecordService.getDeadlines(studentId),
      riskService.getRecommendations(studentId),
      riskService.getCurrentRisk(studentId),
    ]).then(([enrsRes, marksRes, attRes, ddlRes, recRes, riskRes]) => {
      if (enrsRes.status === 'fulfilled') {
        const enrs = enrsRes.value;
        setCourses(enrs);
        if (enrs.length > 0 && !selectedCourseId) {
          setSelectedCourseId(enrs[0].courseId);
        }
      }

      if (marksRes.status === 'fulfilled') {
        const items = marksRes.value.items;
        const asmts: Assessment[] = items.map((i) => i.assessment);
        const mrks: Mark[] = items.filter((i) => i.mark !== null).map((i) => i.mark as Mark);
        setAllAssessments(asmts);
        setAllMarks(mrks);
      }

      if (attRes.status === 'fulfilled') {
        setAllAttendance(attRes.value.records);
      }

      if (ddlRes.status === 'fulfilled') {
        setDeadlines(ddlRes.value);
      }

      if (recRes.status === 'fulfilled' && recRes.value) {
        setRecommendations(recRes.value);
      } else {
        setRecommendations([]);
      }

      if (riskRes.status === 'fulfilled' && riskRes.value) {
        setRiskStatus(riskRes.value);
      } else {
        setRiskStatus(null);
      }

      setLoading(false);
    });
  }, [user?.id]);

  // Compute marks trend using unit-tested pure function
  const coursePerformance: CoursePerformanceSummary = useMemo(() => {
    if (!selectedCourseId) {
      return {
        courseId: '',
        averageMarksPercentage: null,
        totalRecordedAssessments: 0,
        totalMissingAssessments: 0,
        trend: [],
      };
    }

    const courseAssessments = allAssessments.filter((a) => a.courseId === selectedCourseId);
    const courseMarks = allMarks.filter((m) =>
      courseAssessments.some((a) => a.id === m.assessmentId)
    );

    return computeCourseMarksTrend(courseMarks, courseAssessments);
  }, [selectedCourseId, allAssessments, allMarks]);

  // Compute attendance trend using unit-tested pure function
  const attendanceTrend: AttendanceTrendPoint[] = useMemo(() => {
    const records = selectedCourseId
      ? allAttendance.filter((a) => a.courseId === selectedCourseId)
      : allAttendance;
    return computeAttendanceTrend(records);
  }, [selectedCourseId, allAttendance]);

  const activeCourse = courses.find((c) => c.courseId === selectedCourseId);

  // Compile full Academic Report Data for PDF and CSV documentation export
  const exportReportData: AcademicReportData = useMemo(() => {
    const totalClasses = allAttendance.length;
    let attended = 0;
    let late = 0;
    let excused = 0;
    let absent = 0;

    allAttendance.forEach((r) => {
      if (r.status === 'present') attended++;
      else if (r.status === 'late') late++;
      else if (r.status === 'excused') excused++;
      else if (r.status === 'absent') absent++;
    });

    const attendancePercentage =
      totalClasses > 0
        ? Math.round(((attended + late * 0.5 + excused) / totalClasses) * 1000) / 10
        : 100;

    // Course breakdown
    const courseData = courses.map((c) => {
      const cAssessments = allAssessments.filter((a) => a.courseId === c.courseId);
      const summary = computeCourseMarksTrend(
        allMarks.filter((m) => cAssessments.some((a) => a.id === m.assessmentId)),
        cAssessments
      );
      return {
        courseCode: c.courseCode,
        courseTitle: c.courseTitle,
        credits: c.credits,
        percentage: summary.averageMarksPercentage,
        gradedCount: summary.totalRecordedAssessments,
        totalAssessments: cAssessments.length,
      };
    });

    // Calculate overall marks average across courses
    const gradedCourses = courseData.filter((c) => c.percentage !== null);
    const overallMarksAverage =
      gradedCourses.length > 0
        ? Math.round(
            (gradedCourses.reduce((sum, c) => sum + (c.percentage || 0), 0) /
              gradedCourses.length) *
              10
          ) / 10
        : null;

    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);

    // Map assessments
    const assessmentData = allAssessments.map((a) => {
      const mark = allMarks.find((m) => m.assessmentId === a.id);
      const course = courses.find((c) => c.courseId === a.courseId);
      const obtained = mark ? mark.obtainedMarks : null;
      const pct =
        obtained !== null && a.maxMarks > 0
          ? Math.round(((obtained / a.maxMarks) * 100) * 10) / 10
          : null;

      return {
        courseCode: course ? course.courseCode : undefined,
        title: a.title,
        type: a.type,
        dueDate: a.dueDate,
        maxMarks: a.maxMarks,
        obtainedMarks: obtained,
        percentage: pct,
      };
    });

    return {
      student: {
        id: user?.id || '',
        officialStudentId: profile?.officialStudentId || user?.id || 'STUDENT',
        displayName: profile?.displayName || user?.email?.split('@')[0] || 'Student',
        email: user?.email || '',
        department: profile?.department || 'Computer Science & Engineering',
        batch: profile?.batch,
        section: profile?.section,
        level: profile?.level,
      },
      semester: 'Spring 2026',
      generatedAt: new Date().toISOString(),
      kpis: {
        attendancePercentage,
        totalClasses,
        attendedClasses: attended,
        absentClasses: absent,
        lateClasses: late,
        excusedClasses: excused,
        marksAverage: overallMarksAverage,
        missingAssessmentsCount: assessmentData.filter((a) => a.obtainedMarks === null).length,
        enrolledCoursesCount: courses.length,
        totalCredits,
      },
      riskStatus: riskStatus
        ? {
            level: riskStatus.riskLevel,
            score: riskStatus.score,
            reasons: riskStatus.reasons || [],
            isSufficientData: riskStatus.isSufficientData,
          }
        : null,
      courses: courseData,
      assessments: assessmentData,
      attendanceRecords: allAttendance.map((att) => ({
        date: att.date,
        courseCode: courses.find((c) => c.courseId === att.courseId)?.courseCode,
        status: att.status,
      })),
    };
  }, [user, profile, courses, allAssessments, allMarks, allAttendance, riskStatus]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Performance Analytics"
        description="Historical trend curves for course evaluations, cumulative attendance progression, and advising recovery recommendations."
        breadcrumbs={[{ label: 'Student', href: '/student/dashboard' }, { label: 'Performance' }]}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportModalOpen(true)}
              className="text-xs py-1.5 h-8 gap-1.5 font-medium border-slate-300 hover:border-slate-400 bg-white shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Export Report</span>
            </Button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Focus Course:</span>
              <Select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="text-xs py-1.5 h-8 font-medium max-w-48"
              >
                {courses.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    {c.courseCode} - {c.courseTitle}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {/* Performance Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Selected Course Average"
              value={
                coursePerformance.averageMarksPercentage !== null
                  ? `${coursePerformance.averageMarksPercentage}%`
                  : 'Not recorded'
              }
              subtext={`${coursePerformance.totalRecordedAssessments} graded, ${coursePerformance.totalMissingAssessments} unrecorded`}
              icon={<TrendingUp size={20} className="text-blue-600" />}
            />
            <StatCard
              label="Cumulative Attendance"
              value={
                attendanceTrend.length > 0
                  ? `${attendanceTrend[attendanceTrend.length - 1].cumulativeRate}%`
                  : '100%'
              }
              subtext={`Recorded across ${attendanceTrend.length} class sessions`}
              icon={<Calendar size={20} className="text-blue-600" />}
            />
            <StatCard
              label="Upcoming Deadlines"
              value={deadlines.length}
              subtext="Pending deliverables this term"
              icon={<Clock size={20} className="text-blue-600" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Course Marks Evaluation Trend */}
            <Card>
              <CardHeader
                title={`Marks Trend: ${activeCourse ? activeCourse.courseCode : 'Course'}`}
                subtitle="Scores computed as percentage of maximum evaluation marks"
              />

              {coursePerformance.trend.length === 0 ? (
                <EmptyState
                  title="No Evaluation Records"
                  description="No assessments recorded yet for this course."
                />
              ) : (
                <div className="space-y-4">
                  {/* Clean Progress Chart */}
                  <div className="space-y-3 pt-2">
                    {coursePerformance.trend.map((pt) => (
                      <div key={pt.assessmentId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            {pt.title} ({pt.type})
                          </span>
                          <span className="tabular-nums font-mono font-bold text-slate-700">
                            {pt.percentage !== null ? `${pt.percentage}% (${pt.obtainedMarks}/${pt.maxMarks})` : 'Not recorded'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                          {pt.percentage !== null ? (
                            <div
                              className={`h-full rounded-full transition-all ${
                                pt.percentage >= 70
                                  ? 'bg-blue-600'
                                  : pt.percentage >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, pt.percentage))}%` }}
                            />
                          ) : (
                            <div className="h-full bg-slate-200" style={{ width: '100%' }} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-100">
                    <span>* Values computed purely via pure unit-tested chart functions.</span>
                    <span className="font-medium text-slate-700">Passing Threshold: 50%</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Chart 2: Attendance Progression Line / Stepper */}
            <Card>
              <CardHeader
                title="Cumulative Attendance Trajectory"
                subtitle="Running attendance percentage computed chronologically"
              />

              {attendanceTrend.length === 0 ? (
                <EmptyState
                  title="No Session Attendance Logs"
                  description="No daily attendance logs found for this course selection."
                />
              ) : (
                <div className="space-y-4">
                  {/* Visual Progress Plot */}
                  <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-slate-100 overflow-x-auto">
                    {attendanceTrend.map((pt, idx) => {
                      const heightPct = Math.max(10, Math.min(100, pt.cumulativeRate));
                      const isLow = pt.cumulativeRate < PROVISIONAL_ATTENDANCE_THRESHOLD;

                      return (
                        <div key={idx} className="flex-1 min-w-[32px] flex flex-col items-center gap-1 group">
                          <div className="relative w-full flex items-end justify-center h-32 bg-slate-50 rounded-t">
                            <div
                              className={`w-full rounded-t transition-all ${
                                isLow ? 'bg-amber-400 group-hover:bg-amber-500' : 'bg-emerald-500 group-hover:bg-emerald-600'
                              }`}
                              style={{ height: `${heightPct}%` }}
                            />
                            {/* Hover tooltip */}
                            <div className="absolute -top-7 hidden group-hover:block bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded font-mono z-10 whitespace-nowrap shadow-xs">
                              {pt.cumulativeRate}% ({pt.status})
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono rotate-45 sm:rotate-0 mt-1">
                            {pt.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      <span>Compliant</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      <span>Below {PROVISIONAL_ATTENDANCE_THRESHOLD}% Policy</span>
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Developer 2 Recommendations Component */}
            <Card className="lg:col-span-2">
              <CardHeader
                title="Advisory Recommendations"
                subtitle="Rule-based prescriptive actions to remediate academic risks"
              />
              {recommendations.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 space-y-1">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-2" />
                  <p className="font-medium text-slate-700">No Action Required</p>
                  <p className="text-[11px] text-slate-500">Your performance is in good standing across all active metrics.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-lg border border-slate-200/90 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-start gap-3"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-slate-900">{rec.title}</h4>
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              rec.priority === 'high'
                                ? 'bg-red-100 text-red-700'
                                : rec.priority === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Upcoming Deadlines Widget */}
            <Card>
              <CardHeader
                title="Upcoming Deadlines"
                subtitle="Active term due dates"
              />
              {deadlines.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No pending deadlines recorded.</p>
              ) : (
                <div className="space-y-2">
                  {deadlines.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-md border border-slate-200 bg-white flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                            {d.type}
                          </span>
                          <span className="text-xs font-semibold text-slate-900">{d.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{d.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-semibold text-slate-800 tabular-nums">
                          {new Date(d.dueDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                        </span>
                        <p className="text-[10px] text-slate-400">Due date</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        reportData={exportReportData}
      />
    </div>
  );
};
