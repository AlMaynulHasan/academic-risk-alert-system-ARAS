import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../core/AuthContext';
import {
  academicRecordService,
  EnrollmentSummary,
  AttendanceSummary,
  MarksSummary,
} from '../../../shared/services/academicRecordService';
import { riskService, CurrentRiskStatus } from '../../../shared/services/riskService';
import { notificationService } from '../../../shared/services/alertService';
import { realtimeSyncManager } from '../../../shared/services/realtimeSync';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { StatCard } from '../../../shared/ui/StatCard';
import { RiskBadge } from '../../../shared/ui/RiskBadge';
import { Card, CardHeader } from '../../../shared/ui/Card';
import { ChartCard } from '../../../shared/ui/ChartCard';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Skeleton } from '../../../shared/ui/Skeleton';
import { Button } from '../../../shared/ui/Button';
import { PROVISIONAL_ATTENDANCE_THRESHOLD } from '../../../shared/constants';
import { Notification, Deadline } from '../../../shared/types';
import { AttendancePieChart } from '../components/AttendancePieChart';
import { CoursePerformanceBarChart, CourseScoreData } from '../components/CoursePerformanceBarChart';
import { AcademicHealthRadar } from '../components/AcademicHealthRadar';
import { ExportReportModal } from '../../../shared/ui/ExportReportModal';
import { AcademicReportData } from '../../../shared/services/exportReportService';
import {
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Clock,
  ArrowRight,
  AlertTriangle,
  Bell,
  CheckCircle2,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Download,
} from 'lucide-react';

