import React, { useState, useEffect } from 'react';
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
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Skeleton } from '../../../shared/ui/Skeleton';
import { Button } from '../../../shared/ui/Button';
import { PROVISIONAL_ATTENDANCE_THRESHOLD, MODULE_OWNERSHIP } from '../../../shared/constants';
import { Notification, Deadline } from '../../../shared/types';
import {
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Clock,
  ArrowRight,
  AlertTriangle,
  Bell,
  CheckCircle2,
} from 'lucide-react';

export const StudentDashboardPage: React.FC = () => {
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [marksSummary, setMarksSummary] = useState<MarksSummary | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  // Integration states from Developer 2
  const [riskStatus, setRiskStatus] = useState<CurrentRiskStatus | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifError, setNotifError] = useState<string | null>(null);

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
        setRiskError(null);
      } else {
        setRiskStatus(null);
        setRiskError('No risk assessment recorded yet.');
      }

      // Notifications module result
      if (notifRes.status === 'fulfilled' && notifRes.value) {
        setNotifications(notifRes.value);
        setNotifError(null);
      } else {
        setNotifications([]);
        setNotifError(null);
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Risk Status:</span>
            {riskStatus ? (
              <RiskBadge level={riskStatus.riskLevel} />
            ) : (
              <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md font-medium">
                Pending Evaluation
              </span>
            )}
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
                  <div key={enr.enrollmentId} className="py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50/80 transition-colors flex items-center justify-between">
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

                    <div className="flex items-center gap-2">
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

        {/* Right Column: Early Risk Indicator & Notifications */}
        <div className="space-y-6">
          {/* Rule-Based Risk Panel */}
          <Card>
            <CardHeader
              title="Risk Engine Status"
              subtitle="Rule-based early warning metrics"
            />
            {riskStatus ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl shadow-2xs">
                  <span className="text-xs font-medium text-slate-700">Calculated Risk Level:</span>
                  <RiskBadge level={riskStatus.riskLevel} />
                </div>
                {riskStatus.reasons && riskStatus.reasons.length > 0 && (
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Rule Triggers:
                    </span>
                    <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                      {riskStatus.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
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
    </div>
  );
};
