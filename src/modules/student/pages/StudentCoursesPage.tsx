import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../core/AuthContext';
import {
  academicRecordService,
  EnrollmentSummary,
} from '../../../shared/services/academicRecordService';
import { Semester } from '../../../shared/types';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Card, CardHeader } from '../../../shared/ui/Card';
import { Select } from '../../../shared/ui/Select';
import { Button } from '../../../shared/ui/Button';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { Skeleton } from '../../../shared/ui/Skeleton';
import { BookOpen, Calendar, GraduationCap, CheckCircle } from 'lucide-react';

export const StudentCoursesPage: React.FC = () => {
  const { user } = useAuth();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    academicRecordService.getSemesters().then((sems) => {
      setSemesters(sems);
      if (sems.length > 0 && !selectedSemesterId) {
        const current = sems.find((s) => s.isCurrent) || sems[0];
        setSelectedSemesterId(current.id);
      }
    });
  }, []);

  useEffect(() => {
    if (!user?.id || !selectedSemesterId) return;
    setLoading(true);

    academicRecordService
      .getEnrollments(user.id, selectedSemesterId)
      .then((data) => setEnrollments(data))
      .catch((err) => console.error('Error fetching enrollments:', err))
      .finally(() => setLoading(false));
  }, [user?.id, selectedSemesterId]);

  const activeSemester = semesters.find((s) => s.id === selectedSemesterId);
  const totalCredits = enrollments.reduce((sum, enr) => sum + enr.credits, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses & Academic Term Overview"
        description="Inspect course registrations, credit weights, and syllabus details across academic semesters."
        breadcrumbs={[{ label: 'Student', href: '/student/dashboard' }, { label: 'Courses' }]}
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Academic Term:</span>
            <Select
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              className="text-xs py-1.5 h-8 font-medium max-w-44"
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {/* Term Metadata Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Calendar size={15} className="text-blue-600" />
            <span className="font-semibold">{activeSemester?.name || 'Spring 2026'}</span>
          </div>
          {activeSemester?.startDate && activeSemester?.endDate && (
            <span className="text-slate-500">
              Duration: {activeSemester.startDate} to {activeSemester.endDate}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-600">
            Total Enrolled Courses: <strong className="text-slate-900 tabular-nums">{enrollments.length}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600">
            Credit Load: <strong className="text-blue-700 tabular-nums">{totalCredits} Credits</strong>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : enrollments.length === 0 ? (
        <EmptyState
          title="No Course Enrollments Found"
          description={`No registered courses found for ${activeSemester?.name || 'this semester'}. Switch semesters above to review past course records.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enrollments.map((course) => (
            <Card key={course.enrollmentId} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {course.courseCode}
                    </span>
                    <StatusBadge status={course.status} variant="success" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 tabular-nums">
                    {course.credits} Credits
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                  {course.courseTitle}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enrollment ID: <code className="text-[11px] font-mono text-slate-600">{course.enrollmentId}</code>
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <CheckCircle size={13} className="text-emerald-600" />
                  Active academic standing
                </span>

                <div className="flex items-center gap-2">
                  <Link to={`/student/attendance`}>
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2.5">
                      Attendance
                    </Button>
                  </Link>
                  <Link to={`/student/marks`}>
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2.5">
                      Evaluations
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
