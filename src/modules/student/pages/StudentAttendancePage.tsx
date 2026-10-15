import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../core/AuthContext';
import {
  academicRecordService,
  AttendanceSummary,
  EnrollmentSummary,
} from '../../../shared/services/academicRecordService';
import { AttendanceRecord, AttendanceStatus } from '../../../shared/types';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Card, CardHeader } from '../../../shared/ui/Card';
import { StatCard } from '../../../shared/ui/StatCard';
import { DataTable, Column } from '../../../shared/ui/DataTable';
import { Select } from '../../../shared/ui/Select';
import { Input } from '../../../shared/ui/Input';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { Skeleton } from '../../../shared/ui/Skeleton';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { PROVISIONAL_ATTENDANCE_THRESHOLD } from '../../../shared/constants';
import { formatDhakaDateOnly } from '../../../shared/utils/date';
import { CalendarCheck, AlertTriangle, Filter, CheckCircle2, XCircle, Clock } from 'lucide-react';

export const StudentAttendancePage: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<EnrollmentSummary[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);

  // Filters
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchDateQuery, setSearchDateQuery] = useState<string>('');

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    Promise.all([
      academicRecordService.getEnrollments(user.id, '2026-spring'),
      academicRecordService.getAttendance(user.id),
    ])
      .then(([enrs, att]) => {
        setCourses(enrs);
        setAttendanceSummary(att);
      })
      .catch((err) => console.error('Error fetching attendance data:', err))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const courseMap = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => map.set(c.courseId, `${c.courseCode}: ${c.courseTitle}`));
    return map;
  }, [courses]);

  // Compute breakdown per course
  const courseBreakdowns = useMemo(() => {
    if (!attendanceSummary || courses.length === 0) return [];

    return courses.map((c) => {
      const recordsForCourse = attendanceSummary.records.filter((r) => r.courseId === c.courseId);
      const total = recordsForCourse.length;
      let attended = 0;
      let absent = 0;
      let late = 0;

      recordsForCourse.forEach((r) => {
        if (r.status === 'present') attended += 1;
        else if (r.status === 'late') {
          attended += 0.5;
          late += 1;
        } else if (r.status === 'excused') attended += 1;
        else absent += 1;
      });

      const percentage = total > 0 ? Math.round(((attended / total) * 100) * 10) / 10 : 100;
      return {
        courseId: c.courseId,
        courseCode: c.courseCode,
        courseTitle: c.courseTitle,
        total,
        attended,
        absent,
        late,
        percentage,
        isLow: percentage < PROVISIONAL_ATTENDANCE_THRESHOLD,
      };
    });
  }, [attendanceSummary, courses]);

  // Filter records for table
  const filteredRecords = useMemo(() => {
    if (!attendanceSummary) return [];

    return attendanceSummary.records.filter((rec) => {
      // Course filter
      if (selectedCourseFilter !== 'all' && rec.courseId !== selectedCourseFilter) {
        return false;
      }
      // Status filter
      if (selectedStatusFilter !== 'all' && rec.status !== selectedStatusFilter) {
        return false;
      }
      // Date or notes text search
      if (searchDateQuery.trim()) {
        const q = searchDateQuery.toLowerCase().trim();
        const matchesDate = rec.date.includes(q);
        const matchesNotes = (rec.notes || '').toLowerCase().includes(q);
        const matchesCourse = (courseMap.get(rec.courseId) || '').toLowerCase().includes(q);
        if (!matchesDate && !matchesNotes && !matchesCourse) return false;
      }
      return true;
    });
  }, [attendanceSummary, selectedCourseFilter, selectedStatusFilter, searchDateQuery, courseMap]);

  const overallPercentage = attendanceSummary?.percentage ?? 100;
  const isOverallLow = overallPercentage < PROVISIONAL_ATTENDANCE_THRESHOLD;

  const tableColumns: Column<AttendanceRecord>[] = [
    {
      key: 'date',
      header: 'Session Date',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-medium text-slate-800">
          {row.date}
        </span>
      ),
    },
    {
      key: 'courseId',
      header: 'Course',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-xs text-slate-900">
          {courseMap.get(row.courseId) || row.courseId.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Attendance Status',
      sortable: true,
      render: (row) => {
        const variants: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'info'> = {
          present: 'success',
          absent: 'danger',
          late: 'warning',
          excused: 'info',
        };
        return <StatusBadge status={row.status} variant={variants[row.status]} />;
      },
    },
    {
      key: 'notes',
      header: 'Class Session Remarks',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.notes || 'Standard lecture session'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Tracking & History"
        description="Daily attendance logs, course-wise percentages, and absence warning thresholds in Asia/Dhaka local calendar."
        breadcrumbs={[{ label: 'Student', href: '/student/dashboard' }, { label: 'Attendance' }]}
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Policy Threshold:</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700">
              ≥{PROVISIONAL_ATTENDANCE_THRESHOLD}% Minimum
            </span>
          </div>
        }
      />

      {/* Low Attendance Warning Banner */}
      {isOverallLow && (
        <div className="p-4 bg-amber-50/90 border border-amber-300/80 rounded-xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Academic Attendance Warning Flagged
            </h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Your overall attendance is at <strong className="tabular-nums font-bold">{overallPercentage}%</strong>, falling below the mandatory minimum of <strong className="tabular-nums font-bold">{PROVISIONAL_ATTENDANCE_THRESHOLD}%</strong>. Consult your assigned faculty advisor to prevent examination disbarment.
            </p>
          </div>
        </div>
      )}

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
          {/* Course-Wise Attendance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courseBreakdowns.map((cb) => (
              <Card key={cb.courseId} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      {cb.courseCode}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border tabular-nums ${
                        cb.isLow
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {cb.percentage}%
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                    {cb.courseTitle}
                  </h4>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 text-center text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Classes</span>
                    <strong className="text-slate-800 tabular-nums">{cb.total}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Attended</span>
                    <strong className="text-emerald-700 tabular-nums">{cb.attended}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Absent</span>
                    <strong className="text-red-700 tabular-nums">{cb.absent}</strong>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Full Attendance Logs Table with Active Filters */}
          <Card>
            <CardHeader
              title="Session Attendance Records"
              subtitle="Date-by-date attendance log recorded in Asia/Dhaka local calendar"
            />

            {/* Filter Bar */}
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 uppercase mb-1 block">
                  Filter Course
                </label>
                <Select
                  value={selectedCourseFilter}
                  onChange={(e) => setSelectedCourseFilter(e.target.value)}
                  className="text-xs py-1.5 h-8"
                >
                  <option value="all">All Enrolled Courses</option>
                  {courses.map((c) => (
                    <option key={c.courseId} value={c.courseId}>
                      {c.courseCode} - {c.courseTitle}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 uppercase mb-1 block">
                  Filter Status
                </label>
                <Select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="text-xs py-1.5 h-8"
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present Only</option>
                  <option value="absent">Absent Only</option>
                  <option value="late">Late Only</option>
                  <option value="excused">Excused Only</option>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 uppercase mb-1 block">
                  Search Date / Remarks
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 2026-03 or lecture notes..."
                  value={searchDateQuery}
                  onChange={(e) => setSearchDateQuery(e.target.value)}
                  className="text-xs py-1.5 h-8"
                />
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <EmptyState
                title="No Attendance Records Found"
                description="No session logs match your selected filter criteria."
                actionText="Reset Filters"
                onAction={() => {
                  setSelectedCourseFilter('all');
                  setSelectedStatusFilter('all');
                  setSearchDateQuery('');
                }}
              />
            ) : (
              <DataTable
                columns={tableColumns}
                data={filteredRecords}
                keyExtractor={(r) => r.id}
                emptyMessage="No attendance sessions found."
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
};
