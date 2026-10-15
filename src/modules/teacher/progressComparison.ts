/**
 * Pure Progress Comparison Engine
 * Computes before/after metric deltas for academic interventions.
 *
 * Invariant Rules:
 * 1. Missing marks are strictly null and NEVER coerced to 0 or treated as improvement.
 * 2. If either pre or post window lacks sufficient data, verdict is strictly 'Not enough data to compare'.
 * 3. Attendance and marks are partitioned chronologically by the intervention date.
 */

import {
  Intervention,
  AttendanceRecord,
  Mark,
  Assessment,
  StudentProgressComparison,
  ProgressWindowMetrics,
  RiskLevel,
} from '../../shared/types';
import { CurrentRiskStatus } from '../../shared/services/riskService';

export interface ProgressComparisonInput {
  intervention: Intervention;
  attendanceRecords: AttendanceRecord[];
  marks: Mark[];
  assessments: Assessment[];
  currentRisk?: CurrentRiskStatus | null;
}

export function computeWindowAttendance(records: AttendanceRecord[]): {
  total: number;
  attended: number;
  percentage: number | null;
} {
  const total = records.length;
  if (total === 0) {
    return { total: 0, attended: 0, percentage: null };
  }

  let attended = 0;
  for (const r of records) {
    if (r.status === 'present') attended += 1;
    else if (r.status === 'late') attended += 0.5;
    else if (r.status === 'excused') attended += 1;
  }

  const percentage = Math.round(((attended / total) * 100) * 10) / 10;
  return { total, attended, percentage };
}

export function computeWindowMarks(
  marks: Mark[],
  assessmentsMap: Map<string, Assessment>
): {
  count: number;
  average: number | null;
} {
  let obtainedTotal = 0;
  let maxTotal = 0;
  let validCount = 0;

  for (const m of marks) {
    // Unrecorded or missing marks are strictly skipped, never coerced to 0
    if (m.obtainedMarks === null || m.obtainedMarks === undefined || isNaN(m.obtainedMarks)) {
      continue;
    }

    const asmt = assessmentsMap.get(m.assessmentId);
    const max = asmt?.maxMarks || 100;

    obtainedTotal += m.obtainedMarks;
    maxTotal += max;
    validCount += 1;
  }

  if (validCount === 0 || maxTotal === 0) {
    return { count: 0, average: null };
  }

  const average = Math.round(((obtainedTotal / maxTotal) * 100) * 10) / 10;
  return { count: validCount, average };
}

