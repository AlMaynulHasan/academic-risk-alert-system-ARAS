import { AttendanceRecord, Mark, Assessment, RiskLevel } from '../../../shared/types';

export interface StructuredReason {
  component: 'attendance' | 'marks' | 'completion' | 'trend';
  courseId?: string;
  courseCode?: string;
  observed: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface RiskConfigModel {
  version: string;
  attendanceThresholdMedium: number; // 75%
  attendanceThresholdHigh: number; // 60%
  marksThresholdMedium: number; // 50%
  marksThresholdHigh: number; // 40%
  missingSubmissionsLimit: number; // 2
  weights: {
    attendance: number; // 0.35
    marks: number; // 0.35
    completion: number; // 0.15
    trend: number; // 0.15
  };
  minComponentsRequired: number; // 2
}

export const DEFAULT_RISK_CONFIG: RiskConfigModel = {
  version: '1.0.0',
  attendanceThresholdMedium: 75,
  attendanceThresholdHigh: 60,
  marksThresholdMedium: 50,
  marksThresholdHigh: 40,
  missingSubmissionsLimit: 2,
  weights: {
    attendance: 0.35,
    marks: 0.35,
    completion: 0.15,
    trend: 0.15,
  },
  minComponentsRequired: 2,
};

export interface RiskCalculationInput {
  studentId: string;
  semesterId: string;
  attendanceRecords: AttendanceRecord[];
  marks: Mark[];
  assessments: Assessment[];
}

export interface RiskCalculationResult {
  studentId: string;
  semesterId: string;
  score: number | null;
  riskLevel: RiskLevel;
  isSufficientData: boolean;
  reasons: string[];
  structuredReasons: StructuredReason[];
  componentScores: {
    attendance: number | null;
    marks: number | null;
    completion: number | null;
    trend: number | null;
  };
  metrics: {
    attendancePercentage: number;
    marksAverage: number | null;
    missingAssignmentsCount: number;
  };
  computedAt: string;
  configVersion: string;
}

/**
 * Pure, deterministic risk calculator.
 * Zero database calls, zero side effects.
 */
export function calculateRisk(
  input: RiskCalculationInput,
  config: RiskConfigModel = DEFAULT_RISK_CONFIG
): RiskCalculationResult {
  const structuredReasons: StructuredReason[] = [];
  const textReasons: string[] = [];

  // ==========================================
  // 1. Attendance Risk Component
  // ==========================================
  let attendanceRisk: number | null = null;
  let overallAttendancePercentage = 100;
  const totalClasses = input.attendanceRecords.length;

  if (totalClasses > 0) {
    let weightedAttendance = 0;
    input.attendanceRecords.forEach((r) => {
      if (r.status === 'present') weightedAttendance += 1.0;
      else if (r.status === 'late') weightedAttendance += 0.5;
      else if (r.status === 'excused') weightedAttendance += 1.0;
    });

    overallAttendancePercentage =
      Math.round(((weightedAttendance / totalClasses) * 100) * 10) / 10;

    const A = overallAttendancePercentage;
    if (A >= 85) {
      attendanceRisk = 0;
    } else if (A >= config.attendanceThresholdMedium) {
      // 75% to 85%
      attendanceRisk = Math.round((35 * ((85 - A) / 10)) * 10) / 10;
    } else if (A >= config.attendanceThresholdHigh) {
      // 60% to 75%
      attendanceRisk = Math.round((35 + 30 * ((config.attendanceThresholdMedium - A) / 15)) * 10) / 10;
      const msg = `Overall attendance is ${A}%, below the ${config.attendanceThresholdMedium}% institutional threshold.`;
      textReasons.push(msg);
      structuredReasons.push({
        component: 'attendance',
        observed: A,
        threshold: config.attendanceThresholdMedium,
        severity: 'medium',
        message: msg,
      });
    } else {
      // Below 60%
      attendanceRisk = Math.round((65 + 35 * Math.min(1, (config.attendanceThresholdHigh - A) / config.attendanceThresholdHigh)) * 10) / 10;
      const msg = `Critical attendance deficit: ${A}% (mandatory minimum is ${config.attendanceThresholdHigh}%).`;
      textReasons.push(msg);
      structuredReasons.push({
        component: 'attendance',
        observed: A,
        threshold: config.attendanceThresholdHigh,
        severity: 'high',
        message: msg,
      });
    }
  }

  // ==========================================
  // 2. Marks Risk & 3. Missing Assignment Risk
  // ==========================================
  const marksMap = new Map<string, Mark>();
  input.marks.forEach((m) => marksMap.set(m.assessmentId, m));

  let totalObtained = 0;
  let totalMax = 0;
  let gradedAssessmentsCount = 0;
  let missingAssessmentsCount = 0;

  const gradedPoints: Array<{ date: number; scorePct: number }> = [];

  input.assessments.forEach((asmt) => {
    const mark = marksMap.get(asmt.id);
    if (mark && mark.obtainedMarks !== null && mark.obtainedMarks !== undefined) {
      // Genuine evaluated mark
      totalObtained += mark.obtainedMarks;
      totalMax += asmt.maxMarks;
      gradedAssessmentsCount++;

      const pct = asmt.maxMarks > 0 ? (mark.obtainedMarks / asmt.maxMarks) * 100 : 0;
      gradedPoints.push({
        date: new Date(asmt.dueDate).getTime(),
        scorePct: pct,
      });
    } else {
      // Missing or unrecorded mark
      missingAssessmentsCount++;
    }
  });

  // Marks Risk Component
  let marksRisk: number | null = null;
  let marksAverage: number | null = null;

  if (gradedAssessmentsCount > 0 && totalMax > 0) {
    marksAverage = Math.round(((totalObtained / totalMax) * 100) * 10) / 10;
    const M = marksAverage;

    if (M >= 70) {
      marksRisk = 0;
    } else if (M >= config.marksThresholdMedium) {
      // 50% to 70%
      marksRisk = Math.round((35 * ((70 - M) / 20)) * 10) / 10;
    } else if (M >= config.marksThresholdHigh) {
      // 40% to 50%
      marksRisk = Math.round((35 + 30 * ((config.marksThresholdMedium - M) / 10)) * 10) / 10;
      const msg = `Continuous evaluation average is ${M}%, below the ${config.marksThresholdMedium}% threshold.`;
      textReasons.push(msg);
      structuredReasons.push({
        component: 'marks',
        observed: M,
        threshold: config.marksThresholdMedium,
        severity: 'medium',
        message: msg,
      });
    } else {
      // Below 40%
      marksRisk = Math.round((65 + 35 * Math.min(1, (config.marksThresholdHigh - M) / config.marksThresholdHigh)) * 10) / 10;
      const msg = `Critical marks deficit: average score is ${M}% (passing benchmark is ${config.marksThresholdHigh}%).`;
      textReasons.push(msg);
      structuredReasons.push({
        component: 'marks',
        observed: M,
        threshold: config.marksThresholdHigh,
        severity: 'high',
        message: msg,
      });
    }
  }

  // Assignment Completion Risk Component
  let completionRisk: number | null = null;
  if (input.assessments.length > 0) {
    const U = missingAssessmentsCount;
    if (U === 0) {
      completionRisk = 0;
    } else if (U === 1) {
      completionRisk = 30;
      const msg = `1 continuous assessment has no recorded submission.`;
      textReasons.push(msg);
      structuredReasons.push({
        component: 'completion',
        observed: 1,
        threshold: 1,
        severity: 'low',
        message: msg,
      });
    } else if (U === 2) {
      completionRisk = 55;
      const msg = `2 continuous assessments have unrecorded submissions (reaching warning threshold).`;
      textReasons.push(msg);
      structuredReasons.push({
        component: 'completion',
        observed: 2,
        threshold: config.missingSubmissionsLimit,
        severity: 'medium',
        message: msg,
      });
    } else {
      // 3 or more
      completionRisk = Math.min(100, 65 + 15 * (U - 2));
      const msg = `Excessive missing evaluations: ${U} assessments are missing or unrecorded.`;
      textReasons.push(msg);
      structuredReasons.push({
        component: 'completion',
        observed: U,
        threshold: config.missingSubmissionsLimit,
        severity: 'high',
        message: msg,
      });
    }
  }

  // ==========================================
  // 4. Trend Risk Component
  // ==========================================
  let trendRisk: number | null = null;
  if (gradedPoints.length >= 2) {
    // Sort chronologically
    gradedPoints.sort((a, b) => a.date - b.date);
    const mid = Math.floor(gradedPoints.length / 2);
    const earlyScores = gradedPoints.slice(0, mid);
    const recentScores = gradedPoints.slice(mid);

    const earlyAvg =
      earlyScores.reduce((sum, p) => sum + p.scorePct, 0) / earlyScores.length;
    const recentAvg =
      recentScores.reduce((sum, p) => sum + p.scorePct, 0) / recentScores.length;

    const delta = Math.round((earlyAvg - recentAvg) * 10) / 10; // Positive = worsening

    if (delta <= 0) {
      trendRisk = 0;
    } else if (delta <= 15) {
      trendRisk = Math.round((35 * (delta / 15)) * 10) / 10;
    } else if (delta <= 30) {
      trendRisk = Math.round((35 + 30 * ((delta - 15) / 15)) * 10) / 10;
      const msg = `Downwards performance trend: recent assessment scores have fallen by ${delta}%.`;
      textReasons.push(msg);
      structuredReasons.push({
        component: 'trend',
        observed: delta,
        threshold: 15,
        severity: 'medium',
        message: msg,
      });
    } else {
      trendRisk = Math.round((65 + 35 * Math.min(1, (delta - 30) / 30)) * 10) / 10;
      const msg = `Severe downward performance trajectory: score decline of ${delta}%.`;
      textReasons.push(msg);
      structuredReasons.push({
        component: 'trend',
        observed: delta,
        threshold: 30,
        severity: 'high',
        message: msg,
      });
    }
  }

  // ==========================================
  // 5. Weight Renormalization & Scoring
  // ==========================================
  const activeComponents: Array<{ score: number; weight: number }> = [];

  if (attendanceRisk !== null) {
    activeComponents.push({ score: attendanceRisk, weight: config.weights.attendance });
  }
  if (marksRisk !== null) {
    activeComponents.push({ score: marksRisk, weight: config.weights.marks });
  }
  if (completionRisk !== null) {
    activeComponents.push({ score: completionRisk, weight: config.weights.completion });
  }
  if (trendRisk !== null) {
    activeComponents.push({ score: trendRisk, weight: config.weights.trend });
  }

  // Check minimum components requirement
  if (activeComponents.length < config.minComponentsRequired) {
    return {
      studentId: input.studentId,
      semesterId: input.semesterId,
      score: null,
      riskLevel: 'Low',
      isSufficientData: false,
      reasons: ['Insufficient historical data to determine academic risk.'],
      structuredReasons: [],
      componentScores: {
        attendance: attendanceRisk,
        marks: marksRisk,
        completion: completionRisk,
        trend: trendRisk,
      },
      metrics: {
        attendancePercentage: overallAttendancePercentage,
        marksAverage,
        missingAssignmentsCount: missingAssessmentsCount,
      },
      computedAt: new Date().toISOString(),
      configVersion: config.version,
    };
  }

  // Dynamic weight renormalization over active components
  const sumWeights = activeComponents.reduce((acc, c) => acc + c.weight, 0);
  let compositeScore = 0;
  activeComponents.forEach((c) => {
    const normalizedWeight = c.weight / sumWeights;
    compositeScore += normalizedWeight * c.score;
  });

  compositeScore = Math.round(compositeScore * 10) / 10;

  // Threshold categorization
  let riskLevel: RiskLevel = 'Low';
  if (compositeScore >= 65.0) {
    riskLevel = 'High';
  } else if (compositeScore >= 35.0) {
    riskLevel = 'Medium';
  } else {
    riskLevel = 'Low';
  }

  if (textReasons.length === 0) {
    textReasons.push('Academic attendance and continuous performance meet satisfactory benchmarks.');
  }

  return {
    studentId: input.studentId,
    semesterId: input.semesterId,
    score: compositeScore,
    riskLevel,
    isSufficientData: true,
    reasons: textReasons,
    structuredReasons,
    componentScores: {
      attendance: attendanceRisk,
      marks: marksRisk,
      completion: completionRisk,
      trend: trendRisk,
    },
    metrics: {
      attendancePercentage: overallAttendancePercentage,
      marksAverage,
      missingAssignmentsCount: missingAssessmentsCount,
    },
    computedAt: new Date().toISOString(),
    configVersion: config.version,
  };
}
