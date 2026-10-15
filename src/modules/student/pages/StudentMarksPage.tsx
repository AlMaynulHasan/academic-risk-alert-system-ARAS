import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../core/AuthContext';
import {
  academicRecordService,
  MarksSummary,
  EnrollmentSummary,
} from '../../../shared/services/academicRecordService';
import { Assessment, Mark } from '../../../shared/types';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { Card, CardHeader } from '../../../shared/ui/Card';
import { StatCard } from '../../../shared/ui/StatCard';
import { Select } from '../../../shared/ui/Select';
import { DataTable, Column } from '../../../shared/ui/DataTable';
import { Skeleton } from '../../../shared/ui/Skeleton';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { GraduationCap, Award, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';

export const StudentMarksPage: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<EnrollmentSummary[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [marksSummary, setMarksSummary] = useState<MarksSummary | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    academicRecordService.getEnrollments(user.id, '2026-spring').then((enrs) => {
      setCourses(enrs);
      const targetCourse = selectedCourseId === 'all' ? undefined : selectedCourseId;
      academicRecordService
        .getMarks(user.id, targetCourse)
        .then((m) => setMarksSummary(m))
        .finally(() => setLoading(false));
    });
  }, [user?.id, selectedCourseId]);

  const courseMap = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => map.set(c.courseId, `${c.courseCode}: ${c.courseTitle}`));
    return map;
  }, [courses]);

  const items = marksSummary?.items || [];

  const tableColumns: Column<{ assessment: Assessment; mark: Mark | null }>[] = [
    {
      key: 'title',
      header: 'Assessment Title',
      sortable: true,
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
              {row.assessment.type}
            </span>
            <span className="font-semibold text-xs text-slate-900">{row.assessment.title}</span>
          </div>
          <span className="text-[11px] text-slate-500">
            {courseMap.get(row.assessment.courseId) || row.assessment.courseId.toUpperCase()}
          </span>
        </div>
      ),
    },
    {
      key: 'weightage',
      header: 'Weightage',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-slate-700 tabular-nums">
          {row.assessment.weightage}%
        </span>
      ),
    },
    {
      key: 'maxMarks',
      header: 'Max Score',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-slate-700 tabular-nums">
          {row.assessment.maxMarks}
        </span>
      ),
    },
    {
      key: 'obtainedMarks',
      header: 'Marks Obtained',
      align: 'right',
      render: (row) => {
        // Critical requirement: Missing marks stay null and display as "Not recorded", never 0
        if (!row.mark || row.mark.obtainedMarks === null || row.mark.obtainedMarks === undefined) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              Not recorded
            </span>
          );
        }

        const score = row.mark.obtainedMarks;
        const max = row.assessment.maxMarks;
        const pct = max > 0 ? Math.round(((score / max) * 100) * 10) / 10 : 0;

        return (
          <div className="text-right">
            <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
              {score} / {max}
            </span>
            <span className="block text-[10px] text-slate-500 tabular-nums font-mono">
              ({pct}%)
            </span>
          </div>
        );
      },
    },
    {
      key: 'feedback',
      header: 'Instructor Feedback & Notes',
      render: (row) => (
        <span className="text-xs text-slate-600 italic">
          {row.mark?.feedback || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Continuous Marks & Assessment Breakdown"
        description="Course-wise continuous evaluations, quizzes, midterms, and project grades with unrecorded evaluation markers."
        breadcrumbs={[{ label: 'Student', href: '/student/dashboard' }, { label: 'Marks' }]}
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Filter Course:</span>
            <Select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="text-xs py-1.5 h-8 font-medium max-w-48"
            >
              <option value="all">All Enrolled Courses</option>
              {courses.map((c) => (
                <option key={c.courseId} value={c.courseId}>
                  {c.courseCode} - {c.courseTitle}
                </option>
              ))}
            </Select>
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
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Evaluation Average"
              value={marksSummary?.percentage !== null && marksSummary?.percentage !== undefined ? `${marksSummary.percentage}%` : 'Not recorded'}
              subtext="Derived exclusively from graded assessments"
              icon={<Award size={20} className="text-blue-600" />}
            />
            <StatCard
              label="Total Scored Marks"
              value={marksSummary ? `${marksSummary.totalObtained} / ${marksSummary.totalMaxMarks}` : '0 / 0'}
              subtext="Across recorded assessments"
              icon={<GraduationCap size={20} className="text-blue-600" />}
            />
            <StatCard
              label="Missing Evaluations"
              value={marksSummary?.missingCount || 0}
              subtext="Unrecorded or unsubmitted marks"
              icon={<HelpCircle size={20} className={marksSummary?.missingCount ? 'text-amber-600' : 'text-slate-400'} />}
            />
          </div>

          {/* Assessment Table */}
          <Card>
            <CardHeader
              title="Continuous Assessment Records"
              subtitle="Evaluation results, weightages, and feedback recorded in Firestore marks collection"
            />

            {items.length === 0 ? (
              <EmptyState
                title="No Assessments Recorded"
                description="No assessment evaluations found for the selected course filter."
              />
            ) : (
              <DataTable
                columns={tableColumns}
                data={items}
                keyExtractor={(r) => r.assessment.id}
                emptyMessage="No evaluations found."
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
};