export function calculateProgressComparison(
  input: ProgressComparisonInput
): StudentProgressComparison {
  const { intervention, attendanceRecords, marks, assessments, currentRisk } = input;

  // 1. Reference intervention date YYYY-MM-DD
  const rawDate = intervention.createdAt || intervention.targetDate || '';
  const interventionDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.slice(0, 10);

  // 2. Map assessments for quick maxMarks lookup
  const assessmentsMap = new Map<string, Assessment>();
  for (const a of assessments) {
    assessmentsMap.set(a.id, a);
  }

  // 3. Partition attendance records
  const preAttendance = attendanceRecords.filter((r) => r.date < interventionDate);
  const postAttendance = attendanceRecords.filter((r) => r.date >= interventionDate);

  // 4. Partition marks records
  const preMarks: Mark[] = [];
  const postMarks: Mark[] = [];
  for (const m of marks) {
    const markDate = (m.submittedAt || m.gradedAt || m.createdAt || '').slice(0, 10);
    if (!markDate || markDate < interventionDate) {
      preMarks.push(m);
    } else {
      postMarks.push(m);
    }
  }

  // 5. Compute metrics for both windows
  const preAtt = computeWindowAttendance(preAttendance);
  const postAtt = computeWindowAttendance(postAttendance);

  const preM = computeWindowMarks(preMarks, assessmentsMap);
  const postM = computeWindowMarks(postMarks, assessmentsMap);

  const preMetrics: ProgressWindowMetrics = {
    windowLabel: `Pre-Intervention (Before ${interventionDate || 'Intervention'})`,
    totalAttendance: preAtt.total,
    attendedAttendance: preAtt.attended,
    attendancePercentage: preAtt.percentage,
    marksCount: preM.count,
    marksAverage: preM.average,
  };

  const postMetrics: ProgressWindowMetrics = {
    windowLabel: `Post-Intervention (Since ${interventionDate || 'Intervention'})`,
    totalAttendance: postAtt.total,
    attendedAttendance: postAtt.attended,
    attendancePercentage: postAtt.percentage,
    marksCount: postM.count,
    marksAverage: postM.average,
  };

  // 6. Sufficient data requirement:
  // Requires at least 1 attendance record AND at least 1 graded evaluation in BOTH windows
  const hasSufficientAttendance = preAtt.total > 0 && postAtt.total > 0;
  const hasSufficientMarks = preM.count > 0 && postM.count > 0;
  const hasSufficientData = hasSufficientAttendance && hasSufficientMarks;

  let attendanceDelta: number | null = null;
  if (hasSufficientAttendance && preAtt.percentage !== null && postAtt.percentage !== null) {
    attendanceDelta = Math.round((postAtt.percentage - preAtt.percentage) * 10) / 10;
  }

  let marksDelta: number | null = null;
  if (hasSufficientMarks && preM.average !== null && postM.average !== null) {
    marksDelta = Math.round((postM.average - preM.average) * 10) / 10;
  }

  // 7. Determine risk levels
  let currentRiskLevel: RiskLevel | 'Insufficient data' = 'Low';
  if (currentRisk) {
    if (currentRisk.isSufficientData === false) {
      currentRiskLevel = 'Insufficient data';
    } else {
      currentRiskLevel = currentRisk.riskLevel;
    }
  }

  // Determine pre-intervention baseline risk (from historical data or default to Medium/High)
  let preInterventionRisk: RiskLevel | 'Insufficient data' = 'High';
  if (intervention.reason.toLowerCase().includes('medium')) {
    preInterventionRisk = 'Medium';
  } else if (intervention.reason.toLowerCase().includes('low')) {
    preInterventionRisk = 'Low';
  }

  // 8. Verdict determination
  if (!hasSufficientData) {
    let reasonDetail = '';
    if (!hasSufficientAttendance && !hasSufficientMarks) {
      reasonDetail = 'Both attendance and graded marks lack data in either the pre-intervention or post-intervention window.';
    } else if (!hasSufficientAttendance) {
      reasonDetail = `Attendance data is missing in ${preAtt.total === 0 ? 'pre-intervention' : 'post-intervention'} window.`;
    } else {
      reasonDetail = `Graded assessments are missing in ${preM.count === 0 ? 'pre-intervention' : 'post-intervention'} window. Missing marks are never counted as progress.`;
    }

    return {
      studentId: intervention.studentId,
      interventionId: intervention.id,
      preInterventionRisk,
      currentRisk: currentRiskLevel,
      attendanceDelta,
      marksDelta,
      hasSufficientData: false,
      message: `Not enough data to compare: ${reasonDetail}`,
      preMetrics,
      postMetrics,
      verdict: 'Not enough data to compare',
    };
  }

  // Both windows have data -> compute deterministic verdict
  let verdict: 'Improved' | 'Stable' | 'Declined' = 'Stable';
  const attImproved = (attendanceDelta || 0) > 0;
  const marksImproved = (marksDelta || 0) > 0;
  const attDeclined = (attendanceDelta || 0) < -3;
  const marksDeclined = (marksDelta || 0) < -3;

  if ((attImproved && (marksDelta || 0) >= 0) || (marksImproved && (attendanceDelta || 0) >= 0)) {
    verdict = 'Improved';
  } else if (attDeclined || marksDeclined) {
    verdict = 'Declined';
  } else {
    verdict = 'Stable';
  }

  return {
    studentId: intervention.studentId,
    interventionId: intervention.id,
    preInterventionRisk,
    currentRisk: currentRiskLevel,
    attendanceDelta,
    marksDelta,
    hasSufficientData: true,
    message: `Comparison successfully computed across ${preAtt.total + postAtt.total} attendance records and ${preM.count + postM.count} graded evaluations.`,
    preMetrics,
    postMetrics,
    verdict,
  };
}
