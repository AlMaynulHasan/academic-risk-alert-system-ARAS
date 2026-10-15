import { AttendanceRecord, Mark, Assessment } from '../types';

export interface MarksTrendPoint {
  assessmentId: string;
  title: string;
  type: string;
  dueDate: string;
  maxMarks: number;
  obtainedMarks: number | null; // null if unrecorded
  percentage: number | null; // null if missing
  isRecorded: boolean;
}

export interface AttendanceTrendPoint {
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'late' | 'excused';
  cumulativeTotal: number;
  cumulativeAttended: number;
  cumulativeRate: number; // 0 - 100 percentage
}

export interface CoursePerformanceSummary {
  courseId: string;
  averageMarksPercentage: number | null; // null if no recorded marks
  totalRecordedAssessments: number;
  totalMissingAssessments: number;
  trend: MarksTrendPoint[];
}

/**
 * Pure function: Computes marks trend and performance statistics for a given course.
 * Missing marks (null) are strictly preserved as null and excluded from average calculations,
 * never coerced to 0.
 */
export function computeCourseMarksTrend(
  marks: Mark[],
  assessments: Assessment[]
): CoursePerformanceSummary {
  if (!assessments || assessments.length === 0) {
    return {
      courseId: '',
      averageMarksPercentage: null,
      totalRecordedAssessments: 0,
      totalMissingAssessments: 0,
      trend: [],
    };
  }

  // Create lookup for marks by assessmentId
  const marksMap = new Map<string, Mark>();
  marks.forEach((m) => {
    marksMap.set(m.assessmentId, m);
  });

  // Sort assessments chronologically by dueDate
  const sortedAssessments = [...assessments].sort((a, b) => {
    const timeA = new Date(a.dueDate).getTime();
    const timeB = new Date(b.dueDate).getTime();
    return timeA - timeB;
  });

  let totalPercentageSum = 0;
  let recordedCount = 0;
  let missingCount = 0;

  const trend: MarksTrendPoint[] = sortedAssessments.map((asmt) => {
    const markEntry = marksMap.get(asmt.id);
    const obtained = markEntry ? markEntry.obtainedMarks : null;

    let pct: number | null = null;
    let isRecorded = false;

    if (obtained !== null && obtained !== undefined) {
      isRecorded = true;
      recordedCount++;
      if (asmt.maxMarks > 0) {
        pct = Math.round(((obtained / asmt.maxMarks) * 100) * 10) / 10;
        totalPercentageSum += pct;
      } else {
        pct = 0;
      }
    } else {
      missingCount++;
    }

    return {
      assessmentId: asmt.id,
      title: asmt.title,
      type: asmt.type,
      dueDate: asmt.dueDate,
      maxMarks: asmt.maxMarks,
      obtainedMarks: obtained,
      percentage: pct,
      isRecorded,
    };
  });

  const averageMarksPercentage =
    recordedCount > 0 ? Math.round((totalPercentageSum / recordedCount) * 10) / 10 : null;

  return {
    courseId: assessments[0]?.courseId || '',
    averageMarksPercentage,
    totalRecordedAssessments: recordedCount,
    totalMissingAssessments: missingCount,
    trend,
  };
}

/**
 * Pure function: Computes running cumulative attendance percentage over time.
 * Sorts by date in ascending order and produces cumulative attendance rates.
 */
export function computeAttendanceTrend(
  records: AttendanceRecord[]
): AttendanceTrendPoint[] {
  if (!records || records.length === 0) {
    return [];
  }

  // Sort ascending by date
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  let totalClasses = 0;
  let attendedClasses = 0;

  return sorted.map((rec) => {
    totalClasses += 1;
    // 'present', 'late', and 'excused' count towards attended presence (or present only depending on policy,
    // standard university policy: present = 1, late = 1 or 0.5, excused = excluded; here present/late/excused counts or present counts)
    // In ARAS: present counts as 1, late counts as 0.75, excused as 1, absent as 0:
    let attendanceWeight = 0;
    if (rec.status === 'present') attendanceWeight = 1;
    else if (rec.status === 'late') attendanceWeight = 0.5;
    else if (rec.status === 'excused') attendanceWeight = 1;
    else attendanceWeight = 0;

    attendedClasses += attendanceWeight;

    const rate = Math.round(((attendedClasses / totalClasses) * 100) * 10) / 10;

    return {
      date: rec.date,
      status: rec.status,
      cumulativeTotal: totalClasses,
      cumulativeAttended: attendedClasses,
      cumulativeRate: Math.min(100, Math.max(0, rate)),
    };
  });
}