export const StudentDashboardPage: React.FC = () => {
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [marksSummary, setMarksSummary] = useState<MarksSummary | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  // Integration states from Risk Engine & Alerts
  const [riskStatus, setRiskStatus] = useState<CurrentRiskStatus | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadStudentData = () => {
    if (!user?.id) return;
    setLoading(true);

    const studentId = user.id;

    Promise.allSettled([
      academicRecordService.getEnrollments(studentId),
      academicRecordService.getAttendance(studentId),
      academicRecordService.getMarks(studentId),
      academicRecordService.getDeadlines(studentId),
      riskService.getCurrentRisk(studentId),
      notificationService.listNotifications(studentId),
    ]).then(([enrRes, attRes, marksRes, ddlRes, riskRes, notifRes]) => {
      if (enrRes.status === 'fulfilled') setEnrollments(enrRes.value);
      if (attRes.status === 'fulfilled') setAttendance(attRes.value);
      if (marksRes.status === 'fulfilled') setMarksSummary(marksRes.value);
      if (ddlRes.status === 'fulfilled') setDeadlines(ddlRes.value);

      // Risk module result
      if (riskRes.status === 'fulfilled' && riskRes.value) {
        setRiskStatus(riskRes.value);
      } else {
        setRiskStatus(null);
      }

      // Notifications module result
      if (notifRes.status === 'fulfilled' && notifRes.value) {
        setNotifications(notifRes.value);
      } else {
        setNotifications([]);
      }

      setLoading(false);
    });
  };

  useEffect(() => {
    loadStudentData();
    if (!user?.id) return;

    // Cross-client synchronization: watch for remote changes in attendance and marks
    const unwatch = realtimeSyncManager.watchStudent(user.id);
    const unsubscribeSync = realtimeSyncManager.subscribe((changedStudentId) => {
      if (changedStudentId === user.id) {
        loadStudentData();
      }
    });

    return () => {
      unwatch();
      unsubscribeSync();
    };
  }, [user?.id]);

  // Compute course-level marks scores for the performance comparison graph
  const courseScores: CourseScoreData[] = useMemo(() => {
    const items = marksSummary?.items || [];
    return enrollments.map((enr) => {
      const courseItems = items.filter((item) => item.assessment.courseId === enr.courseId);

      let obtainedTotal = 0;
      let maxTotal = 0;
      let gradedCount = 0;

      courseItems.forEach((item) => {
        if (item.mark && item.mark.obtainedMarks !== null && item.mark.obtainedMarks !== undefined) {
          obtainedTotal += item.mark.obtainedMarks;
          maxTotal += item.assessment.maxMarks;
          gradedCount++;
        }
      });

      const percentage =
        gradedCount > 0 && maxTotal > 0
          ? Math.round(((obtainedTotal / maxTotal) * 100) * 10) / 10
          : null;

      return {
        courseId: enr.courseId,
        courseCode: enr.courseCode,
        courseTitle: enr.courseTitle,
        credits: enr.credits,
        percentage,
        gradedCount,
        totalAssessments: courseItems.length,
      };
    });
  }, [enrollments, marksSummary]);

  // Compile full Academic Report Data for PDF/CSV documentation export
  const exportReportData: AcademicReportData = useMemo(() => {
    const totalClasses = attendance?.totalClasses || 0;
    const attended = attendance?.attendedClasses || 0;
    const records = attendance?.records || [];
    let absent = 0;
    let late = 0;
    let excused = 0;
    records.forEach((r) => {
      if (r.status === 'absent') absent++;
      else if (r.status === 'late') late++;
      else if (r.status === 'excused') excused++;
    });

    const totalCredits = enrollments.reduce((sum, c) => sum + c.credits, 0);

    const assessmentItems = marksSummary?.items || [];
    const assessments = assessmentItems.map((item) => {
      const course = enrollments.find((e) => e.courseId === item.assessment.courseId);
      const obtained = item.mark ? item.mark.obtainedMarks : null;
      const pct =
        obtained !== null && item.assessment.maxMarks > 0
          ? Math.round(((obtained / item.assessment.maxMarks) * 100) * 10) / 10
          : null;
      return {
        courseCode: course ? course.courseCode : undefined,
        title: item.assessment.title,
        type: item.assessment.type,
        dueDate: item.assessment.dueDate,
        maxMarks: item.assessment.maxMarks,
        obtainedMarks: obtained,
        percentage: pct,
      };
    });

    return {
      student: {
        id: user?.id || '',
        officialStudentId: profile?.officialStudentId || profile?.studentId || user?.id || 'STUDENT',
        displayName: profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Student',
        email: user?.email || '',
        department: profile?.department || 'Computer Science & Engineering',
        batch: profile?.batch,
        section: profile?.section,
        level: profile?.level,
      },
      semester: 'Spring 2026',
      generatedAt: new Date().toISOString(),
      kpis: {
        attendancePercentage: attendance?.percentage ?? 100,
        totalClasses,
        attendedClasses: attended,
        absentClasses: absent,
        lateClasses: late,
        excusedClasses: excused,
        marksAverage: marksSummary?.percentage ?? null,
        missingAssessmentsCount: riskStatus?.missingAssignmentsCount ?? marksSummary?.missingCount ?? 0,
        enrolledCoursesCount: enrollments.length,
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
      courses: courseScores.map((c) => ({
        courseCode: c.courseCode,
        courseTitle: c.courseTitle,
        credits: c.credits,
        percentage: c.percentage,
        gradedCount: c.gradedCount,
        totalAssessments: c.totalAssessments,
      })),
      assessments,
      attendanceRecords: records.map((att) => ({
        date: att.date,
        courseCode: enrollments.find((e) => e.courseId === att.courseId)?.courseCode,
        status: att.status,
      })),
    };
  }, [user, profile, enrollments, attendance, marksSummary, riskStatus, courseScores]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Student Academic Dashboard" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const attendanceRate = attendance ? attendance.percentage : 100;
  const isAttendanceLow = attendanceRate < PROVISIONAL_ATTENDANCE_THRESHOLD;
  const averageMarksText =
    marksSummary?.percentage !== null && marksSummary?.percentage !== undefined
      ? `${marksSummary.percentage}%`
      : 'Not recorded';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Academic Dashboard"
        description="Monitor active courses, attendance trends, marks distribution, and early academic alerts."
        breadcrumbs={[{ label: 'Student', href: '/student/dashboard' }, { label: 'Dashboard' }]}
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
              <span className="text-xs text-slate-500 font-medium">Risk Status:</span>
              {riskStatus ? (
                <RiskBadge level={riskStatus.riskLevel} />
              ) : (
                <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md font-medium">
                  Pending Evaluation
                </span>
              )}
            </div>
          </div>
        }
      />

      {/* Low Attendance Alert Banner if threshold breached */}
      {isAttendanceLow && (
        <div className="p-4 bg-amber-50/90 border border-amber-300/80 rounded-xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-amber-900">Attendance Warning</h4>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              Your overall attendance is currently at <strong className="tabular-nums">{attendanceRate}%</strong>, which is below the university threshold of <strong className="tabular-nums">{PROVISIONAL_ATTENDANCE_THRESHOLD}%</strong>. Continued absences may trigger an academic risk escalation.
            </p>
          </div>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Semester"
          value="Spring 2026"
          subtext={`${enrollments.length} Registered Courses`}
          icon={<BookOpen size={18} className="text-blue-600" />}
        />
        <StatCard
          label="Attendance Rate"
          value={`${attendanceRate}%`}
          subtext={`Threshold: ≥${PROVISIONAL_ATTENDANCE_THRESHOLD}% required`}
          icon={<CalendarCheck size={18} className={isAttendanceLow ? 'text-amber-600' : 'text-emerald-600'} />}
        />
        <StatCard
          label="Marks Average"
          value={averageMarksText}
          subtext={
            marksSummary?.missingCount
              ? `${marksSummary.missingCount} assessment(s) unrecorded`
              : 'Continuous evaluations'
          }
          icon={<GraduationCap size={18} className="text-blue-600" />}
        />
        <StatCard
          label="Upcoming Deadlines"
          value={deadlines.length}
          subtext="Pending deliverables"
          icon={<Clock size={18} className="text-blue-600" />}
        />
      </div>

      {/* VISUAL CHARTS SECTION: PIE CHART & BAR GRAPH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Attendance Distribution Donut / Pie Chart */}
        <ChartCard
          title="Attendance Distribution & Standing"
          subtitle="Proportional breakdown across Present, Late, Excused, and Absent class sessions"
          action={
            <Link to="/student/attendance">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                <Calendar size={13} />
                <span>Logs</span>
                <ArrowRight size={13} />
              </Button>
            </Link>
          }
        >
          <AttendancePieChart
            records={attendance?.records || []}
            overallRate={attendanceRate}
            threshold={PROVISIONAL_ATTENDANCE_THRESHOLD}
          />
        </ChartCard>

        {/* Chart 2: Course Performance Comparison Bar Graph */}
        <ChartCard
          title="Continuous Marks & Course Performance"
          subtitle="Course evaluation scores compared against the 50% passing and 75% honors benchmarks"
          action={
            <Link to="/student/performance">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                <BarChart3 size={13} />
                <span>Analytics</span>
                <ArrowRight size={13} />
              </Button>
            </Link>
          }
        >
          <CoursePerformanceBarChart
            courses={courseScores}
            overallAverage={marksSummary?.percentage ?? null}
          />
        </ChartCard>
      </div>

      {/* DETAILED CONTENT SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Courses & Academic Records */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Registered Courses (Spring 2026)"
              subtitle="Current term course enrollment and credit load"
              action={
                <Link to="/student/courses">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    <span>All Courses</span>
                    <ArrowRight size={13} />
                  </Button>
                </Link>
              }
            />

            {enrollments.length === 0 ? (
              <EmptyState
                title="No Course Enrollments Found"
                description="You are not currently enrolled in any courses for the selected semester."
                actionText="View Course Catalog"
                onAction={() => {}}
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {enrollments.map((enr) => (
                  <div key={enr.enrollmentId} className="py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-blue-700 bg-blue-50/90 px-2 py-0.5 rounded border border-blue-200">
                          {enr.courseCode}
                        </span>
                        <h4 className="text-xs font-semibold text-slate-900">{enr.courseTitle}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {enr.credits} Credits · Status: <span className="capitalize font-medium text-slate-700">{enr.status}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Link to={`/student/attendance`}>
                        <Button variant="outline" size="sm" className="text-[11px] h-7 px-2.5">
                          Attendance
                        </Button>
                      </Link>
                      <Link to={`/student/marks`}>
                        <Button variant="outline" size="sm" className="text-[11px] h-7 px-2.5">
                          Marks
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming Academic Deadlines */}
          <Card>
            <CardHeader
              title="Upcoming Academic Deadlines"
              subtitle="Continuous assessment quizzes, project submissions, and exams"
            />
            {deadlines.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">No upcoming deadlines recorded for this semester.</p>
            ) : (
              <div className="space-y-2.5">
                {deadlines.slice(0, 3).map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 bg-slate-200/80 text-slate-700 rounded">
                          {d.type}
                        </span>
                        <span className="text-xs font-semibold text-slate-900">{d.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{d.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-800 tabular-nums">
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

        {/* Right Column: Early Risk Health Meter & Notifications */}
        <div className="space-y-6">
          {/* Rule-Based Risk Engine & Health Radar */}
          <Card>
            <CardHeader
              title="Academic Health & Early Warning"
              subtitle="Multi-factor continuous risk evaluation"
            />
            {riskStatus ? (
              <AcademicHealthRadar
                riskStatus={riskStatus}
                attendanceRate={attendanceRate}
                marksAverage={marksSummary?.percentage ?? null}
                missingAssignmentsCount={riskStatus.missingAssignmentsCount ?? 0}
              />
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="font-medium text-slate-700">No Assessment Record</p>
                <p className="text-[11px] text-slate-500">Evaluations occur automatically as attendance and grades are submitted.</p>
              </div>
            )}
          </Card>

          {/* Notifications Panel */}
          <Card>
            <CardHeader
              title="Advising Notifications"
              subtitle="Alerts and messages from faculty advisors"
              action={
                <Link to="/student/notifications">
                  <Button variant="ghost" size="sm" className="text-xs p-1 h-7">
                    <Bell size={14} />
                  </Button>
                </Link>
              }
            />
            {notifications.length > 0 ? (
              <div className="space-y-2.5">
                {notifications.slice(0, 3).map((n) => (
                  <div key={n.id} className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs shadow-2xs hover:bg-slate-50 transition-colors">
                    <span className="font-semibold text-slate-900 block">{n.title}</span>
                    <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 space-y-1">
                <CheckCircle2 size={20} className="mx-auto text-emerald-600 mb-1" />
                <p className="font-medium text-slate-700">No Notifications</p>
                <p className="text-[11px] text-slate-500">You are all caught up on alerts and announcements.</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Export Academic Report Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        reportData={exportReportData}
      />
    </div>
  );
};
